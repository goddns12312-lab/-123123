/**
 * src/index.js
 * Express 애플리케이션 진입점 — Supabase(PostgreSQL) 버전
 *
 * 아키텍처:
 *  ┌─────────────┐     ┌─────────────────────────────────────┐
 *  │ user-site   │────▶│         /api/auth/*                 │
 *  │ (port 3000) │     │         /api/users/me               │
 *  └─────────────┘     │         /api/notices                │
 *                      │                                     │
 *  ┌─────────────┐     │  Express API Server (port 4000)     │
 *  │ admin-site  │────▶│         /api/users   (admin)        │
 *  │ (port 3001) │     │         /api/stats   (admin)        │
 *  └─────────────┘     └─────────────────────────────────────┘
 *                                        │
 *                            Supabase PostgreSQL (무료)
 *                            https://supabase.com
 */

'use strict'

require('dotenv').config()

const express   = require('express')
const cors      = require('cors')
const helmet    = require('helmet')
const morgan    = require('morgan')
const rateLimit = require('express-rate-limit')

const { testConnection }                 = require('./config/database')
const authRouter                         = require('./routes/auth')
const usersRouter                        = require('./routes/users')
const noticesRouter                      = require('./routes/notices')
const statsRouter                        = require('./routes/stats')
const { errorHandler, notFound }         = require('./middleware/errorHandler')

const app  = express()
const PORT = process.env.PORT || 4000

// ── 보안 헤더 ──────────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS 설정 ──────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',').map(o => o.trim())

app.use(cors({
  origin (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true)
    }
    callback(new Error(`CORS: ${origin} 은(는) 허용되지 않습니다.`))
  },
  methods      : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials  : true,
}))

// ── 기본 미들웨어 ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max     : parseInt(process.env.RATE_LIMIT_MAX       || '100'),
  standardHeaders: true,
  legacyHeaders  : false,
  message: { success: false, error: '너무 많은 요청입니다. 잠시 후 다시 시도하세요.' },
})
app.use('/api/', limiter)

// ── 헬스체크 ────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status : 'ok',
    service: 'casino-backend',
    db     : 'supabase-postgresql',
    time   : new Date().toISOString(),
    env    : process.env.NODE_ENV || 'development',
  })
})

// ── API 라우터 등록 ─────────────────────────────────────────────────────────
app.use('/api/auth',    authRouter)
app.use('/api/users',   usersRouter)
app.use('/api/notices', noticesRouter)
app.use('/api/stats',   statsRouter)

// ── 404 / 에러 핸들러 ───────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── 서버 시작 ───────────────────────────────────────────────────────────────
async function start () {
  await testConnection()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  Casino Backend API · Supabase · port ${PORT}           ║
╠══════════════════════════════════════════════════════╣
║  Health   :  GET  /health                           ║
║  Auth     :  POST /api/auth/register                ║
║             POST /api/auth/login                    ║
║             POST /api/auth/admin/login              ║
║             GET  /api/auth/me                       ║
║  Users    :  GET  /api/users          (admin)       ║
║             GET  /api/users/me                      ║
║             POST /api/users          (admin)        ║
║             PUT  /api/users/:id      (admin)        ║
║             DELETE /api/users/:id   (admin)         ║
║  Notices  :  GET  /api/notices                      ║
║             POST /api/notices        (admin)        ║
║  Stats    :  GET  /api/stats          (admin)       ║
║             POST /api/stats/init-db  (SQL 가이드)   ║
╚══════════════════════════════════════════════════════╝
    `)
  })
}

start().catch(err => {
  console.error('서버 시작 실패:', err)
  process.exit(1)
})

module.exports = app
