import { cache } from "react"
import { isOwnerUser } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/server"
import { TERMS_SLUGS } from "@/lib/terms/documents"
import { isSupabaseConfigured } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

/** 약관 확인 화면. 첫 로그인 뒤 두 약관을 모두 확인하기 전까지는 여기로만 보낸다. */
export const TERMS_CONSENT_PATH = "/signup/terms"

// Google 로그인은 인증이 끝나는 순간 auth.users 행이 생긴다. 이 시간 안에 약관을 거절하면
// "가입 취소"로 보고 계정을 지운다 — 그보다 오래된 계정(이 기능 전에 가입한 회원)은
// 거절해도 계정은 두고 로그아웃만 한다.
const FRESH_SIGNUP_WINDOW_MS = 30 * 60 * 1000

type SessionUser = { id: string; email?: string | null; created_at?: string }

export function isFreshSignup(user: Pick<SessionUser, "created_at">, now = Date.now()) {
  if (!user.created_at) return false
  const created = Date.parse(user.created_at)
  if (Number.isNaN(created)) return false
  return now - created < FRESH_SIGNUP_WINDOW_MS
}

/**
 * 사용자가 확인한 약관 slug 목록. 조회에 실패하면(패치 미적용 등) 전부 확인한 것으로 본다 —
 * 약관 게이트가 로그인 자체를 막아 버리면 안 되기 때문이다.
 */
export const listAcceptedTerms = cache(async (userId: string): Promise<Set<TermsSlug> | null> => {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("terms_consents")
    .select("slug")
    .eq("user_id", userId)

  if (error) {
    console.error("[terms_consents] select failed", error)
    return null
  }
  return new Set((data ?? []).map((row) => (row as { slug: TermsSlug }).slug))
})

export async function hasAcceptedAllTerms(userId: string): Promise<boolean> {
  const accepted = await listAcceptedTerms(userId)
  if (accepted === null) return true
  return TERMS_SLUGS.every((slug) => accepted.has(slug))
}

/**
 * 로그인 직후·마이페이지 진입 시 약관 확인이 필요하면 그 경로를, 아니면 null 을 돌려준다.
 * 관리자는 약관을 쓰는 쪽이라 게이트를 적용하지 않는다 — 관리자 화면에서 본문을 등록·수정할 수 있어야 한다.
 */
export async function termsGatePath(user: SessionUser | null | undefined): Promise<string | null> {
  if (!user || isOwnerUser(user)) return null
  return (await hasAcceptedAllTerms(user.id)) ? null : TERMS_CONSENT_PATH
}

export async function recordTermsConsent(input: {
  userId: string
  versions: Record<TermsSlug, number>
  ipAddress: string | null
  userAgent: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const rows = TERMS_SLUGS.map((slug) => ({
    user_id: input.userId,
    slug,
    version: input.versions[slug],
    agreed_at: now,
    ip_address: input.ipAddress,
    user_agent: input.userAgent ? input.userAgent.slice(0, 300) : null,
  }))

  const { error } = await supabase.from("terms_consents").upsert(rows, { onConflict: "user_id,slug" })
  if (error) {
    console.error("[terms_consents] upsert failed", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
