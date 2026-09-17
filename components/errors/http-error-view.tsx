"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BrandMark } from "@/components/layout/brand-mark"
import { Button } from "@/components/ui/button"
import type { AppLocale } from "@/lib/i18n/config"
import { resolveHttpError } from "@/lib/http-errors"

export type HttpErrorViewLabels = {
  home: string
  goBack: string
  retry: string
  login: string
  digest: string
}

export function HttpErrorView({
  status,
  locale,
  labels,
  onRetry,
  digest,
  showBrand = true,
}: {
  status: number
  locale: AppLocale
  labels: HttpErrorViewLabels
  onRetry?: () => void
  digest?: string
  showBrand?: boolean
}) {
  const router = useRouter()
  const error = resolveHttpError(status, locale)
  const showLogin = status === 401
  const showRetry = Boolean(onRetry) || status >= 500

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-5 py-16 text-center">
      {showBrand ? (
        <Link href="/" className="mb-10">
          <BrandMark wordmarkClassName="text-lg" />
        </Link>
      ) : null}
      <p className="font-display text-7xl font-extrabold tracking-tight text-[hsl(var(--lux-cognac))] md:text-8xl">
        {error.status}
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {error.reason}
      </p>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{error.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">{error.lede}</p>
      {digest ? (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground/80">{labels.digest.replace("{{digest}}", digest)}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/">{labels.home}</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back()
              return
            }
            router.push("/")
          }}
        >
          {labels.goBack}
        </Button>
        {showLogin ? (
          <Button asChild variant="outline">
            <Link href="/login">{labels.login}</Link>
          </Button>
        ) : null}
        {showRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onRetry) {
                onRetry()
                return
              }
              router.refresh()
            }}
          >
            {labels.retry}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
