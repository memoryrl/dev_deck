"use client"

import dynamic from "next/dynamic"
import { useI18n } from "@/components/i18n/i18n-provider"

function BackdropFallback() {
  const { t } = useI18n()
  return (
    <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--background))] text-sm text-muted-foreground">
      {t("landing.topologyLoading")}
    </div>
  )
}

const LoginRobotScene = dynamic(
  () => import("@/components/auth/login-robot-scene").then((mod) => mod.LoginRobotScene),
  {
    ssr: false,
    loading: () => <BackdropFallback />,
  }
)

export function LoginRobotBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <LoginRobotScene />
      {/* 카드 쪽(좌)만 가독성 페이드. 우측 로봇 얼굴은 거의 그대로 드러낸다. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background from-0% via-background/70 via-35% to-transparent to-62%" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/55 to-transparent" />
    </div>
  )
}
