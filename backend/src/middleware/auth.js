/**
 * src/middleware/auth.js
 * JWT 인증 미들웨어
 */

'use strict'

const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret_32_characters!!'

/**
 * 일반 사용자 인증 미들웨어
 * Authorization: Bearer <token> 헤더를 검증합니다.
 */
function authMiddleware (req, res, next) {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증 토큰이 없습니다.' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: '토큰이 만료되었습니다.' })
    }
    return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' })
  }
}

/**
 * 관리자 권한 미들웨어
 * authMiddleware 이후에 사용합니다.
 */
function adminMiddleware (req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' })
  }
  next()
}

/**
 * JWT 토큰 생성 헬퍼
 * @param {object} payload  { id, username, role }
 * @param {string} expiresIn  '24h' | '7d' | ...
 */
function signToken (payload, expiresIn = process.env.JWT_EXPIRES_IN || '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

module.exports = { authMiddleware, adminMiddleware, signToken }
