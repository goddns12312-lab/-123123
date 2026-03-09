import { Hono } from 'hono'
import type { Bindings } from '../types'

export const statsRoute = new Hono<{ Bindings: Bindings }>()

// GET /api/stats  - 대시보드 통계
statsRoute.get('/', async (c) => {
  try {
    const db = c.env.DB
    const [totalUsers, activeUsers, notices] = await Promise.all([
      db.prepare('SELECT COUNT(*) as cnt FROM users').first<{cnt:number}>(),
      db.prepare("SELECT COUNT(*) as cnt FROM users WHERE status='active'").first<{cnt:number}>(),
      db.prepare("SELECT COUNT(*) as cnt FROM notices WHERE is_active=1").first<{cnt:number}>(),
    ])

    // 오늘 신규 가입
    const today = new Date().toISOString().slice(0, 10)
    const newToday = await db.prepare(
      "SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = ?"
    ).bind(today).first<{cnt:number}>()

    return c.json({
      success: true,
      data: {
        total_users: totalUsers?.cnt ?? 0,
        active_users: activeUsers?.cnt ?? 0,
        new_today: newToday?.cnt ?? 0,
        active_notices: notices?.cnt ?? 0,
      }
    })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})

// POST /api/stats/init-db  - DB 테이블 초기화 (DDL 실행)
statsRoute.post('/init-db', async (c) => {
  try {
    const db = c.env.DB

    // users 테이블
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        balance INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // notices 테이블
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        type TEXT DEFAULT 'notice',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 인덱스
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_notices_type ON notices(type)').run()

    return c.json({ success: true, message: 'DB 테이블 초기화 완료' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})
