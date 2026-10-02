import { cookies } from "next/headers"
import { currentViewer } from "@/lib/boards/access"
import { isSupabaseAuthCookie } from "@/lib/supabase/auth-error"
import { createClient } from "@/lib/supabase/server"
import { getSiteSettings } from "@/lib/site/settings"
import { parseTheme, sanitizeTheme, type ThemeConfig } from "@/lib/site/theme-config"
import { isSupabaseConfigured } from "@/lib/utils"

// 루트 레이아웃이 이미 getSiteSettings(React cache)를 부르므로 추가 쿼리는 없다.
export async function getThemeConfig(): Promise<ThemeConfig> {
  return parseTheme((await getSiteSettings()).themeConfig)
}

export type ThemeHistoryEntry = {
  id: string
  savedAt: string
  savedBy: string
  note: string
  config: ThemeConfig
}

// 이력은 site_settings 의 'themeHistory' 키 하나에 JSON 배열(최신순)로 둔다 — 별도 테이블 없이
// 기존 RLS(읽기 공개·쓰기 소유자)를 그대로 쓴다. ponytail: 건수 상한 고정, 더 필요하면 전용 테이블로.
const HISTORY_KEY = "themeHistory"
const HISTORY_MAX = 30

function parseHistory(json: string | null | undefined): ThemeHistoryEntry[] {
  if (!json) return []
  try {
    const raw = JSON.parse(json)
    if (!Array.isArray(raw)) return []
    return raw.flatMap((item): ThemeHistoryEntry[] =>
      item && typeof item.id === "string" && typeof item.savedAt === "string"
        ? [{ id: item.id, savedAt: item.savedAt, savedBy: String(item.savedBy ?? ""), note: String(item.note ?? ""), config: sanitizeTheme(item.config) }]
        : []
    )
  } catch {
    return []
  }
}

export async function getThemeHistory(): Promise<ThemeHistoryEntry[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase.from("site_settings").select("value").eq("key", HISTORY_KEY).maybeSingle()
  return parseHistory((data as { value: string } | null)?.value)
}

export async function pushThemeHistory(entry: Omit<ThemeHistoryEntry, "id" | "savedAt">): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" }
  const next = [{ ...entry, id: crypto.randomUUID(), savedAt: new Date().toISOString() }, ...(await getThemeHistory())].slice(0, HISTORY_MAX)
  const supabase = await createClient()
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: HISTORY_KEY, value: JSON.stringify(next), updated_at: new Date().toISOString() }, { onConflict: "key" })
  return error ? { success: false, error: error.message } : { success: true }
}

// 원격 제어기 레이어는 "스위치 ON + 소유자 로그인"일 때만 뜬다. 스위치가 꺼져 있으면(기본) 아무 비용도 없고,
// 켜져 있어도 인증 쿠키가 없는 방문자는 Auth 왕복 없이 바로 제외한다.
export async function canShowThemeRemote(visible: boolean): Promise<boolean> {
  if (!visible) return false
  if (!(await cookies()).getAll().some((c) => isSupabaseAuthCookie(c.name))) return false
  return (await currentViewer()).isOwner
}
