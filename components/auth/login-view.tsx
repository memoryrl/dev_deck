"use client"

import { Card } from "@/components/ui/card"
import { useI18n } from "@/components/i18n/i18n-provider"
import { LoginRobotBackdrop } from "@/components/auth/login-robot-backdrop"
import { LoginButtons } from "@/app/(auth)/login/login-buttons"

export function LoginView({ error }: { error?: string }) {
  const { t } = useI18n()

  return (
    <main className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col overflow-hidden">
      <LoginRobotBackdrop />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-16 md:py-20">
        <Card className="w-full max-w-md space-y-6 border-border/70 bg-card/88 p-8 shadow-[0_28px_64px_-36px_hsl(20_13%_9%/0.45)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">DevDeck</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">{t("auth.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("auth.lede")}</p>
          </div>
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          <LoginButtons />
        </Card>
      </div>
    </main>
  )
}
