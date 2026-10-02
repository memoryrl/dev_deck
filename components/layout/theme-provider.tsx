"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  nonce,
  defaultTheme = "light",
}: {
  children: React.ReactNode
  nonce?: string
  /** 테마 설정의 기본 색상 모드 — 방문자가 직접 고른 값(localStorage)이 있으면 그쪽이 우선한다 */
  defaultTheme?: "light" | "dark" | "system"
}) {
  return (
    <NextThemesProvider attribute="class" defaultTheme={defaultTheme} enableSystem={defaultTheme === "system"} nonce={nonce}>
      {children}
    </NextThemesProvider>
  )
}
