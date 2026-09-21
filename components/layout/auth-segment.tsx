"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

type Active = "login" | "signup" | null

/**
 * 로그인 화면의 "로그인 | 회원가입" 탭과 같은 모양의 헤더용 전환 버튼.
 * 로그인 화면에서는 현재 모드가 선택된 상태로 보이고, 다른 화면에서는 둘 다 선택 없이 보인다.
 */
function Segment({
  active,
  size,
  onNavigate,
  className,
}: {
  active: Active
  size: "sm" | "block"
  onNavigate?: () => void
  className?: string
}) {
  const { t } = useI18n()
  const items = [
    { value: "login", href: "/login", label: t("common.login") },
    { value: "signup", href: "/login?mode=signup", label: t("common.signup") },
  ] as const

  return (
    <div
      className={cn(
        "grid grid-cols-2 rounded-full bg-[#6b4f3a]/10 p-1 text-sm font-semibold dark:bg-white/[0.06]",
        className
      )}
    >
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          onClick={onNavigate}
          aria-current={active === item.value ? "page" : undefined}
          className={cn(
            "rounded-full text-center transition-colors",
            size === "sm" ? "px-3.5 py-1" : "px-4 py-2.5",
            active === item.value
              ? "bg-[#fff8e8] text-[#1a1614] shadow-sm dark:bg-[#c4a574]"
              : "text-[#5c4a3a] hover:text-[#1a1614] dark:text-[#d7c4a6] dark:hover:text-white"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

function ActiveSegment(props: Omit<Parameters<typeof Segment>[0], "active">) {
  const pathname = usePathname()
  const mode = useSearchParams().get("mode")
  const active: Active = pathname === "/login" ? (mode === "signup" ? "signup" : "login") : null
  return <Segment {...props} active={active} />
}

export function AuthSegment(props: Omit<Parameters<typeof Segment>[0], "active">) {
  return (
    <Suspense fallback={<Segment {...props} active={null} />}>
      <ActiveSegment {...props} />
    </Suspense>
  )
}
