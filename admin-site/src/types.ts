/**
 * 공유 타입 정의
 * user-site와 admin-site가 동일한 API 계약을 사용합니다.
 */

export type Bindings = {
  DB: D1Database
  KV: KVNamespace
  ADMIN_SECRET: string   // wrangler secret으로 설정
}

// ── 회원 ──────────────────────────────────────────────
export type User = {
  id: number
  username: string
  email: string
  phone: string
  status: 'active' | 'suspended' | 'pending'
  balance: number
  created_at: string
}

// ── 공지/이벤트 ───────────────────────────────────────
export type Notice = {
  id: number
  title: string
  content: string
  type: 'notice' | 'event'
  is_active: boolean
  created_at: string
}

// ── API 응답 래퍼 ─────────────────────────────────────
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  total?: number
}
