import { cache } from "react"
import type { AppLocale } from "@/lib/i18n/config"
import { emptyPage, fetchPagedRows, LIST_PAGE_SIZE, type PagedResult } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { TermsDocument, TermsRevision, TermsRevisionSummary, TermsSlug } from "@/types/terms"

/** 가입 시 반드시 확인해야 하는 문서. 순서대로 화면에 보인다. */
export const TERMS_SLUGS: TermsSlug[] = ["terms", "privacy"]

export function isTermsSlug(value: unknown): value is TermsSlug {
  return typeof value === "string" && (TERMS_SLUGS as string[]).includes(value)
}

export function parseTermsSlug(value: string | string[] | undefined, fallback: TermsSlug = "terms"): TermsSlug {
  const raw = Array.isArray(value) ? value[0] : value
  return isTermsSlug(raw) ? raw : fallback
}

export type LocalizedTerms = {
  title: string
  content: string
  /** 요청 언어의 본문을 그대로 냈으면 true, 영문이 비어 한국어로 대체했으면 false */
  translated: boolean
}

/**
 * 화면 언어에 맞는 제목·본문을 고른다. 영문 본문이 비어 있으면 한국어로 대체한다 —
 * 약관은 "없음"보다 "원문이라도 보이는" 쪽이 안전하다.
 */
export function localizeTerms(
  doc: Pick<TermsDocument, "title" | "content" | "title_en" | "content_en">,
  locale: AppLocale
): LocalizedTerms {
  if (locale === "en" && doc.content_en.trim()) {
    return { title: doc.title_en.trim() || doc.title, content: doc.content_en, translated: true }
  }
  return { title: doc.title, content: doc.content, translated: locale === "ko" }
}

// DB 패치를 아직 안 돌렸거나 조회에 실패했을 때 화면이 비지 않게 쓰는 최소 본문.
// 실제 문구는 supabase/patch-terms.sql 의 기본값과 관리자 화면(/site/terms)에서 관리한다.
const FALLBACK_DOCUMENTS: Record<TermsSlug, TermsDocument> = {
  terms: {
    slug: "terms",
    title: "이용약관",
    content: "<p>이용약관이 아직 등록되지 않았습니다. 관리자 화면에서 본문을 등록하세요.</p>",
    title_en: "Terms of Service",
    content_en: "<p>The Terms of Service have not been registered yet. Add them in the admin console.</p>",
    version: 0,
    updated_by: null,
    updated_at: "",
  },
  privacy: {
    slug: "privacy",
    title: "개인정보처리방침",
    content: "<p>개인정보처리방침이 아직 등록되지 않았습니다. 관리자 화면에서 본문을 등록하세요.</p>",
    title_en: "Privacy Policy",
    content_en: "<p>The Privacy Policy has not been registered yet. Add it in the admin console.</p>",
    version: 0,
    updated_by: null,
    updated_at: "",
  },
}

const DOCUMENT_SELECT = "slug, title, content, title_en, content_en, version, updated_by, updated_at"
const REVISION_SELECT = "id, slug, version, title, content, title_en, content_en, note, edited_by, edited_by_email, created_at"
const REVISION_SUMMARY_SELECT = "id, slug, version, title, title_en, content_en, note, edited_by, edited_by_email, created_at"

function formatDbError(error: { message: string; code?: string; details?: string | null; hint?: string | null }) {
  const parts = [error.message, error.details, error.hint].filter(
    (part): part is string => Boolean(part && part.trim())
  )
  const body = parts.join(" — ") || "데이터베이스 오류"
  const blob = `${error.code ?? ""} ${body}`
  if (/schema cache|does not exist|PGRST202|PGRST204|PGRST205|42P01|42883|42703/i.test(blob)) {
    return `${body} — Supabase SQL 편집기에서 patch-terms.sql 을 실행하세요.`
  }
  return error.code ? `[${error.code}] ${body}` : body
}

function normalizeDocument(row: Partial<TermsDocument> & Pick<TermsDocument, "slug">): TermsDocument {
  const fallback = FALLBACK_DOCUMENTS[row.slug]
  return {
    slug: row.slug,
    title: row.title ?? fallback.title,
    content: row.content ?? "",
    title_en: row.title_en ?? "",
    content_en: row.content_en ?? "",
    version: row.version ?? 0,
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at ?? "",
  }
}

export const getTermsDocuments = cache(async (): Promise<Record<TermsSlug, TermsDocument>> => {
  const docs: Record<TermsSlug, TermsDocument> = { ...FALLBACK_DOCUMENTS }
  if (!isSupabaseConfigured()) return docs

  const supabase = await createClient()
  const { data, error } = await supabase.from("terms_documents").select(DOCUMENT_SELECT)

  if (error || !data) return docs
  for (const row of data as (Partial<TermsDocument> & Pick<TermsDocument, "slug">)[]) {
    if (isTermsSlug(row.slug)) docs[row.slug] = normalizeDocument(row)
  }
  return docs
})

export async function getTermsDocument(slug: TermsSlug): Promise<TermsDocument> {
  const docs = await getTermsDocuments()
  return docs[slug]
}

export async function saveTermsDocument(input: {
  slug: TermsSlug
  title: string
  content: string
  titleEn: string
  contentEn: string
  note: string
}): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("terms_save", {
    p_slug: input.slug,
    p_title: input.title,
    p_content: input.content,
    p_title_en: input.titleEn,
    p_content_en: input.contentEn,
    p_note: input.note,
  })

  if (error) {
    console.error("[terms_save] failed", error)
    return { ok: false, error: formatDbError(error) }
  }
  return { ok: true, version: Number(data ?? 0) }
}

type RevisionSummaryRow = Omit<TermsRevisionSummary, "has_en"> & { content_en: string | null }

function toSummary(row: RevisionSummaryRow): TermsRevisionSummary {
  const { content_en, ...rest } = row
  return { ...rest, title_en: rest.title_en ?? "", has_en: Boolean(content_en && content_en.trim()) }
}

export async function listTermsRevisions({
  slug,
  page = 1,
}: {
  slug?: TermsSlug | null
  page?: number
}): Promise<PagedResult<TermsRevisionSummary>> {
  if (!isSupabaseConfigured()) return emptyPage(page, LIST_PAGE_SIZE)

  const supabase = await createClient()
  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase.from("terms_revisions").select(REVISION_SUMMARY_SELECT, { count: "exact" })
    if (slug) query = query.eq("slug", slug)

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("version", { ascending: false })
      .range(from, to)

    if (error) return null
    return { rows: ((data ?? []) as RevisionSummaryRow[]).map(toSummary), total: count ?? 0 }
  })
}

export async function getTermsRevision(id: string): Promise<TermsRevision | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("terms_revisions")
    .select(REVISION_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as TermsRevision
  return { ...row, title_en: row.title_en ?? "", content_en: row.content_en ?? "" }
}

/** 같은 문서의 바로 이전·다음 버전. 이력 상세에서 버전 이동 링크에 쓴다. */
export async function getAdjacentTermsRevisions(
  slug: TermsSlug,
  version: number
): Promise<{ prev: TermsRevisionSummary | null; next: TermsRevisionSummary | null }> {
  if (!isSupabaseConfigured()) return { prev: null, next: null }

  const supabase = await createClient()
  const [prevResult, nextResult] = await Promise.all([
    supabase
      .from("terms_revisions")
      .select(REVISION_SUMMARY_SELECT)
      .eq("slug", slug)
      .lt("version", version)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("terms_revisions")
      .select(REVISION_SUMMARY_SELECT)
      .eq("slug", slug)
      .gt("version", version)
      .order("version", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const prev = prevResult.data as RevisionSummaryRow | null
  const next = nextResult.data as RevisionSummaryRow | null
  return { prev: prev ? toSummary(prev) : null, next: next ? toSummary(next) : null }
}
