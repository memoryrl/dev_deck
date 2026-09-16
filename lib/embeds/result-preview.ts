import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"

export type ResultEmbed = {
  src: string
  sourceUrl: string
}

type StAssets = {
  bundle: string | null
  preview: string | null
}

const URL_IN_HREF_RE = /(?:href|src)=["'](https?:\/\/[^"']+)["']/i
const BARE_URL_RE = /https?:\/\/[^\s<>"']+/i
const IMG_SRC_RE = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i
const BUNDLE_RE = /https:\/\/cdn\.21st\.dev\/[^"'\\\s>]+\/bundle\.[^"'\\\s>]+\.html/i
const PREVIEW_RE = /https:\/\/cdn\.21st\.dev\/[^"'\\\s>]+\/preview\.[^"'\\\s>]+\.(?:png|jpe?g|webp)/i

function firstHttpUrl(html: string): string | null {
  const href = html.match(URL_IN_HREF_RE)?.[1]
  if (href) return decodeHtmlEntities(href)
  const bare = html.match(BARE_URL_RE)?.[0]
  return bare ? decodeHtmlEntities(bare.replace(/[),.;]+$/, "")) : null
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

function hostOf(url: URL) {
  return url.hostname.replace(/^www\./, "").toLowerCase()
}

/** 21st.dev 검색 홈 `?preview=/@user/components/slug` 또는 컴포넌트 경로 */
function parse21stComponent(url: URL): { user: string; slug: string } | null {
  if (hostOf(url) !== "21st.dev") return null

  const preview = url.searchParams.get("preview")
  const fromPreview = preview?.match(/@([^/]+)\/components\/([^/?#]+)/)
  if (fromPreview) return { user: fromPreview[1], slug: fromPreview[2] }

  const fromPath = url.pathname.match(/^\/@([^/]+)\/components\/([^/]+)\/?$/)
  if (fromPath) return { user: fromPath[1], slug: fromPath[2] }

  return null
}

function isDirectEmbed(url: URL) {
  const host = hostOf(url)
  if (host === "cdn.21st.dev" && /\/bundle\.[^/]+\.html$/i.test(url.pathname)) return true
  if (host === "my.spline.design") return true
  return false
}

function resizedCdnImage(url: string, width: number) {
  if (!url.startsWith("https://cdn.21st.dev/") || url.includes("/cdn-cgi/image/")) return url
  return `https://cdn.21st.dev/cdn-cgi/image/fit=scale-down,width=${width},quality=75,format=webp/${url}`
}

async function fetch21stAssets(user: string, slug: string): Promise<StAssets> {
  return withMemoryCache(memoryKey.previewEmbed(`21st-assets:${user}/${slug}`), MEMORY_TTL.previewEmbed, async () => {
    const page = `https://21st.dev/@${encodeURIComponent(user)}/components/${encodeURIComponent(slug)}`
    try {
      const response = await fetch(page, {
        headers: { "User-Agent": "Mozilla/5.0 DevDeckPreview" },
        next: { revalidate: 1800 },
      })
      if (!response.ok) return { bundle: null, preview: null }
      const html = (await response.text()).replace(/\\\//g, "/")
      return {
        bundle: html.match(BUNDLE_RE)?.[0] ?? null,
        preview: html.match(PREVIEW_RE)?.[0] ?? null,
      }
    } catch {
      return { bundle: null, preview: null }
    }
  })
}

export async function resolveResultEmbed(html: string): Promise<ResultEmbed | null> {
  const raw = firstHttpUrl(html)
  if (!raw) return null
  const url = parseUrl(raw)
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return null

  if (isDirectEmbed(url)) return { src: url.toString(), sourceUrl: url.toString() }

  const host = hostOf(url)
  if (host === "app.spline.design") return null

  const component = parse21stComponent(url)
  if (!component) return null

  const assets = await fetch21stAssets(component.user, component.slug)
  if (!assets.bundle) return null
  return {
    src: assets.bundle,
    sourceUrl: `https://21st.dev/@${component.user}/components/${component.slug}`,
  }
}

export async function resolvePromptThumbnail(html: string | null | undefined): Promise<string | null> {
  const source = html?.trim() ?? ""
  if (!source) return null

  const img = source.match(IMG_SRC_RE)?.[1]
  if (img) return decodeHtmlEntities(img)

  const raw = firstHttpUrl(source)
  if (!raw) return null
  const url = parseUrl(raw)
  if (!url) return null

  const component = parse21stComponent(url)
  if (component) {
    const assets = await fetch21stAssets(component.user, component.slug)
    if (assets.preview) return resizedCdnImage(assets.preview, 960)
    return `https://21st.dev/api/og/component/${encodeURIComponent(component.user)}/${encodeURIComponent(component.slug)}`
  }

  return null
}
