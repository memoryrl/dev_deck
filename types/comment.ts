export type CommentTargetType = "prompt" | "career" | "board" | "steam"

export type Comment = {
  id: string
  target_type: CommentTargetType
  target_id: string
  parent_id: string | null
  user_id: string | null
  author_name: string
  body: string
  ip_address: string
  ip_region: string | null
  is_hidden: boolean
  created_at: string
  updated_at: string
}

export type CommentNode = Comment & { children: CommentNode[] }

export type ProfanityWord = {
  id: string
  word: string
  replacement: string
  created_at: string
}
