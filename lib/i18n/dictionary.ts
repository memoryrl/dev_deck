import { cookies, headers } from "next/headers"
import { cache } from "react"
import {
  DEFAULT_LOCALE,
  detectBrowserAppLanguage,
  LANG_COOKIE,
  normalizeAppLanguage,
  type AppLocale,
} from "@/lib/i18n/config"
import { t, type Messages } from "@/lib/i18n/t"
import en from "@/locales/en.json"
import ko from "@/locales/ko.json"

const DICTIONARIES: Record<AppLocale, Messages> = {
  ko: ko as Messages,
  en: en as Messages,
}

export const getRequestLocale = cache(async (): Promise<AppLocale> => {
  const fromCookie = normalizeAppLanguage((await cookies()).get(LANG_COOKIE)?.value)
  if (fromCookie) return fromCookie
  return detectBrowserAppLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE
})

export function getDictionary(locale: AppLocale) {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}

export const getT = cache(async (locale?: AppLocale) => {
  const resolved = locale ?? (await getRequestLocale())
  const dictionary = getDictionary(resolved)
  return {
    locale: resolved,
    dictionary,
    t: (key: string, vars?: Record<string, string | number>) => t(dictionary, key, vars),
  }
})
