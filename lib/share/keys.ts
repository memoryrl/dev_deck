import { randomBytes } from "crypto"

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** 공개 링크는 p, 초대 링크는 i로 시작한다 — 키만 보고 어느 테이블인지 알 수 있다. */
export function generateShareKey(kind: "public" | "invite") {
  const bytes = randomBytes(10)
  let body = ""
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length]
  return `${kind === "public" ? "p" : "i"}${body}`
}

export function isInviteKey(key: string) {
  return key.startsWith("i")
}

export function isValidShareKey(key: string) {
  return /^[pi][a-zA-Z0-9]{8,24}$/.test(key)
}
