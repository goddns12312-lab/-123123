/**
 * src/routes/auth.js
 * 인증 API — Supabase(PostgreSQL) 버전
 *
 * POST /api/auth/register      – 회원가입
 * POST /api/auth/login         – 일반 사용자 로그인
 * POST /api/auth/admin/login   – 관리자 로그인
 * GET  /api/auth/me            – 내 정보 조회 (인증 필요)
 * POST /api/auth/logout        – 로그아웃
 */

'use strict'

const express  = require('express')
const bcrypt   = require('bcryptjs')
const { body } = require('express-validator')
const { supabase }              = require('../config/database')
const { signToken, authMiddleware } = require('../middleware/auth')
const { validate }              = require('../middleware/validate')

const router = express.Router()

// ── 유효성 검사 규칙 ──────────────────────────────────────────────────────────
const registerRules = [
  body('username')
    .trim().isLength({ min: 3, max: 30 }).withMessage('아이디는 3~30자')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('영문·숫자·밑줄(_)만 사용 가능'),
  body('email').trim().isEmail().withMessage('유효한 이메일 주소를 입력하세요.'),
  body('password')
    .isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상')
    .matches(/(?=.*[A-Za-z])(?=.*\d)/).withMessage('영문자와 숫자를 모두 포함해야 합니다.'),
  body('phone').optional({ checkFalsy: true }).trim()
    .matches(/^010-?\d{4}-?\d{4}$/).withMessage('전화번호 형식 오류 (예: 010-1234-5678)'),
]

const loginRules = [
  body('username').trim().notEmpty().withMessage('아이디를 입력하세요.'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요.'),
]

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register  – 회원가입
// ────────────────────────────────────────────────────────────────────────────
router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const { username, email, password, phone = '' } = req.body

    // 1. 중복 확인 (username OR email)
    const { data: existing, error: chkErr } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1)

    if (chkErr) throw chkErr
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, error: '이미 사용 중인 아이디 또는 이메일입니다.' })
    }

    // 2. 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 12)

    // 3. INSERT
    const { data: inserted, error: insErr } = await supabase
      .from('users')
      .insert({ username, email, password_hash: passwordHash, phone, status: 'pending', balance: 0 })
      .select('id')
      .single()

    if (insErr) throw insErr

    // 4. JWT 발급
    const token = signToken({ id: inserted.id, username, role: 'user' })

    return res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data   : { id: inserted.id, username, email, token },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login  – 일반 사용자 로그인
// ────────────────────────────────────────────────────────────────────────────
router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const { username, password } = req.body

    // 1. 사용자 조회 (password_hash 포함)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, phone, status, balance, password_hash')
      .eq('username', username)
      .single()

    if (error || !user) {
      return res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    }

    // 2. 계정 상태 확인
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, error: '정지된 계정입니다. 고객센터에 문의하세요.' })
    }

    // 3. 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    }

    // 4. JWT 발급
    const token = signToken({ id: user.id, username: user.username, role: 'user' })

    return res.json({
      success: true,
      message: '로그인 성공',
      data   : {
        id      : user.id,
        username: user.username,
        email   : user.email,
        phone   : user.phone,
        status  : user.status,
        balance : user.balance,
        token,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/admin/login  – 관리자 로그인 (환경변수 인증)
// ────────────────────────────────────────────────────────────────────────────
router.post('/admin/login', loginRules, validate, async (req, res, next) => {
  try {
    const { username, password } = req.body
    const adminUser = process.env.ADMIN_USER || 'admin'
    const adminPass = process.env.ADMIN_PASS || 'admin1234'

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ success: false, error: '관리자 인증 실패' })
    }

    const token = signToken({ id: 0, username: adminUser, role: 'admin' }, '8h')

    return res.json({
      success: true,
      message: '관리자 로그인 성공',
      data   : { username: adminUser, role: 'admin', token },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  – 내 정보 조회
// ────────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({ success: true, data: { id: 0, username: req.user.username, role: 'admin' } })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, phone, status, balance, created_at')
      .eq('id', req.user.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' })
    }

    return res.json({ success: true, data: { ...user, role: 'user' } })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  – 로그아웃 (JWT 무상태 — 클라이언트에서 토큰 삭제)
// ────────────────────────────────────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: '로그아웃 되었습니다. 클라이언트의 토큰을 삭제하세요.' })
})

module.exports = router
