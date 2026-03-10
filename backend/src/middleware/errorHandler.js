/**
 * src/middleware/errorHandler.js
 * 전역 에러 핸들러 미들웨어
 */

'use strict'

/**
 * Express 전역 에러 핸들러
 * app.use(errorHandler) 로 가장 마지막에 등록합니다.
 */
function errorHandler (err, req, res, next) { // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV !== 'production'

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)
  if (isDev) console.error(err.stack)

  // MySQL 에러 변환
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, error: '이미 존재하는 데이터입니다.' })
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, error: '참조 데이터가 존재하지 않습니다.' })
  }

  const status  = err.status || err.statusCode || 500
  const message = (isDev || status < 500) ? err.message : '서버 내부 오류가 발생했습니다.'

  res.status(status).json({
    success: false,
    error  : message,
    ...(isDev && { stack: err.stack }),
  })
}

/**
 * 404 Not Found 핸들러
 */
function notFound (req, res) {
  res.status(404).json({ success: false, error: `경로를 찾을 수 없습니다: ${req.method} ${req.path}` })
}

module.exports = { errorHandler, notFound }
