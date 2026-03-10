/**
 * src/routes/users.js
 * 회원 관리 API — Supabase(PostgreSQL) 버전
 *
 * [유저 사이트]
 * GET    /api/users/me            – 내 정보 조회 (인증 필요)
 * PUT    /api/users/me            – 내 정보 수정 (인증 필요)
 * DELETE /api/users/me            – 회원 탈퇴   (인증 필요)
 *
 * [관리자 전용]
 * GET    /api/users               – 전체 회원 목록 (페이지네이션 + 검색)
 * GET    /api/users/:id           – 특정 회원 조회
 * POST   /api/users               – 회원 직접 추가
 * PUT    /api/users/:id           – 회원 정보 수정
 * DELETE /api/users/:id           – 회원 강제 삭제
 * PATCH  /api/users/:id/status    – 회원 상태 변경
 */

'use strict'

const express  = require('express')
const bcrypt   = require('bcryptjs')
const { body, param, query: qv } = require('express-validator')
const { supabase }               = require('../config/database')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const { validate }               = require('../middleware/validate')

const router = express.Router()

// ────────────────────────────────────────────────────────────────────────────
// 유저: GET /api/users/me – 내 정보
// ────────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, phone, status, balance, created_at')
      .eq('id', req.user.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' })
    }
    return res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 유저: PUT /api/users/me – 내 정보 수정
// ────────────────────────────────────────────────────────────────────────────
router.put('/me', authMiddleware, [
  body('email').optional().isEmail().withMessage('유효한 이메일을 입력하세요.'),
  body('phone').optional({ checkFalsy: true })
    .matches(/^010-?\d{4}-?\d{4}$/).withMessage('전화번호 형식이 올바르지 않습니다.'),
  body('password').optional()
    .isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상')
    .matches(/(?=.*[A-Za-z])(?=.*\d)/).withMessage('영문+숫자를 포함해야 합니다.'),
], validate, async (req, res, next) => {
  try {
    const { email, phone, password } = req.body
    const updates = {}

    if (email !== undefined)   updates.email = email
    if (phone !== undefined)   updates.phone = phone
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 12)
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목을 입력하세요.' })
    }

    const { error } = await supabase.from('users').update(updates).eq('id', req.user.id)
    if (error) throw error

    return res.json({ success: true, message: '회원 정보가 수정되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 유저: DELETE /api/users/me – 회원 탈퇴
// ────────────────────────────────────────────────────────────────────────────
router.delete('/me', authMiddleware, async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.user.id)
    if (error) throw error
    return res.json({ success: true, message: '회원 탈퇴가 완료되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ── 이하 관리자 전용 ──────────────────────────────────────────────────────────
router.use(authMiddleware, adminMiddleware)

// ────────────────────────────────────────────────────────────────────────────
// 관리자: GET /api/users – 회원 목록 (페이지네이션 + 검색 + 상태 필터)
// ────────────────────────────────────────────────────────────────────────────
router.get('/', [
  qv('page').optional().isInt({ min: 1 }).withMessage('page는 1 이상'),
  qv('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit은 1~200'),
  qv('status').optional().isIn(['active', 'suspended', 'pending']).withMessage('상태값 오류'),
  qv('search').optional().trim(),
], validate, async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page  || '1')
    const limit  = parseInt(req.query.limit || '50')
    const from   = (page - 1) * limit
    const to     = from + limit - 1
    const status = req.query.status
    const search = req.query.search

    // Supabase query 빌더
    let q = supabase
      .from('users')
      .select('id, username, email, phone, status, balance, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status) q = q.eq('status', status)

    // 검색: username, email, phone 중 하나라도 포함
    if (search) {
      q = q.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data: rows, error, count } = await q
    if (error) throw error

    const total = count ?? 0

    return res.json({
      success   : true,
      data      : rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: GET /api/users/:id – 특정 회원 조회
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('유효한 ID를 입력하세요.'),
], validate, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, phone, status, balance, created_at')
      .eq('id', req.params.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' })
    }
    return res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: POST /api/users – 회원 직접 추가
// ────────────────────────────────────────────────────────────────────────────
router.post('/', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('아이디는 3~30자'),
  body('email').trim().isEmail().withMessage('유효한 이메일'),
  body('password').isLength({ min: 8 }).withMessage('비밀번호 최소 8자'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('status').optional().isIn(['active', 'suspended', 'pending']).withMessage('상태값 오류'),
  body('balance').optional().isInt({ min: 0 }).withMessage('잔액은 0 이상'),
], validate, async (req, res, next) => {
  try {
    const { username, email, password, phone = '', status = 'pending', balance = 0 } = req.body

    // 중복 확인
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, error: '이미 존재하는 아이디 또는 이메일입니다.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: inserted, error } = await supabase
      .from('users')
      .insert({ username, email, password_hash: passwordHash, phone, status, balance })
      .select('id')
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      message: '회원이 추가되었습니다.',
      data   : { id: inserted.id },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: PUT /api/users/:id – 회원 정보 수정
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('유효한 ID'),
  body('email').optional().isEmail().withMessage('유효한 이메일'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('status').optional().isIn(['active', 'suspended', 'pending']).withMessage('상태값 오류'),
  body('balance').optional().isInt({ min: 0 }).withMessage('잔액은 0 이상'),
], validate, async (req, res, next) => {
  try {
    const { email, phone, status, balance } = req.body
    const updates = {}

    if (email   !== undefined) updates.email   = email
    if (phone   !== undefined) updates.phone   = phone
    if (status  !== undefined) updates.status  = status
    if (balance !== undefined) updates.balance = balance

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목을 입력하세요.' })
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id')
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' })
    }

    return res.json({ success: true, message: '회원 정보가 수정되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: DELETE /api/users/:id – 회원 삭제
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('유효한 ID'),
], validate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' })
    }

    return res.json({ success: true, message: '회원이 삭제되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: PATCH /api/users/:id/status – 회원 상태 변경
// ────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', [
  param('id').isInt({ min: 1 }).withMessage('유효한 ID'),
  body('status').isIn(['active', 'suspended', 'pending']).withMessage('상태값은 active | suspended | pending'),
], validate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select('id')
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' })
    }

    return res.json({ success: true, message: `회원 상태가 '${req.body.status}'로 변경되었습니다.` })
  } catch (err) {
    next(err)
  }
})

module.exports = router
