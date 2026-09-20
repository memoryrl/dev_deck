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
      {/* 카드 가독성용 좌→우 페이드. 로봇 얼굴은 우측~중앙에 두고 카피는 왼쪽. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/78 to-background/15 dark:from-background dark:via-background/82 dark:to-background/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/90 to-transparent" />
    </div>
  )
}
