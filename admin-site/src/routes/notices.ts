import { Hono } from 'hono'
import type { Bindings } from '../types'

export const noticesRoute = new Hono<{ Bindings: Bindings }>()

// GET /api/notices  - 공지/이벤트 목록
noticesRoute.get('/', async (c) => {
  const type = c.req.query('type')   // 'notice' | 'event' | undefined
  const limit = parseInt(c.req.query('limit') ?? '100')

  try {
    let query = 'SELECT * FROM notices'
    const params: any[] = []
    if (type) { query += ' WHERE type = ?'; params.push(type) }
    query += ` ORDER BY created_at DESC LIMIT ${limit}`

    const result = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results, total: result.results.length })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})

// POST /api/notices  - 공지/이벤트 추가
noticesRoute.post('/', async (c) => {
  const { title, content, type = 'notice', is_active = true } = await c.req.json()
  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO notices (title, content, type, is_active) VALUES (?, ?, ?, ?)'
    ).bind(title, content ?? '', type, is_active ? 1 : 0).run()
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})

// PUT /api/notices/:id  - 공지 수정
noticesRoute.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = Object.keys(body).map(k => `${k} = ?`).join(', ')
  const values = Object.values(body).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v)
  try {
    await c.env.DB.prepare(`UPDATE notices SET ${fields} WHERE id = ?`).bind(...values, id).run()
    return c.json({ success: true })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})

// DELETE /api/notices/:id  - 공지 삭제
noticesRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await c.env.DB.prepare('DELETE FROM notices WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch {
    return c.json({ success: false, error: 'DB 미연결' }, 500)
  }
})
