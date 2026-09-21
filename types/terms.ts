export type TermsSlug = "terms" | "privacy"

export type TermsDocument = {
  slug: TermsSlug
  title: string
  content: string
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
  note: string | null
  edited_by: string | null
  edited_by_email: string | null
  created_at: string
}

export type TermsRevisionSummary = Omit<TermsRevision, "content">

export type TermsConsent = {
  user_id: string
  slug: TermsSlug
  version: number
  agreed_at: string
}
