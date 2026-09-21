import type { TermsSlug } from "@/types/terms"

// 로그인 화면의 "회원가입" 탭에서 약관 두 개에 체크한 뒤 Google 로 넘어가면, 돌아온 콜백이
// 이 쿠키를 보고 별도 약관 화면 없이 동의를 바로 기록한다. 쿠키에는 "어느 버전에 체크했는지"만 담는다.
export const SIGNUP_CONSENT_COOKIE = "devdeck_signup_consent"
/** Google 로그인을 마치고 돌아오는 데 넉넉한 시간 */
export const SIGNUP_CONSENT_MAX_AGE_SECONDS = 10 * 60

export type SignupConsentVersions = Record<TermsSlug, number>

export function serializeSignupConsent(versions: SignupConsentVersions) {
  return encodeURIComponent(JSON.stringify({ terms: versions.terms, privacy: versions.privacy }))
}

/** 쿠키 값을 검증해서 읽는다. 형식이 하나라도 어긋나면 null(=체크하지 않은 것으로 본다). */
export function parseSignupConsent(raw: string | null | undefined): SignupConsentVersions | null {
  if (!raw) return null
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
    const { terms, privacy } = value
    if (!Number.isInteger(terms) || !Number.isInteger(privacy)) return null
    if ((terms as number) < 0 || (privacy as number) < 0) return null
    return { terms: terms as number, privacy: privacy as number }
  } catch {
    return null
  }
}
