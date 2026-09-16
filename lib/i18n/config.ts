export const SUPPORTED_LOCALES = ["ko", "en"] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = "ko"
export const LANG_COOKIE = "lang"
export const LANG_STORAGE_KEY = "i18nextLng"
export const LANG_MAX_AGE = 60 * 60 * 24 * 365

export function normalizeAppLanguage(raw: string | null | undefined): AppLocale | null {
  if (raw == null || raw === "") return null
  const primary = String(raw).trim().toLowerCase().split(/[-_]/)[0]
  if (primary === "en") return "en"
  if (primary === "ko") return "ko"
  return null
}

export function detectBrowserAppLanguage(acceptLanguage?: string | null): AppLocale | null {
  if (!acceptLanguage) return null
  const candidates = acceptLanguage.split(",").map((part) => part.split(";")[0]?.trim())
  for (const raw of candidates) {
    const normalized = normalizeAppLanguage(raw)
    if (normalized) return normalized
  }
  return null
}

export function buildUrlWithLangParam(pathname: string, search: string, lang: AppLocale) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  params.set("lang", lang)
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
