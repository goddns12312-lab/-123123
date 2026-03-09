import { Hono } from 'hono'
import type { Bindings } from '../types'

export const authRoute = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/login
authRoute.post('/login', async (c) => {
  const { username, password } = await c.req.json()

  // 환경변수에서 관리자 자격증명 확인
  // 실제 운영 시 wrangler secret으로 ADMIN_USER, ADMIN_PASS 설정
  const adminUser = (c.env as any).ADMIN_USER ?? 'admin'
  const adminPass = (c.env as any).ADMIN_PASS ?? 'admin1234'

  if (username === adminUser && password === adminPass) {
    return c.json({
      success: true,
      data: {
        token: `admin-${Date.now()}`,
        username: adminUser
      }
    })
  }

  return c.json({ success: false, error: '인증 실패' }, 401)
})

// POST /api/auth/verify
authRoute.post('/verify', (c) => {
  const auth = c.req.header('Authorization')
  if (auth?.startsWith('Bearer admin-')) {
    return c.json({ success: true })
  }
  return c.json({ success: false }, 401)
})
