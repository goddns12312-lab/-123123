/**
 * src/utils/migrate.js
 * Supabase 테이블 생성 마이그레이션 스크립트
 *
 * Supabase의 supabase-js SDK는 DDL(CREATE TABLE 등)을 직접 실행할 수 없습니다.
 * 이 스크립트는 필요한 SQL을 콘솔에 출력하고,
 * Supabase SQL Editor에서 붙여넣어 실행하도록 안내합니다.
 *
 * 실행: node src/utils/migrate.js
 *      (또는 npm run migrate)
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const { testConnection } = require('../config/database')

const SQL = `
-- ================================================================
-- Supabase(PostgreSQL) 초기 스키마
-- Supabase Dashboard → SQL Editor → New Query → 아래 SQL 붙여넣기 후 Run
-- ================================================================

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

-- ③ RLS 비활성화 (백엔드에서 service_role key 사용)
ALTER TABLE public.users   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices DISABLE ROW LEVEL SECURITY;
`

async function runMigration () {
  console.log('🚀 Supabase 마이그레이션 가이드\n')
  console.log('━'.repeat(60))
  console.log('⚠️  Supabase는 SDK로 DDL을 직접 실행할 수 없습니다.')
  console.log('   아래 단계를 따라 테이블을 생성하세요:\n')
  console.log('  1️⃣  https://supabase.com/dashboard 접속')
  console.log('  2️⃣  프로젝트 선택 → 좌측 메뉴 "SQL Editor" 클릭')
  console.log('  3️⃣  "+ New Query" 클릭')
  console.log('  4️⃣  아래 SQL을 전체 복사 후 붙여넣기')
  console.log('  5️⃣  우측 상단 "▶ Run" 버튼 클릭\n')
  console.log('━'.repeat(60))
  console.log('\n📋 실행할 SQL:\n')
  console.log(SQL)
  console.log('━'.repeat(60))

  // 연결 테스트 (테이블이 이미 존재하는지 확인)
  console.log('\n🔍 현재 연결 상태 확인 중...')
  const connected = await testConnection()
  if (connected) {
    console.log('✅ Supabase 연결 성공!')
    console.log('   위 SQL을 아직 실행하지 않았다면, SQL Editor에서 실행하세요.')
  } else {
    console.log('❌ 연결 실패 — .env 파일의 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 확인하세요.')
  }

  process.exit(0)
}

runMigration()
