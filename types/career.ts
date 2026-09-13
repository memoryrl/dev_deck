export type CareerPostType = "project" | "skill" | "note"

export type CareerPost = {
  id: string
  user_id: string
  title: string
  excerpt: string | null
  content: string
  post_type: CareerPostType
  company: string | null
  role: string | null
  period_start: string | null
  period_end: string | null
  skills: string[] | null
  tags: string[] | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export type CareerSkill = {
  id: string
  user_id: string
  name: string
  category: string
  proficiency: string | null
  years: number | null
  summary: string | null
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
