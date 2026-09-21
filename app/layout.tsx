import type { Metadata, Viewport } from "next"
import { Inter, Public_Sans } from "next/font/google"
import { headers } from "next/headers"
import { Suspense } from "react"
import { I18nProvider } from "@/components/i18n/i18n-provider"
import { LanguageRouteSync } from "@/components/i18n/language-route-sync"
import { GoogleAnalytics } from "@/components/layout/google-analytics"
import { HashScrollFix } from "@/components/layout/hash-scroll-fix"
import { ScrollToTop } from "@/components/layout/scroll-to-top"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { VisitTracker } from "@/components/layout/visit-tracker"
import { LayerDialogHost } from "@/components/ui/layer-dialog"
import { getT } from "@/lib/i18n/dictionary"
import { isAnalyticsLocalHost, parseGaMeasurementId } from "@/lib/site/analytics"
import { getSiteSettings } from "@/lib/site/settings"
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
  return {
    title: "DevDeck",
    description: t("meta.description"),
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dictionary } = await getT()
  const settings = await getSiteSettings()
  const headerList = await headers()
  const nonce = headerList.get("x-nonce") ?? undefined
  const gaId = parseGaMeasurementId(settings.googleAnalyticsId)
  const loadGa = Boolean(gaId) && !isAnalyticsLocalHost(headerList.get("host"))
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans", inter.variable, publicSans.variable)}>
        <ThemeProvider nonce={nonce}>
          <I18nProvider locale={locale} dictionary={dictionary}>
            <Suspense fallback={null}>
              <LanguageRouteSync />
            </Suspense>
            {children}
            <ScrollToTop />
            <VisitTracker />
            <HashScrollFix />
            <LayerDialogHost />
            {loadGa && gaId ? <GoogleAnalytics measurementId={gaId} nonce={nonce} /> : null}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
