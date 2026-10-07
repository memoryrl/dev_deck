import type { Metadata } from "next"
import { plainTextFromContent } from "@/lib/content"
import { getSiteSettings } from "@/lib/site/settings"
import { getT } from "@/lib/i18n/dictionary"
import { resolveHttpError } from "@/lib/http-errors"

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
export async function pageMeta({
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
}): Promise<Metadata> {
  // 사이트 설정(이름·소셜 이미지)을 따른다. 설정 이미지가 없으면 app/opengraph-image가 기본 이미지.
  const settings = await getSiteSettings()
  const name = settings.siteName.trim() || SITE_NAME
  const full = `${title} · ${name}`
  const desc = description?.trim() || settings.siteDescription.trim() || undefined
  const cover = image ?? (settings.socialImage.trim() || `${siteUrl()}/opengraph-image`)
  const images = [{ url: cover }]
  return {
    title: full,
    description: desc,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: { title: full, description: desc, url: path, siteName: name, type: "article", images },
    twitter: { card: "summary_large_image", title: full, description: desc, images: [cover] },
  }
}


/** 페이지가 notFound()로 끝나는 경우 — 탭 제목도 404 페이지와 똑같이 맞춘다(안 그러면 "DevDeck"만 남는다). */
export async function notFoundMeta(): Promise<Metadata> {
  const { locale } = await getT()
  const error = resolveHttpError(404, locale)
  return { title: `404 · ${error.title} · ${SITE_NAME}`, description: error.lede, robots: { index: false, follow: false } }
}
