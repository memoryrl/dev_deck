import type { Metadata, Viewport } from "next"
import { Inter, Public_Sans } from "next/font/google"
import { headers } from "next/headers"
import { Suspense } from "react"
import { I18nProvider } from "@/components/i18n/i18n-provider"
import { LanguageRouteSync } from "@/components/i18n/language-route-sync"
import { AosInit } from "@/components/layout/aos-init"
import { GoogleAnalytics } from "@/components/layout/google-analytics"
import { HashScrollFix } from "@/components/layout/hash-scroll-fix"
import { ScrollToTop } from "@/components/layout/scroll-to-top"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { VisitTracker } from "@/components/layout/visit-tracker"
import { ThemeRemoteLayer } from "@/components/theme/theme-remote-layer"
import { ThemeConfigProvider } from "@/components/theme/theme-config-provider"
import { LayerDialogHost } from "@/components/ui/layer-dialog"
import { getT } from "@/lib/i18n/dictionary"
import { isAnalyticsLocalHost, parseGaMeasurementId } from "@/lib/site/analytics"
import { siteUrl } from "@/lib/seo"
import { getSiteSettings } from "@/lib/site/settings"
import { canShowThemeRemote } from "@/lib/site/theme"
import { parseTheme } from "@/lib/site/theme-config"
import { cn } from "@/lib/utils"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
})
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["700", "800"],
  display: "swap",
  preload: false,
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  // 사이트 설정(/site/settings)의 이름·설명·키워드·소셜 이미지를 그대로 쓴다. 비어 있으면 번역 기본값/기본 OG 이미지.
  const settings = await getSiteSettings()
  const name = settings.siteName.trim() || "DevDeck"
  const description = settings.siteDescription.trim() || t("meta.description")
  const keywords = settings.siteKeywords.split(",").map((k) => k.trim()).filter(Boolean)
  const image = settings.socialImage.trim()
  return {
    metadataBase: new URL(siteUrl()),
    title: name,
    description,
    keywords: keywords.length ? keywords : undefined,
    // image가 없으면 이 필드를 빼서 app/opengraph-image(파일 규약)가 채우게 한다.
    openGraph: { title: name, description, siteName: name, type: "website", locale: "ko_KR", ...(image ? { images: [image] } : {}) },
    twitter: { card: "summary_large_image", title: name, description, ...(image ? { images: [image] } : {}) },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, dictionary } = await getT()
  const settings = await getSiteSettings()
  const headerList = await headers()
  const nonce = headerList.get("x-nonce") ?? undefined
  const theme = parseTheme(settings.themeConfig)
  const showThemeRemote = await canShowThemeRemote(settings.themeRemoteVisible)
  const gaId = parseGaMeasurementId(settings.googleAnalyticsId)
  const loadGa = Boolean(gaId) && !isAnalyticsLocalHost(headerList.get("host"))
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans", inter.variable, publicSans.variable)}>
        <ThemeProvider nonce={nonce} defaultTheme={theme.colorMode}>
          <ThemeConfigProvider initial={theme} nonce={nonce}>
          <I18nProvider locale={locale} dictionary={dictionary}>
            <a href="#main-content" className="skip-link">
              {t("common.skipToContent")}
            </a>
            <Suspense fallback={null}>
              <LanguageRouteSync />
            </Suspense>
            {children}
            <AosInit />
            {showThemeRemote ? <ThemeRemoteLayer /> : null}
            <ScrollToTop />
            <VisitTracker />
            <HashScrollFix />
            <LayerDialogHost />
            {loadGa && gaId ? <GoogleAnalytics measurementId={gaId} nonce={nonce} /> : null}
          </I18nProvider>
          </ThemeConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

