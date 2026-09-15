// 07-uploads.md 4.1 참고. 클라이언트가 보내는 file.type/확장자는 조작 가능하므로
// 실제 바이트(매직 넘버)로 이미지 종류를 판별한다.

const SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF87a / GIF89a
]

function matches(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/** RIFF....WEBP 구조 확인 (앞 4바이트 RIFF, 8~11바이트 WEBP) */
function isWebp(bytes: Uint8Array) {
  const riff = [0x52, 0x49, 0x46, 0x46]
  const webp = [0x57, 0x45, 0x42, 0x50]
  return matches(bytes, riff, 0) && matches(bytes, webp, 8)
}

export function sniffImageMime(bytes: Uint8Array): string | null {
  if (isWebp(bytes)) return "image/webp"
  for (const signature of SIGNATURES) {
    if (matches(bytes, signature.bytes, signature.offset ?? 0)) return signature.mime
  }
  return null
}

export function extensionForMime(mime: string) {
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  if (mime === "image/gif") return "gif"
  return "bin"
}
