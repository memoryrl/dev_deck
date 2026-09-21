import { LoginView } from "@/components/auth/login-view"
import type { SignupTermsDoc } from "@/components/auth/signup-terms-agreement"
import { RichContent } from "@/components/editor/rich-content"
import { getT } from "@/lib/i18n/dictionary"
import { getTermsDocuments, localizeTerms, TERMS_SLUGS } from "@/lib/terms/documents"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const { t, locale } = getT()

  // 회원가입 탭에서 체크·열람할 약관 본문. 화면 언어에 맞는 본문을 고르고, 영문이 없으면 한국어로 대체한다.
  const docs = await getTermsDocuments()
  const termsDocs: SignupTermsDoc[] = TERMS_SLUGS.map((slug) => {
    const localized = localizeTerms(docs[slug], locale)
    return {
      slug,
      title: localized.title,
      version: docs[slug].version,
      fallbackNotice: localized.translated ? null : t("terms.consent.fallbackKo"),
      body: <RichContent content={localized.content} className="text-sm" />,
    }
  })

  return (
    <LoginView
      error={searchParams.error}
      termsDocs={termsDocs}
    />
  )
}
