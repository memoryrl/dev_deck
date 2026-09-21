import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { TermsConsentForm, type ConsentDocumentView } from "@/app/(public)/signup/terms/terms-consent-form"
import { RichContent } from "@/components/editor/rich-content"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { postLoginPath } from "@/lib/auth/roles"
import { getT } from "@/lib/i18n/dictionary"
import { getAuthUser } from "@/lib/supabase/server"
import { isFreshSignup, termsGatePath } from "@/lib/terms/consent"
import { getTermsDocuments, TERMS_SLUGS } from "@/lib/terms/documents"
import { isSupabaseConfigured } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getT()
  return {
    title: `${t("terms.consent.title")} · DevDeck`,
    description: t("terms.consent.description"),
    robots: { index: false, follow: false },
  }
}

export default async function SignupTermsPage() {
  if (!isSupabaseConfigured()) redirect("/login")

  const user = await getAuthUser()
  if (!user) redirect("/login")

  // 이미 두 약관을 확인한 회원(또는 관리자)은 여기 머물 이유가 없다.
  const gate = await termsGatePath(user)
  if (!gate) redirect(postLoginPath(user))

  const { t } = getT()
  const docs = await getTermsDocuments()
  const views: ConsentDocumentView[] = TERMS_SLUGS.map((slug) => ({
    slug,
    title: docs[slug].title,
    version: docs[slug].version,
    updatedAt: docs[slug].updated_at || null,
    body: <RichContent content={docs[slug].content} className="text-sm" />,
  }))

  return (
    <PublicContainer>
      <PageTitleBanner title={t("terms.consent.title")} description={t("terms.consent.description")} />
      <TermsConsentForm documents={views} email={user.email ?? null} fresh={isFreshSignup(user)} />
    </PublicContainer>
  )
}
