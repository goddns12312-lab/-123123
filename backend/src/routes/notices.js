/**
 * src/routes/notices.js
 * 공지/이벤트 관리 API — Supabase(PostgreSQL) 버전
 *
 * [유저 사이트 (인증 불필요)]
 * GET  /api/notices             – 활성 공지/이벤트 목록
 * GET  /api/notices/:id         – 공지 상세
 *
 * [관리자 전용]
 * POST   /api/notices            – 공지 등록
 * PUT    /api/notices/:id        – 공지 수정
 * DELETE /api/notices/:id        – 공지 삭제
 * PATCH  /api/notices/:id/toggle – 활성/비활성 토글
 */

'use strict'

const express  = require('express')
const { body, param, query: qv } = require('express-validator')
const { supabase }               = require('../config/database')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const { validate }               = require('../middleware/validate')

const router = express.Router()

// ────────────────────────────────────────────────────────────────────────────
// 공개: GET /api/notices – 활성 공지 목록
// ────────────────────────────────────────────────────────────────────────────
router.get('/', [
  qv('type').optional().isIn(['notice', 'event']).withMessage('type은 notice | event'),
  qv('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit은 1~100'),
], validate, async (req, res, next) => {
  try {
    const type    = req.query.type
    const limit   = parseInt(req.query.limit || '50')
    const showAll = req.query.all === 'true'  // 관리자 전체 조회 시

    let q = supabase
      .from('notices')
      .select('id, title, content, type, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!showAll) q = q.eq('is_active', true)
    if (type)     q = q.eq('type', type)

    const { data: rows, error } = await q
    if (error) throw error

    return res.json({ success: true, data: rows, total: rows.length })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 공개: GET /api/notices/:id – 공지 상세
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('유효한 ID'),
], validate, async (req, res, next) => {
  try {
    const { data: notice, error } = await supabase
      .from('notices')
      .select('id, title, content, type, is_active, created_at')
      .eq('id', req.params.id)
      .single()

    if (error || !notice) {
      return res.status(404).json({ success: false, error: '공지를 찾을 수 없습니다.' })
    }
    return res.json({ success: true, data: notice })
  } catch (err) {
    next(err)
  }
})

// ── 이하 관리자 전용 ──────────────────────────────────────────────────────────
router.use(authMiddleware, adminMiddleware)

// ────────────────────────────────────────────────────────────────────────────
// 관리자: POST /api/notices – 공지 등록
// ────────────────────────────────────────────────────────────────────────────
router.post('/', [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('제목은 2~200자'),
  body('content').optional().trim(),
  body('type').optional().isIn(['notice', 'event']).withMessage('type은 notice | event'),
  body('is_active').optional().isBoolean().withMessage('is_active는 true/false'),
], validate, async (req, res, next) => {
  try {
    const { title, content = '', type = 'notice', is_active = true } = req.body

    const { data: inserted, error } = await supabase
      .from('notices')
      .insert({ title, content, type, is_active })
      .select('id')
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      message: '공지가 등록되었습니다.',
      data   : { id: inserted.id },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: PUT /api/notices/:id – 공지 수정
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('content').optional().trim(),
  body('type').optional().isIn(['notice', 'event']),
  body('is_active').optional().isBoolean(),
], validate, async (req, res, next) => {
  try {
    const { title, content, type, is_active } = req.body
    const updates = {}

    if (title     !== undefined) updates.title     = title
    if (content   !== undefined) updates.content   = content
    if (type      !== undefined) updates.type      = type
    if (is_active !== undefined) updates.is_active = is_active

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목을 입력하세요.' })
    }

    const { data, error } = await supabase
      .from('notices')
      .update(updates)
      .eq('id', req.params.id)
      .select('id')
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: '공지를 찾을 수 없습니다.' })
    }

    return res.json({ success: true, message: '공지가 수정되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: DELETE /api/notices/:id – 공지 삭제
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('유효한 ID'),
], validate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notices')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: '공지를 찾을 수 없습니다.' })
    }

    return res.json({ success: true, message: '공지가 삭제되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────────────────
// 관리자: PATCH /api/notices/:id/toggle – 활성/비활성 토글
// ────────────────────────────────────────────────────────────────────────────
router.patch('/:id/toggle', [
  param('id').isInt({ min: 1 }).withMessage('유효한 ID'),
], validate, async (req, res, next) => {
  try {
    // 1. 현재 상태 조회
    const { data: current, error: fetchErr } = await supabase
      .from('notices')
      .select('id, is_active')
      .eq('id', req.params.id)
      .single()

    if (fetchErr || !current) {
      return res.status(404).json({ success: false, error: '공지를 찾을 수 없습니다.' })
    }

    // 2. 반전 후 업데이트
    const newStatus = !current.is_active
    const { error: updErr } = await supabase
      .from('notices')
      .update({ is_active: newStatus })
      .eq('id', req.params.id)

    if (updErr) throw updErr

    return res.json({
      success  : true,
      message  : `공지가 ${newStatus ? '활성화' : '비활성화'}되었습니다.`,
      is_active: newStatus,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
