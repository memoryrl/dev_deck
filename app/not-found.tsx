import type { Metadata } from "next"
import { HttpErrorView } from "@/components/errors/http-error-view"
import { getT } from "@/lib/i18n/dictionary"
import { resolveHttpError } from "@/lib/http-errors"

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getT()
  const error = resolveHttpError(404, locale)
  return {
    title: `404 · ${error.title} · DevDeck`,
    description: error.lede,
    robots: { index: false, follow: false },
  }
}

export default async function NotFound() {
  const { t, locale } = await getT()
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-1 items-center">
      <HttpErrorView
        status={404}
        locale={locale}
        labels={{
          home: t("errors.home"),
          goBack: t("errors.goBack"),
          retry: t("errors.retry"),
          login: t("errors.login"),
          digest: t("errors.digest"),
        }}
      />
    </div>
  )
}
