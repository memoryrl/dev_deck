export type NotificationType =
  | "member_signup"
  | "member_withdraw"
  | "post_created_admin"
  | "post_created_author"
  | "post_reply"

export type NotificationItem = {
  id: string
  type: NotificationType
  actorName: string | null
  subject: string | null
  linkUrl: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationPoll = {
  unreadCount: number
  /** 읽지 않은 알림 중 가장 최근 1건 — 토스트 표시용 */
  latest: NotificationItem | null
  /** 서버 기준 현재 시각 — 클라이언트 시계와 무관하게 "이미 본 알림" 기준선을 잡는 데 쓴다 */
  serverTime: string
}
