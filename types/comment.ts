export type CommentTargetType = "prompt" | "career" | "board" | "steam"

export type Comment = {
  id: string
  target_type: CommentTargetType
  target_id: string
  parent_id: string | null
  author_name: string
  body: string
  /** 화면에 보여 주는 가려진 IP(예: 203.0.*.*). 공개 조회에서 쓰는 값이다. */
  ip_masked: string
  ip_region: string | null
  is_hidden: boolean
  created_at: string
  updated_at: string
  /** 전체 IP·작성 회원 ID는 공개 API에 나가지 않는다 — 관리자 화면이 서버에서만 채워 넣는다. */
  ip_address?: string
  user_id?: string | null
}

export type CommentNode = Comment & { children: CommentNode[] }

export type ProfanityWord = {
  id: string
  word: string
  replacement: string
  created_at: string
}
