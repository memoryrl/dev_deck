export type ShareTargetType = "board_post" | "prompt" | "career" | "game"
export type ShareLinkType = "public" | "invite"
export type InviteMethod = "COPY" | "EMAIL" | "SMS"

export const SHARE_TARGET_TYPES: ShareTargetType[] = ["board_post", "prompt", "career", "game"]
export const INVITE_METHODS: InviteMethod[] = ["COPY", "EMAIL", "SMS"]

/** 공유하기 화면에 내려주는 초대 1건 */
export type ShareInviteView = {
  id: string
  key: string
  name: string
  method: InviteMethod
  email: string | null
  phone: string | null
  title: string | null
  message: string | null
  readAt: string | null
  accessCount: number
  lastAccessAt: string | null
  createdAt: string
}

/** 공유하기 화면이 여는 순간 서버에서 받는 현재 공유 상태 */
export type ShareState = {
  target: { title: string; subPath: string }
  mode: ShareLinkType | "none"
  publicLink: {
    key: string
    periodLimited: boolean
    expiresAt: string | null
    hasPassword: boolean
    visitLimited: boolean
    maxVisits: number | null
    visitCount: number
  } | null
  invite: {
    periodLimited: boolean
    expiresAt: string | null
    invites: ShareInviteView[]
  } | null
}

export type ShareActionResult<T = ShareState> =
  | { ok: true; state: T; created?: { key: string } }
  | { ok: false; error: string }

/** 관리자 "공유 링크" 목록 1행 */
export type AdminShareRow = {
  id: string
  linkType: ShareLinkType
  targetType: ShareTargetType
  targetId: string
  title: string
  subPath: string | null
  key: string
  creatorName: string
  periodLimited: boolean
  expiresAt: string | null
  hasPassword: boolean
  visitLimited: boolean
  maxVisits: number | null
  visitCount: number
  inviteTotal: number
  inviteRead: number
  createdAt: string
  deletedAt: string | null
}

export type ShareAccessEntry = {
  id: string
  accessedAt: string
  ipAddress: string | null
  userAgent: string | null
  inviteName: string | null
}
