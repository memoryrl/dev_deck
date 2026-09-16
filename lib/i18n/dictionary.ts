import { cookies, headers } from "next/headers"
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

export function getRequestLocale(): AppLocale {
  const fromCookie = normalizeAppLanguage(cookies().get(LANG_COOKIE)?.value)
  if (fromCookie) return fromCookie
  return detectBrowserAppLanguage(headers().get("accept-language")) ?? DEFAULT_LOCALE
}

export function getDictionary(locale: AppLocale = getRequestLocale()) {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}

export function getT(locale: AppLocale = getRequestLocale()) {
  const dictionary = getDictionary(locale)
  return {
    locale,
    dictionary,
    t: (key: string, vars?: Record<string, string | number>) => t(dictionary, key, vars),
  }
}
