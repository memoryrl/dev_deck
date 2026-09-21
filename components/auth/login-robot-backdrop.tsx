"use client"

import dynamic from "next/dynamic"

const LoginRobotScene = dynamic(
  () => import("@/components/auth/login-robot-scene").then((mod) => mod.LoginRobotScene),
  { ssr: false }
)

export function LoginRobotBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f6f1e9] dark:bg-[#12100e]">
      <LoginRobotScene />
    </div>
  )
}
