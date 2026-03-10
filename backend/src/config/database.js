/**
 * src/config/database.js
 * Supabase (PostgreSQL) 클라이언트 설정
 *
 * Supabase는 두 가지 접근 방식을 제공합니다:
 *  1. supabase-js (JavaScript SDK) — 이 파일에서 사용
 *     - 테이블 CRUD: supabase.from('table').select/insert/update/delete
 *     - RPC (함수 호출): supabase.rpc('fn_name')
 *
 *  무료 플랜 제한:
 *  - 스토리지 1GB, DB 0.5GB, 월 5만 API 요청
 *  - 7일 비활성 시 프로젝트 일시정지 (무료 계정)
 *    → Settings > General > "Pause project" 자동 해제 설정 참고
 */

'use strict'

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️  SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되지 않았습니다.')
}

/**
 * Supabase 클라이언트 (service_role key 사용 — RLS 우회)
 * 백엔드 서버에서만 사용. 클라이언트(브라우저)에 노출 금지!
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession  : false,
  },
})

/**
 * DB 연결 테스트 — users 테이블에 count 쿼리로 연결 확인
 */
async function testConnection () {
  try {
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true })
    if (error) throw error
    console.log('✅ Supabase DB 연결 성공')
    return true
  } catch (err) {
    console.error('❌ Supabase DB 연결 실패:', err.message)
    return false
  }
}

module.exports = { supabase, testConnection }
