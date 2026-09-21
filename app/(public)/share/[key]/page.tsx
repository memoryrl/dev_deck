import type { Metadata } from "next"
import { cookies } from "next/headers"
import { ShareError } from "@/components/share/share-error"
import { SharePasswordForm } from "@/components/share/share-password-form"
import { SharedContent } from "@/components/share/shared-content"
import { ShareVisitBeacon } from "@/components/share/share-visit-beacon"
import { PublicContainer } from "@/components/layout/public-container"
import { isPasswordCookieValid, sharePasswordCookieName, shareVisitCookieName } from "@/lib/share/password"
import { resolveShareKey } from "@/lib/share/service"
import { loadTarget } from "@/lib/share/targets"
import { isSupabaseConfigured } from "@/lib/utils"

export const dynamic = "force-dynamic"

// 공유 링크는 검색에 잡히지 않아야 한다.
export const metadata: Metadata = {
  title: "DevDeck",
  robots: { index: false, follow: false },
}

export default async function SharePage({ params }: { params: { key: string } }) {
  const { key } = params

  return (
    <PublicContainer as="article">
      <ShareBody shareKey={key} />
    </PublicContainer>
  )
}

async function ShareBody({ shareKey }: { shareKey: string }) {
  if (!isSupabaseConfigured()) return <ShareError reason="forbidden" />

  const jar = cookies()
  const resolved = await resolveShareKey(shareKey, { alreadyVisited: jar.has(shareVisitCookieName(shareKey)) })
  if (resolved.status !== "ok") return <ShareError reason={resolved.status} />

  const { link, invite } = resolved
  if (
    link.password_hash &&
    !isPasswordCookieValid(shareKey, link.password_hash, jar.get(sharePasswordCookieName(shareKey))?.value)
  ) {
    // 비밀번호를 맞히기 전에는 어떤 자료인지 제목조차 보여 주지 않는다.
    return <SharePasswordForm shareKey={shareKey} />
  }

  const target = await loadTarget(link.target_type, link.target_id)
  if (!target) return <ShareError reason="target_deleted" />

  return (
    <>
      <SharedContent target={target} expiresAt={link.period_limited ? link.expires_at : null} inviteName={invite?.recipient_name ?? null} />
      <ShareVisitBeacon shareKey={shareKey} />
    </>
  )
}
