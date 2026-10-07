import type { Metadata } from "next"
import { plainTextFromContent } from "@/lib/content"

export const SITE_NAME = "DevDeck"

/** 절대 URL의 기준 — OG 이미지·사이트맵·canonical이 모두 이걸 쓴다. */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  const raw = configured || (vercel ? `https://${vercel}` : "http://localhost:3000")
  return raw.replace(/\/$/, "")
}

/** 본문(HTML/마크다운)에서 공유 미리보기용 요약을 뽑는다. */
export function excerpt(content: string | null | undefined, max = 160) {
  const text = plainTextFromContent(content ?? "")
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** 상세·목록 페이지 공통 메타 — 탭 제목, canonical, OG/Twitter(이미지가 없으면 app/opengraph-image). */
export function pageMeta({
  title,
  description,
  path,
  image,
  noindex,
}: {
  title: string
  description?: string | null
  path: string
  image?: string | null
  noindex?: boolean
}): Metadata {
  const full = `${title} · ${SITE_NAME}`
  const desc = description?.trim() || undefined
  const cover = image ?? `${siteUrl()}/opengraph-image`
  const images = [{ url: cover }]
  return {
    title: full,
    description: desc,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: { title: full, description: desc, url: path, siteName: SITE_NAME, type: "article", images },
    twitter: { card: "summary_large_image", title: full, description: desc, images: [cover] },
  }
}

