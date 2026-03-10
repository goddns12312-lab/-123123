/**
 * src/routes/stats.js
 * 대시보드 통계 API — Supabase(PostgreSQL) 버전
 *
 * GET  /api/stats          – 주요 지표
 * POST /api/stats/init-db  – Supabase SQL Editor 가이드 응답
 *                            (Supabase는 supabase-js로 DDL 실행 불가 →
 *                             SQL Editor 또는 마이그레이션 스크립트 안내)
 */

'use strict'

const express   = require('express')
const { supabase }              = require('../config/database')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware, adminMiddleware)

// ────────────────────────────────────────────────────────────────────────────
// GET /api/stats – 대시보드 통계
// ────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'

    // ── Supabase count 쿼리들을 병렬 실행 ──────────────────────────────────
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: suspendedUsers },
      { count: pendingUsers },
      { count: newToday },
      { count: totalNotices },
      { count: activeNotices },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      // PostgreSQL: created_at::date = today
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`).lt('created_at', `${today}T23:59:59`),
      supabase.from('notices').select('*', { count: 'exact', head: true }),
      supabase.from('notices').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])

    // ── 최근 7일 신규 가입 추이 ──────────────────────────────────────────────
    // Supabase에서 DATE_TRUNC 집계는 RPC(stored function) 또는 직접 필터 후 JS 집계
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: recentUsers } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true })

    // JS에서 날짜별 집계
    const signupMap = {}
    for (const u of (recentUsers || [])) {
      const date = u.created_at.slice(0, 10)
      signupMap[date] = (signupMap[date] || 0) + 1
    }
    const recentSignups = Object.entries(signupMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return res.json({
      success: true,
      data   : {
        users: {
          total    : totalUsers    ?? 0,
          active   : activeUsers   ?? 0,
          suspended: suspendedUsers ?? 0,
          pending  : pendingUsers  ?? 0,
          new_today: newToday      ?? 0,
        },
        notices: {
          total : totalNotices  ?? 0,
          active: activeNotices ?? 0,
        },
        recent_signups: recentSignups,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/stats/init-db
// Supabase는 supabase-js SDK로 DDL을 실행할 수 없습니다.
// 이 엔드포인트는 테이블 생성 SQL을 응답으로 반환하여
// Supabase SQL Editor에서 직접 실행하도록 안내합니다.
// ────────────────────────────────────────────────────────────────────────────
router.post('/init-db', (req, res) => {
  const usersSQL = `
-- ① users 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id            BIGSERIAL    PRIMARY KEY,
  username      VARCHAR(30)  UNIQUE NOT NULL,
  email         VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  phone         VARCHAR(20)  DEFAULT '',
  status        TEXT         DEFAULT 'pending'
                             CHECK (status IN ('active','suspended','pending')),
  balance       INTEGER      DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_status     ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- ② notices 테이블
CREATE TABLE IF NOT EXISTS public.notices (
  id         BIGSERIAL    PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         DEFAULT '',
  type       TEXT         DEFAULT 'notice'
                          CHECK (type IN ('notice','event')),
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notices_type      ON public.notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON public.notices(is_active);

-- ③ RLS(행 수준 보안) 비활성화 — 백엔드 service_role key 사용 시
ALTER TABLE public.users   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices DISABLE ROW LEVEL SECURITY;
`.trim()

  return res.json({
    success: true,
    message : '아래 SQL을 Supabase SQL Editor에서 실행하세요.',
    guide   : 'Supabase Dashboard → SQL Editor → New Query → 아래 SQL 붙여넣기 → Run',
    sql     : usersSQL,
  })
})

module.exports = router
