import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"

// 공유 링크 비밀번호는 scrypt 해시로만 저장한다. 원문은 링크를 만든 사람이 입력창에서 직접 전달한다.
export function hashSharePassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

export function verifySharePassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, "hex")
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// 비밀번호를 맞힌 방문자에게 주는 쿠키 값. 링크의 비밀번호 해시가 값에 섞여 있어서
// 비밀번호를 바꾸면 이전에 발급된 쿠키는 자동으로 무효가 된다.
function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error("share cookie secret is not configured")
  return value
}

export function sharePasswordCookieName(key: string) {
  return `share_pw_${key}`
}

export function signPasswordCookie(key: string, passwordHash: string, expiresAtMs: number) {
  const sig = createHmac("sha256", secret()).update(`${key}.${expiresAtMs}.${passwordHash}`).digest("hex")
  return `${expiresAtMs}.${sig}`
}

export function isPasswordCookieValid(key: string, passwordHash: string, cookie: string | undefined) {
  if (!cookie) return false
  const [expiresRaw, sig] = cookie.split(".")
  const expiresAtMs = Number(expiresRaw)
  if (!sig || !Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return false
  const expected = createHmac("sha256", secret()).update(`${key}.${expiresAtMs}.${passwordHash}`).digest("hex")
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

export const SHARE_PASSWORD_COOKIE_MS = 24 * 60 * 60 * 1000
export const SHARE_VISIT_COOKIE_MS = 30 * 60 * 1000

export function shareVisitCookieName(key: string) {
  return `share_seen_${key}`
}
