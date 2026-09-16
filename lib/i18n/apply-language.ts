import {
  LANG_COOKIE,
  LANG_MAX_AGE,
  LANG_STORAGE_KEY,
  normalizeAppLanguage,
  type AppLocale,
} from "@/lib/i18n/config"

export function setLangCookie(lang: AppLocale) {
  if (typeof document === "undefined") return
  document.cookie = `${LANG_COOKIE}=${lang};path=/;max-age=${LANG_MAX_AGE};SameSite=Lax`
}

export function applyAppLanguage(lang: string) {
  const normalized = normalizeAppLanguage(lang) || "ko"
  try {
    localStorage.setItem(LANG_STORAGE_KEY, normalized)
  } catch {
    // private mode
  }
  setLangCookie(normalized)
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized
  }
  return normalized
}
