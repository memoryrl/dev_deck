import type { Metadata, Viewport } from "next"
import { Inter, Public_Sans } from "next/font/google"
import { Suspense } from "react"
import { I18nProvider } from "@/components/i18n/i18n-provider"
import { LanguageRouteSync } from "@/components/i18n/language-route-sync"
import { ScrollToTop } from "@/components/layout/scroll-to-top"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { VisitTracker } from "@/components/layout/visit-tracker"
import { getT } from "@/lib/i18n/dictionary"
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
  const { t } = getT()
  return {
    title: "DevDeck",
    description: t("meta.description"),
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dictionary } = getT()
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans", inter.variable, publicSans.variable)}>
        <ThemeProvider>
          <I18nProvider locale={locale} dictionary={dictionary}>
            <Suspense fallback={null}>
              <LanguageRouteSync />
            </Suspense>
            {children}
            <ScrollToTop />
            <VisitTracker />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
