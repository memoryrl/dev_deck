"use client"

import dynamic from "next/dynamic"

const LoginRobotScene = dynamic(
  () => import("@/components/auth/login-robot-scene").then((mod) => mod.LoginRobotScene),
  { ssr: false }
)

export function LoginRobotBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f3ead9] dark:bg-[#1d1a17]">
      <LoginRobotScene />
    </div>
  )
}
