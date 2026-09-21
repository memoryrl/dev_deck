export type TermsSlug = "terms" | "privacy"

/** 한국어(title/content)는 필수, 영문(title_en/content_en)은 비어 있을 수 있다 — 비면 화면은 한국어로 대체한다. */
export type TermsDocument = {
  slug: TermsSlug
  title: string
  content: string
  title_en: string
  content_en: string
  version: number
  updated_by: string | null
  updated_at: string
}

export type TermsRevision = {
  id: string
  slug: TermsSlug
  version: number
  title: string
  content: string
  title_en: string
  content_en: string
  note: string | null
  edited_by: string | null
  edited_by_email: string | null
  created_at: string
}

export type TermsRevisionSummary = Omit<TermsRevision, "content" | "content_en"> & {
  /** 이 버전에 영문 본문이 있는지. 목록에서 EN 표시용 */
  has_en: boolean
}

export type TermsConsent = {
  user_id: string
  slug: TermsSlug
  version: number
  agreed_at: string
}
