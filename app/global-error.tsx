"use client"

import { Inter, Public_Sans } from "next/font/google"
import { HttpErrorView } from "@/components/errors/http-error-view"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { t, type Messages } from "@/lib/i18n/t"
import { cn } from "@/lib/utils"
import ko from "@/locales/ko.json"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["700", "800"],
  display: "swap",
})

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const dictionary = ko as Messages
  const tx = (key: string, vars?: Record<string, string | number>) => t(dictionary, key, vars)

  return (
    <html lang="ko">
      <body className={cn("min-h-screen font-sans", inter.variable, publicSans.variable)}>
        <ThemeProvider>
          <div className="flex min-h-screen items-center">
            <HttpErrorView
              status={500}
              locale="ko"
              onRetry={reset}
              digest={error.digest}
              labels={{
                home: tx("errors.home"),
                goBack: tx("errors.goBack"),
                retry: tx("errors.retry"),
                login: tx("errors.login"),
                digest: tx("errors.digest"),
              }}
            />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
