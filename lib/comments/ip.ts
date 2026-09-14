import { headers } from "next/headers"

const COUNTRY_KO: Record<string, string> = {
  KR: "대한민국",
  US: "미국",
  JP: "일본",
  CN: "중국",
  TW: "대만",
  HK: "홍콩",
  SG: "싱가포르",
  GB: "영국",
  DE: "독일",
  FR: "프랑스",
  AU: "호주",
  CA: "캐나다",
  VN: "베트남",
  TH: "태국",
  ID: "인도네시아",
  PH: "필리핀",
  IN: "인도",
  RU: "러시아",
}

function isPrivateIp(ip: string) {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0" || ip === "::") return true
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.")) return true
  const m = ip.match(/^172\.(\d+)\./)
  if (m) {
    const n = Number(m[1])
    if (n >= 16 && n <= 31) return true
  }
  return false
}

export function clientIpFromHeaders() {
  const h = headers()
  const forwarded = h.get("x-forwarded-for")
  const raw =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    ""
  return raw || "0.0.0.0"
}

export async function resolveIpRegion(ip: string) {
  const h = headers()
  const city = decodeUri(h.get("x-vercel-ip-city"))
  const country = h.get("x-vercel-ip-country")?.trim().toUpperCase() ?? ""
  const vercelRegion = [city, countryName(country)].filter(Boolean).join(" · ")
  if (vercelRegion) return vercelRegion
  if (isPrivateIp(ip)) return "로컬"
  return lookupIpApi(ip)
}

function countryName(code: string) {
  if (!code) return ""
  return COUNTRY_KO[code] ?? code
}

function decodeUri(value: string | null) {
  if (!value) return ""
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function lookupIpApi(ip: string) {
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,countryCode`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return "알 수 없음"
    const data = (await res.json()) as {
      status?: string
      country?: string
      city?: string
      countryCode?: string
    }
    if (data.status !== "success") return "알 수 없음"
    const country = countryName(data.countryCode ?? "") || data.country || ""
    return [data.city, country].filter(Boolean).join(" · ") || "알 수 없음"
  } catch {
    return "알 수 없음"
  }
}
