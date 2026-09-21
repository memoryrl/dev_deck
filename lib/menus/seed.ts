import { forgetMemoryCache, MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { ensureAdminMenus } from "@/lib/menus/admin"
import { inferMenuLabelKey } from "@/lib/menus/label"
import { labelsFromKey, mergeMenuLabels } from "@/lib/menus/labels-seed"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { AccessRole } from "@/lib/access"

type MenuSeed = {
  label: string
  labelKey: string
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
    labelKey: "mega.prompt.label",
    href: null,
    location: "header",
    view_role: "visitor",
    sort_order: 0,
    children: [
      { label: "AI 프롬프트 목록", labelKey: "mega.prompt.public", href: "/b/prompts", view_role: "visitor", sort_order: 0 },
      { label: "등록된 프롬프트 시상식", labelKey: "mega.prompt.top", href: "/b/prompts/top", view_role: "visitor", sort_order: 10 },
      { label: "프롬프트 관리", labelKey: "mega.prompt.manage", href: "/promptkit", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "커리어로그",
    labelKey: "mega.career.label",
    href: null,
    location: "header",
    view_role: "visitor",
    sort_order: 10,
    children: [
      { label: "그동안의 업무내용", labelKey: "mega.career.all", href: "/work", view_role: "visitor", sort_order: 0 },
      { label: "스킬", labelKey: "mega.career.skills", href: "/b/skills", view_role: "visitor", sort_order: 10 },
      { label: "등록된 스킬 시상식", labelKey: "mega.career.skillsTop", href: "/b/skills/top", view_role: "visitor", sort_order: 20 },
      { label: "글·스킬 관리", labelKey: "mega.career.manage", href: "/career", view_role: "owner", sort_order: 30 },
    ],
  },
  {
    label: "게임리뷰",
    labelKey: "mega.games.label",
    href: null,
    location: "header",
    view_role: "visitor",
    sort_order: 20,
    children: [
      { label: "게임 목록", labelKey: "mega.games.list", href: "/games", view_role: "visitor", sort_order: 0 },
      { label: "플레이한 게임 시상식", labelKey: "mega.games.featured", href: "/games/top", view_role: "visitor", sort_order: 10 },
      { label: "리뷰 관리", labelKey: "mega.games.manage", href: "/steam", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "커뮤니티",
    labelKey: "mega.community.label",
    href: null,
    location: "header",
    view_role: "visitor",
    sort_order: 30,
    children: [
      { label: "공지사항", labelKey: "mega.community.notice", href: "/b/notice", view_role: "visitor", sort_order: 0 },
      { label: "자유게시판", labelKey: "mega.community.free", href: "/b/free", view_role: "visitor", sort_order: 10 },
    ],
  },
  {
    label: "둘러보기",
    labelKey: "footer.browse",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 0,
    children: [
      { label: "홈", labelKey: "common.home", href: "/", view_role: "visitor", sort_order: 0 },
      { label: "커리어", labelKey: "footer.career", href: "/work", view_role: "visitor", sort_order: 10 },
      { label: "게임", labelKey: "footer.games", href: "/games", view_role: "visitor", sort_order: 20 },
    ],
  },
  {
    label: "PromptKit",
    labelKey: "nav.promptkit",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 10,
    children: [
      { label: "AI 프롬프트 목록", labelKey: "mega.prompt.public", href: "/b/prompts", view_role: "visitor", sort_order: 0 },
      { label: "등록된 프롬프트 시상식", labelKey: "mega.prompt.top", href: "/b/prompts/top", view_role: "visitor", sort_order: 10 },
      { label: "프롬프트 관리", labelKey: "mega.prompt.manage", href: "/promptkit", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "CareerLog",
    labelKey: "nav.career",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 20,
    children: [
      { label: "그동안의 업무내용", labelKey: "mega.career.all", href: "/work", view_role: "visitor", sort_order: 0 },
      { label: "스킬", labelKey: "mega.career.skills", href: "/b/skills", view_role: "visitor", sort_order: 10 },
      { label: "등록된 스킬 시상식", labelKey: "mega.career.skillsTop", href: "/b/skills/top", view_role: "visitor", sort_order: 20 },
      { label: "글·스킬 관리", labelKey: "mega.career.manage", href: "/career", view_role: "owner", sort_order: 30 },
    ],
  },
  {
    label: "Steam",
    labelKey: "steam.title",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 30,
    children: [
      { label: "게임 목록", labelKey: "mega.games.list", href: "/games", view_role: "visitor", sort_order: 0 },
      { label: "플레이한 게임 시상식", labelKey: "mega.games.featured", href: "/games/top", view_role: "visitor", sort_order: 10 },
      { label: "리뷰 관리", labelKey: "mega.games.manage", href: "/steam", view_role: "owner", sort_order: 20 },
    ],
  },
  {
    label: "커뮤니티",
    labelKey: "mega.community.label",
    href: null,
    location: "footer",
    view_role: "visitor",
    sort_order: 40,
    children: [
      { label: "공지사항", labelKey: "mega.community.notice", href: "/b/notice", view_role: "visitor", sort_order: 0 },
      { label: "자유게시판", labelKey: "mega.community.free", href: "/b/free", view_role: "visitor", sort_order: 10 },
    ],
  },
]

async function backfillPublicMenuLabelKeys() {
  const supabase = await createClient()
  let { data, error } = await supabase
    .from("menus")
    .select("id, label, label_key, labels")
    .in("location", ["header", "footer", "admin"])
  if (error && /labels/.test(error.message)) {
    const retry = await supabase
      .from("menus")
      .select("id, label, label_key")
      .in("location", ["header", "footer", "admin"])
    data = retry.data as typeof data
    error = retry.error
  }
  if (error || !data) return

  let changed = false
  for (const row of data) {
    const key = row.label_key || inferMenuLabelKey(row.label) || null
    const nextLabels = mergeMenuLabels(row.labels, row.label, key)
    const needKey = !row.label_key && key
    const currentKo = (row.labels as { ko?: string } | null)?.ko
    const currentEn = (row.labels as { en?: string } | null)?.en
    const needLabels = currentKo !== nextLabels.ko || currentEn !== nextLabels.en
    if (!needKey && !needLabels) continue
    const patch: { label_key?: string; labels?: typeof nextLabels } = {}
    if (needKey && key) patch.label_key = key
    if (needLabels) patch.labels = nextLabels
    const { error: updateError } = await supabase.from("menus").update(patch).eq("id", row.id)
    if (!updateError) changed = true
  }
  if (changed) forgetMemoryCache("menus")
}

/**
 * menus 테이블이 비어 있을 때만 기본 메뉴를 채웁니다.
 * (관리자 세션 + menus_write RLS 필요)
 *
 * "이미 채워져 있나"는 메뉴 화면을 열 때마다 다시 물어볼 필요가 없다 — 한 번 rows가
 * 있는 걸 확인하면 그 결과를 잠깐 메모리에 남겨서, 메뉴 화면 재방문마다 DB 왕복 하나가
 * 그냥 사라지게 한다(체감 전환 지연의 일부였다).
 */
export async function ensureDefaultMenus() {
  if (!isSupabaseConfigured()) return { seeded: false as const, reason: "not_configured" as const }

  const alreadySeeded = await withMemoryCache(memoryKey.menusSeeded, MEMORY_TTL.menusSeeded, async () => {
    const supabase = await createClient()
    const { count, error } = await supabase.from("menus").select("*", { count: "exact", head: true })
    if (error) return false
    return (count ?? 0) > 0
  })
  if (alreadySeeded) {
    await backfillPublicMenuLabelKeys()
    const admin = await ensureAdminMenus()
    return { seeded: false as const, reason: "already_has_rows" as const, admin }
  }

  const supabase = await createClient()
  const { count, error: countError } = await supabase
    .from("menus")
    .select("*", { count: "exact", head: true })

  if (countError) return { seeded: false as const, reason: "count_failed" as const, error: countError.message }
  if ((count ?? 0) > 0) {
    await backfillPublicMenuLabelKeys()
    const admin = await ensureAdminMenus()
    return { seeded: false as const, reason: "already_has_rows" as const, admin }
  }

  for (const parent of DEFAULT_MENU_SEEDS) {
    const { data: parentRow, error: parentError } = await supabase
      .from("menus")
      .insert({
        label: parent.label,
        label_key: parent.labelKey,
        labels: labelsFromKey(parent.label, parent.labelKey),
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
        label_key: child.labelKey,
        labels: labelsFromKey(child.label, child.labelKey),
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
  const admin = await ensureAdminMenus()
  return { seeded: true as const, admin }
}
