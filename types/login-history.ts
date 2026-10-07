export type LoginHistoryEventType = "login" | "visit"

export type LoginHistoryEntry = {
  id: string
  user_id: string | null
  email: string | null
  provider: string | null
  event_type: LoginHistoryEventType
  ip_address: string
  ip_region: string | null
  user_agent: string | null
  created_at: string
  /** 서버가 이메일을 소유자와 대조해 채운다 — 클라이언트는 OWNER_EMAIL 환경변수를 못 읽는다 */
  is_owner?: boolean
}

export type PageViewEntry = {
  id: string
  visit_id: string
  path: string
  created_at: string
}
