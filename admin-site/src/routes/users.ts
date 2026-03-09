import { Hono } from 'hono'
import type { Bindings } from '../types'

export const usersRoute = new Hono<{ Bindings: Bindings }>()

// GET /api/users  - 회원 목록 조회
usersRoute.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') ?? '100')
  const status = c.req.query('status')

  try {
    const db = c.env.DB
    let query = 'SELECT * FROM users'
    const params: any[] = []
    if (status) { query += ' WHERE status = ?'; params.push(status) }
    query += ` ORDER BY created_at DESC LIMIT ${limit}`

    const result = await db.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results, total: result.results.length })
  } catch {
    return c.json({ success: false, error: 'DB 미연결 - wrangler.jsonc에 D1 binding 설정 필요' }, 500)
  }
})

// POST /api/users  - 회원 추가
usersRoute.post('/', async (c) => {
  const { username, email, phone, status = 'pending' } = await c.req.json()
  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, email, phone, status, balance) VALUES (?, ?, ?, ?, 0)'
    ).bind(username, email, phone ?? '', status).run()
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})

// PUT /api/users/:id  - 회원 정보 수정
usersRoute.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = Object.keys(body).map(k => `${k} = ?`).join(', ')
  const values = Object.values(body)
  try {
    await c.env.DB.prepare(`UPDATE users SET ${fields} WHERE id = ?`).bind(...values, id).run()
    return c.json({ success: true })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})

// DELETE /api/users/:id  - 회원 삭제
usersRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})
