import { forgetMemoryCache } from "@/lib/cache/memory"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { AccessRole } from "@/lib/access"

type MenuSeed = {
  label: string
  href: string | null
  location: "header" | "footer"
  view_role: AccessRole
  sort_order: number
  children?: Omit<MenuSeed, "location" | "children">[]
}

/** 현재 코드의 기본 헤더 메가메뉴 + 푸터 컬럼을 DB 메뉴로 이식 */
const DEFAULT_MENU_SEEDS: MenuSeed[] = [
  {
    label: "AI Prompt",
    href: null,
    location: "header",
    view_role: "visitor",
    sort_order: 0,
    children: [
      { label: "공개 프롬프트", href: "/#prompts", view_role: "visitor", sort_order: 0 },
      { label: "허브 홈", href: "/", view_role: "visitor", sort_order: 10 },
      { label: "프롬프트 관리", href: "/promptkit", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "커리어로그",
    href: null,
    location: "header",
    view_role: "visitor",
    sort_order: 10,
    children: [
      { label: "전체 글", href: "/work", view_role: "visitor", sort_order: 0 },
      { label: "최근 커리어", href: "/#career", view_role: "visitor", sort_order: 10 },
      { label: "스킬", href: "/#skills", view_role: "visitor", sort_order: 20 },
      { label: "글·스킬 관리", href: "/career", view_role: "owner", sort_order: 30 },
    ],
  },
  {
    label: "게임리뷰",
    href: null,
    location: "header",
    view_role: "visitor",
    sort_order: 20,
    children: [
      { label: "게임 목록", href: "/games", view_role: "visitor", sort_order: 0 },
      { label: "추천 게임", href: "/#games", view_role: "visitor", sort_order: 10 },
      { label: "리뷰 관리", href: "/steam", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "둘러보기",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 0,
    children: [
      { label: "홈", href: "/", view_role: "visitor", sort_order: 0 },
      { label: "커리어", href: "/work", view_role: "visitor", sort_order: 10 },
      { label: "게임", href: "/games", view_role: "visitor", sort_order: 20 },
    ],
  },
  {
    label: "PromptKit",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 10,
    children: [
      { label: "대시보드", href: "/login", view_role: "visitor", sort_order: 0 },
      { label: "공개 프롬프트", href: "/", view_role: "visitor", sort_order: 10 },
      { label: "프롬프트 관리", href: "/promptkit", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "CareerLog",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 20,
    children: [
      { label: "게시판", href: "/work", view_role: "visitor", sort_order: 0 },
      { label: "스킬", href: "/work", view_role: "visitor", sort_order: 10 },
      { label: "글·스킬 관리", href: "/career", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "Steam",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 30,
    children: [
      { label: "라이브러리", href: "/games", view_role: "visitor", sort_order: 0 },
      { label: "리뷰", href: "/games", view_role: "visitor", sort_order: 10 },
      { label: "리뷰 관리", href: "/steam", view_role: "owner", sort_order: 20 },
    ],
  },
]

/**
 * menus 테이블이 비어 있을 때만 기본 메뉴를 채웁니다.
 * (관리자 세션 + menus_write RLS 필요)
 */
export async function ensureDefaultMenus() {
  if (!isSupabaseConfigured()) return { seeded: false as const, reason: "not_configured" as const }

  const supabase = createClient()
  const { count, error: countError } = await supabase
    .from("menus")
    .select("*", { count: "exact", head: true })

  if (countError) return { seeded: false as const, reason: "count_failed" as const, error: countError.message }
  if ((count ?? 0) > 0) return { seeded: false as const, reason: "already_has_rows" as const }

  for (const parent of DEFAULT_MENU_SEEDS) {
    const { data: parentRow, error: parentError } = await supabase
      .from("menus")
      .insert({
        label: parent.label,
        href: parent.href,
        location: parent.location,
        view_role: parent.view_role,
        is_active: true,
        sort_order: parent.sort_order,
        parent_id: null,
        board_id: null,
      })
      .select("id")
      .single()

    if (parentError || !parentRow?.id) {
      return {
        seeded: false as const,
        reason: "insert_failed" as const,
        error: parentError?.message ?? "parent insert failed",
      }
    }

    const children = parent.children ?? []
    if (children.length === 0) continue

    const { error: childError } = await supabase.from("menus").insert(
      children.map((child) => ({
        label: child.label,
        href: child.href,
        location: parent.location,
        view_role: child.view_role,
        is_active: true,
        sort_order: child.sort_order,
        parent_id: parentRow.id,
        board_id: null,
      }))
    )

    if (childError) {
      return { seeded: false as const, reason: "insert_failed" as const, error: childError.message }
    }
  }

  forgetMemoryCache("menus")
  return { seeded: true as const }
}
