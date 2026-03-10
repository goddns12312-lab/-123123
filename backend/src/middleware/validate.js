/**
 * src/middleware/validate.js
 * express-validator 결과 처리 미들웨어
 */

'use strict'

const { validationResult } = require('express-validator')

/**
 * 유효성 검사 결과를 확인하고 실패 시 400 응답을 반환합니다.
 * express-validator 체인 마지막에 이 미들웨어를 추가하세요.
 */
function validate (req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error  : '입력값이 올바르지 않습니다.',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    })
  }
  next()
}

module.exports = { validate }
