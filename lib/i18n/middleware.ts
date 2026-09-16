import { type NextRequest, NextResponse } from "next/server"
import {
  DEFAULT_LOCALE,
  detectBrowserAppLanguage,
  LANG_COOKIE,
  LANG_MAX_AGE,
  normalizeAppLanguage,
} from "@/lib/i18n/config"

export function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  const fromQuery = normalizeAppLanguage(request.nextUrl.searchParams.get("lang"))
  const fromCookie = normalizeAppLanguage(request.cookies.get(LANG_COOKIE)?.value)
  const fromHeader = detectBrowserAppLanguage(request.headers.get("accept-language"))
  const locale = fromQuery ?? fromCookie ?? fromHeader ?? DEFAULT_LOCALE
  if (fromCookie !== locale) {
    response.cookies.set(LANG_COOKIE, locale, {
      path: "/",
      maxAge: LANG_MAX_AGE,
      sameSite: "lax",
    })
  }
  return response
}
