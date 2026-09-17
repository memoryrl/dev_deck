"use client"

import { HttpErrorView } from "@/components/errors/http-error-view"
import { useI18n } from "@/components/i18n/i18n-provider"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t, locale } = useI18n()
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center">
      <HttpErrorView
        status={500}
        locale={locale}
        onRetry={reset}
        digest={error.digest}
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
