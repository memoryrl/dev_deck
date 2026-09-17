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
}
