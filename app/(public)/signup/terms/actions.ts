"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isOwnerUser, postLoginPath } from "@/lib/auth/roles"
import { clientIpFromHeaders } from "@/lib/comments/ip"
import { createClient, getAuthUser } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isFreshSignup, recordTermsConsent } from "@/lib/terms/consent"
import { getTermsDocuments, TERMS_SLUGS } from "@/lib/terms/documents"
import { isSupabaseConfigured } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

export type AcceptTermsResult =
  | { ok: true; next: string }
  | { ok: false; error: "not_confirmed" | "not_configured" | "failed"; detail?: string }

/** 두 약관을 모두 확인했을 때만 동의를 기록하고, 이어서 갈 경로를 돌려준다. */
export async function acceptTerms(formData: FormData): Promise<AcceptTermsResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "not_configured" }

  const user = await getAuthUser()
  if (!user) redirect("/login")

  const confirmed = TERMS_SLUGS.every((slug) => formData.get(`confirm_${slug}`) === "on")
  if (!confirmed) return { ok: false, error: "not_confirmed" }

  const docs = await getTermsDocuments()
  const versions = Object.fromEntries(
    TERMS_SLUGS.map((slug) => [slug, docs[slug].version])
  ) as Record<TermsSlug, number>

  const result = await recordTermsConsent({
    userId: user.id,
    versions,
    ipAddress: clientIpFromHeaders(),
    userAgent: headers().get("user-agent"),
  })
  if (!result.ok) return { ok: false, error: "failed", detail: result.error }

  revalidatePath("/account")
  return { ok: true, next: postLoginPath(user) }
}

export type DeclineTermsResult = { ok: true; next: string; removed: boolean } | { ok: false; error: string }

/**
 * 약관에 동의하지 않음. 방금 만들어진 계정(첫 로그인)이면 가입을 취소한 것으로 보고 계정을
 * 지운다 — 동의 없이 회원이 되는 일이 없게. 오래된 계정이면 로그아웃만 한다.
 */
export async function declineTerms(): Promise<DeclineTermsResult> {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (isOwnerUser(user)) redirect("/site/dashboard")

  let removed = false
  if (isSupabaseConfigured() && isFreshSignup(user)) {
    try {
      const service = createServiceClient()
      // 가입 통계에도 남기지 않는다 — 약관을 거절한 로그인은 회원가입으로 치지 않는다.
      await service.from("member_events").delete().eq("user_id", user.id)
      const { error } = await service.auth.admin.deleteUser(user.id)
      if (error) return { ok: false, error: error.message }
      removed = true
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "decline_failed" }
    }
  }

  const supabase = createClient()
  await supabase.auth.signOut({ scope: "local" }).catch(() => {})
  revalidatePath("/", "layout")
  if (removed) revalidatePath("/site/members")
  return { ok: true, next: "/", removed }
}
