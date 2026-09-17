import { HttpErrorView } from "@/components/errors/http-error-view"
import { PublicContainer } from "@/components/layout/public-container"
import { getT } from "@/lib/i18n/dictionary"

export function HttpErrorPage({ status }: { status: number }) {
  const { t, locale } = getT()
  return (
    <PublicContainer className="flex flex-col justify-center py-8">
      <HttpErrorView
        status={status}
        locale={locale}
        showBrand={false}
        labels={{
          home: t("errors.home"),
          goBack: t("errors.goBack"),
          retry: t("errors.retry"),
          login: t("errors.login"),
          digest: t("errors.digest"),
        }}
      />
    </PublicContainer>
  )
}
