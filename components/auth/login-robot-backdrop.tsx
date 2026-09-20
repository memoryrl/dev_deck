"use client"

import dynamic from "next/dynamic"

const LoginRobotScene = dynamic(
  () => import("@/components/auth/login-robot-scene").then((mod) => mod.LoginRobotScene),
  { ssr: false }
)

export function LoginRobotBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e0b34a] dark:bg-[#1a1512]" aria-hidden>
      <LoginRobotScene />
    </div>
  )
}
