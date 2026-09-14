import type { Metadata } from "next"
import { Inter, Public_Sans } from "next/font/google"
import { ScrollToTop } from "@/components/layout/scroll-to-top"
import { ThemeProvider } from "@/components/layout/theme-provider"
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

export const metadata: Metadata = {
  title: "DevDeck",
  description: "PromptKit, CareerLog, Steam Tracker를 한곳에 모은 개인 포트폴리오 허브",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans", inter.variable, publicSans.variable)}>
        <ThemeProvider>
          {children}
          <ScrollToTop />
        </ThemeProvider>
      </body>
    </html>
  )
}
