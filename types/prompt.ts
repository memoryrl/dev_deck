export type Prompt = {
  id: string
  user_id: string
  title: string
  content: string
  category: string
  tags: string[] | null
  is_public: boolean
  created_at: string
  updated_at: string
}
