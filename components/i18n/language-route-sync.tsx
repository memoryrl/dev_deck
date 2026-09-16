"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { applyAppLanguage } from "@/lib/i18n/apply-language"
import { normalizeAppLanguage } from "@/lib/i18n/config"
import { useI18n } from "@/components/i18n/i18n-provider"

export function LanguageRouteSync() {
  const { locale } = useI18n()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const urlLang = normalizeAppLanguage(searchParams.get("lang"))
    if (!urlLang || urlLang === locale) {
      applyAppLanguage(locale)
      return
    }
    applyAppLanguage(urlLang)
    router.refresh()
  }, [locale, pathname, router, searchParams])

  return null
}
