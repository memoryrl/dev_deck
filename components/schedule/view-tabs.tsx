import Link from "next/link"
import { cn } from "@/lib/utils"

// 날짜 정보가 있는 관리자 목록 화면의 공통 상단 탭: 캘린더(기본) / 전체목록. 탭은 주소(?view=list)로 구분한다.
export type DateView = "calendar" | "list"
export const parseDateView = (value: string | undefined): DateView => (value === "list" ? "list" : "calendar")

/** hash: 페이지 한가운데 섹션에 탭을 둘 때, 탭을 눌러도 그 섹션에서 스크롤이 시작되게 하는 앵커 id */
export function DateViewTabs({ basePath, view, hash }: { basePath: string; view: DateView; hash?: string }) {
  const anchor = hash ? `#${hash}` : ""
  const tabs = [
    { id: "calendar", label: "캘린더", href: `${basePath}${anchor}` },
    { id: "list", label: "전체목록", href: `${basePath}?view=list${anchor}` },
  ] as const
  return (
    <nav role="tablist" aria-label="보기 방식" className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          role="tab"
          aria-selected={view === tab.id}
          className={cn(
            "-mb-px border-b-2 px-5 py-2.5 text-sm font-semibold transition-colors",
            view === tab.id ? "border-[hsl(var(--lux-champagne))] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
