"use client"

import { useI18n } from "@/components/i18n/i18n-provider"
import { LoginRobotBackdrop } from "@/components/auth/login-robot-backdrop"
import { LoginButtons } from "@/app/(public)/(auth)/login/login-buttons"

export function LoginView({ error }: { error?: string }) {
  const { t } = useI18n()

  return (
    <main className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col overflow-hidden">
      <LoginRobotBackdrop />

      {/* 모바일: 하단 카피. md+: 좌측 하단 카드, 캐릭터는 우측 */}
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-end px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 md:px-10 md:pb-20 md:pt-10">
        <div
          data-login-card
          className="pointer-events-auto w-full max-w-md space-y-5 rounded-2xl bg-[#fff8e8]/[0.06] p-6 shadow-[0_24px_60px_-28px_rgba(26,21,18,0.45)] ring-1 ring-[#6b4f3a]/10 backdrop-blur-md dark:bg-[#241c16]/[0.08] dark:ring-[#c4a574]/15 dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] md:space-y-7 md:p-8"
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
