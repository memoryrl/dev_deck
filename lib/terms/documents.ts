import { cache } from "react"
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

// DB 패치를 아직 안 돌렸거나 조회에 실패했을 때 화면이 비지 않게 쓰는 최소 본문.
// 실제 문구는 supabase/patch-terms.sql 의 기본값과 관리자 화면(/site/terms)에서 관리한다.
const FALLBACK_DOCUMENTS: Record<TermsSlug, TermsDocument> = {
  terms: {
    slug: "terms",
    title: "이용약관",
    content: "<p>이용약관이 아직 등록되지 않았습니다. 관리자 화면에서 본문을 등록하세요.</p>",
    version: 0,
    updated_by: null,
    updated_at: "",
  },
  privacy: {
    slug: "privacy",
    title: "개인정보처리방침",
    content: "<p>개인정보처리방침이 아직 등록되지 않았습니다. 관리자 화면에서 본문을 등록하세요.</p>",
    version: 0,
    updated_by: null,
    updated_at: "",
  },
}

function formatDbError(error: { message: string; code?: string; details?: string | null; hint?: string | null }) {
  const parts = [error.message, error.details, error.hint].filter(
    (part): part is string => Boolean(part && part.trim())
  )
  const body = parts.join(" — ") || "데이터베이스 오류"
  const blob = `${error.code ?? ""} ${body}`
  if (/schema cache|does not exist|PGRST202|PGRST205|42P01|42883/i.test(blob)) {
    return `${body} — Supabase SQL 편집기에서 patch-terms.sql 을 실행하세요.`
  }
  return error.code ? `[${error.code}] ${body}` : body
}

export const getTermsDocuments = cache(async (): Promise<Record<TermsSlug, TermsDocument>> => {
  const docs: Record<TermsSlug, TermsDocument> = { ...FALLBACK_DOCUMENTS }
  if (!isSupabaseConfigured()) return docs

  const supabase = createClient()
  const { data, error } = await supabase
    .from("terms_documents")
    .select("slug, title, content, version, updated_by, updated_at")

  if (error || !data) return docs
  for (const row of data as TermsDocument[]) {
    if (isTermsSlug(row.slug)) docs[row.slug] = row
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
  note: string
}): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" }

  const supabase = createClient()
  const { data, error } = await supabase.rpc("terms_save", {
    p_slug: input.slug,
    p_title: input.title,
    p_content: input.content,
    p_note: input.note,
  })

  if (error) {
    console.error("[terms_save] failed", error)
    return { ok: false, error: formatDbError(error) }
  }
  return { ok: true, version: Number(data ?? 0) }
}

export async function listTermsRevisions({
  slug,
  page = 1,
}: {
  slug?: TermsSlug | null
  page?: number
}): Promise<PagedResult<TermsRevisionSummary>> {
  if (!isSupabaseConfigured()) return emptyPage(page, LIST_PAGE_SIZE)

  const supabase = createClient()
  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase
      .from("terms_revisions")
      .select("id, slug, version, title, note, edited_by, edited_by_email, created_at", { count: "exact" })
    if (slug) query = query.eq("slug", slug)

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("version", { ascending: false })
      .range(from, to)

    if (error) return null
    return { rows: (data ?? []) as TermsRevisionSummary[], total: count ?? 0 }
  })
}

export async function getTermsRevision(id: string): Promise<TermsRevision | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from("terms_revisions")
    .select("id, slug, version, title, content, note, edited_by, edited_by_email, created_at")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return data as TermsRevision
}

/** 같은 문서의 바로 이전 버전. 이력 상세에서 "이전 버전 보기" 링크에 쓴다. */
export async function getAdjacentTermsRevisions(
  slug: TermsSlug,
  version: number
): Promise<{ prev: TermsRevisionSummary | null; next: TermsRevisionSummary | null }> {
  if (!isSupabaseConfigured()) return { prev: null, next: null }

  const supabase = createClient()
  const select = "id, slug, version, title, note, edited_by, edited_by_email, created_at"
  const [prevResult, nextResult] = await Promise.all([
    supabase
      .from("terms_revisions")
      .select(select)
      .eq("slug", slug)
      .lt("version", version)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("terms_revisions")
      .select(select)
      .eq("slug", slug)
      .gt("version", version)
      .order("version", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    prev: (prevResult.data as TermsRevisionSummary | null) ?? null,
    next: (nextResult.data as TermsRevisionSummary | null) ?? null,
  }
}
