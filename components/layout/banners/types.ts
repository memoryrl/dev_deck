import type { ReactNode } from "react"
import type { BannerTeam } from "@/lib/menus/banner-team"
import type { BreadcrumbItem } from "@/lib/menus/breadcrumb"

// 제목 배너 스타일 컴포넌트들이 공유하는 props — 스타일을 추가할 땐 이 props만 받으면 된다.
export type BannerStyleProps = {
  title: string
  lede: string | null
  crumbs: BreadcrumbItem[]
  actions?: ReactNode
  /** 스타일 1이 쓰는 그라디언트 조합 클래스 */
  art: string
  className?: string
  /** 스타일 2 배경 이미지 경로 */
  image: string
  /** 스타일 3 로봇 회의실의 팀장·팀원 */
  team: BannerTeam
  /** 관리자(사이드바 레이아웃) 안인지 — 전체 폭 배경이 뚫고 나갈 기준이 달라진다 */
  admin: boolean
}
