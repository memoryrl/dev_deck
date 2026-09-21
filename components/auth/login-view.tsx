"use client"

import { useI18n } from "@/components/i18n/i18n-provider"
import { LoginRobotBackdrop } from "@/components/auth/login-robot-backdrop"
import { LoginButtons } from "@/app/(auth)/login/login-buttons"

export function LoginView({ error }: { error?: string }) {
  const { t } = useI18n()

  return (
    <main className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col overflow-hidden">
      <LoginRobotBackdrop />

      {/* 참고(Chroma형): 좌측 카피·CTA, 우측~중앙에 캐릭터 히어로 */}
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-14 md:py-20">
        <div
          data-login-card
          className="pointer-events-auto w-full max-w-md space-y-7 rounded-2xl bg-[#fff8e8]/92 p-7 shadow-[0_24px_60px_-28px_rgba(26,21,18,0.45)] backdrop-blur-sm dark:bg-[#241c16]/88 dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] md:p-8"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b4f3a] dark:text-[#c4a574]">
              DevDeck
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[#1a1614] dark:text-[#f6f1e9] md:text-5xl">
              {t("auth.title")}
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-[#5c4a3a] dark:text-[#d7c4a6]">
              {t("auth.lede")}
            </p>
          </div>
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          <LoginButtons />
        </div>
      </div>
    </main>
  )
}
