/**
 * src/utils/seed.js
 * Supabase 테스트 데이터 삽입 스크립트
 *
 * 전제조건: npm run migrate 를 통해 Supabase SQL Editor에서 테이블 먼저 생성!
 *
 * 실행: node src/utils/seed.js
 *      (또는 npm run seed)
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const bcrypt = require('bcryptjs')
const { supabase, testConnection } = require('../config/database')

async function runSeed () {
  console.log('🌱 Supabase 시드 데이터 삽입 시작...\n')

  const ok = await testConnection()
  if (!ok) {
    console.error('❌ DB 연결 실패. .env의 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인하세요.')
    process.exit(1)
  }

  const hash = await bcrypt.hash('test1234', 12)

  try {
    // ── users 시드 ────────────────────────────────────────────────────────
    console.log('👤 유저 데이터 삽입 중...')
    const users = [
      { username: 'user01',   email: 'user01@example.com',  password_hash: hash, phone: '010-1234-5678', status: 'active',    balance: 50000  },
      { username: 'hong99',   email: 'hong@example.com',    password_hash: hash, phone: '010-9876-5432', status: 'active',    balance: 120000 },
      { username: 'test123',  email: 'test@example.com',    password_hash: hash, phone: '010-0000-1111', status: 'pending',   balance: 0      },
      { username: 'vip_kim',  email: 'kim@vip.com',         password_hash: hash, phone: '010-5555-6666', status: 'active',    balance: 980000 },
      { username: 'blocked1', email: 'block@example.com',   password_hash: hash, phone: '010-1111-2222', status: 'suspended', balance: 0      },
    ]

    // upsert: username이 이미 있으면 건너뜀 (onConflict)
    const { error: usersErr } = await supabase
      .from('users')
      .upsert(users, { onConflict: 'username', ignoreDuplicates: true })

    if (usersErr) throw usersErr
    console.log('   ✅ 유저 5명 삽입 완료')

    // ── notices 시드 ──────────────────────────────────────────────────────
    console.log('📢 공지 데이터 삽입 중...')
    const notices = [
      { title: '서비스 점검 안내',      content: '3월 10일 새벽 2시~4시 서버 점검이 있습니다.', type: 'notice', is_active: true  },
      { title: '신규 회원 가입 이벤트', content: '가입 시 5만 포인트 지급!',                   type: 'event',  is_active: true  },
      { title: '봄 시즌 보너스',        content: '3월 한 달간 첫 충전 100% 보너스 지급.',       type: 'event',  is_active: true  },
      { title: '이용약관 변경 안내',    content: '2026년 2월 1일자로 이용약관이 변경되었습니다.',type: 'notice', is_active: false },
    ]

    const { error: noticesErr } = await supabase
      .from('notices')
      .upsert(notices, { onConflict: 'title', ignoreDuplicates: true })

    if (noticesErr) throw noticesErr
    console.log('   ✅ 공지 4건 삽입 완료')

    console.log('\n✨ 시드 데이터 삽입 완료!')
    console.log('📝 테스트 계정: user01 / test1234')
  } catch (err) {
    console.error('❌ 시드 실패:', err.message)
    process.exit(1)
  }

  process.exit(0)
}

runSeed()
