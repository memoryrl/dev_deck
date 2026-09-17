import { VISIT_WINDOW_MS } from "@/lib/auth/visit-window"
import { emptyPage, fetchPagedRows, ilikeContains, LIST_PAGE_SIZE, type PagedResult } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isSupabaseConfigured } from "@/lib/utils"
import type { LoginHistoryEntry, LoginHistoryEventType } from "@/types/login-history"

export type LoginHistorySearchField = "email" | "ip" | "region"

type RecordEntryInput = {
  eventType: LoginHistoryEventType
  userId: string | null
  email: string | null
  provider: string | null
  ipAddress: string
  ipRegion: string | null
  userAgent: string | null
}

// 공용 기록 함수 — event_type='login'은 OAuth 콜백(app/auth/callback/route.ts)에서
// 로그인한 본인 계정으로, event_type='visit'은 /api/track-visit에서 회원·비회원
// 구분 없이 호출한다. 두 경우 모두 기록 실패가 로그인/방문 자체를 막으면 안 되므로
// 호출부에서 항상 try/catch로 감싼다.
async function recordEntry(entry: RecordEntryInput) {
  if (!isSupabaseConfigured()) return
  const supabase = createClient()
  await supabase.from("login_history").insert({
    event_type: entry.eventType,
    user_id: entry.userId,
    email: entry.email,
    provider: entry.provider,
    ip_address: entry.ipAddress,
    ip_region: entry.ipRegion,
    user_agent: entry.userAgent,
  })
}

export function recordLoginHistory(entry: Omit<RecordEntryInput, "eventType" | "userId"> & { userId: string }) {
  return recordEntry({ ...entry, eventType: "login" })
}

export function recordVisitHistory(entry: Omit<RecordEntryInput, "eventType">) {
  return recordEntry({ ...entry, eventType: "visit" })
}

// 같은 브라우저·같은 계정(또는 비회원 IP)이 짧은 시간에 로그인+접속을 둘 다
// 남기거나, 추적 API가 두 번 불리는 경우를 걸러 낸다. SELECT는 관리자만
// 가능하므로 일반 방문자는 false가 되고, 그때는 쿠키/세션 가드가 담당한다.
export async function hasRecentSessionLog({
  userId,
  ipAddress,
}: {
  userId: string | null
  ipAddress: string
}) {
  if (!isSupabaseConfigured()) return false
  let supabase
  try {
    supabase = createServiceClient()
  } catch {
    supabase = createClient()
  }
  const since = new Date(Date.now() - VISIT_WINDOW_MS).toISOString()
  let query = supabase
    .from("login_history")
    .select("id")
    .eq("ip_address", ipAddress)
    .gte("created_at", since)
    .limit(1)
  query = userId ? query.eq("user_id", userId) : query.is("user_id", null)
  const { data, error } = await query
  if (error) return false
  return (data?.length ?? 0) > 0
}

export async function listLoginHistory({
  page = 1,
  eventType,
  q = "",
  field = "email",
}: {
  page?: number
  eventType?: LoginHistoryEventType
  q?: string
  field?: LoginHistorySearchField
} = {}): Promise<PagedResult<LoginHistoryEntry>> {
  if (!isSupabaseConfigured()) return emptyPage(page, LIST_PAGE_SIZE)
  const supabase = createClient()
  const needle = q.trim()
  const pattern = needle ? ilikeContains(needle) : ""

  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase.from("login_history").select("*", { count: "exact" })
    if (eventType) query = query.eq("event_type", eventType)
    if (pattern) {
      if (field === "ip") query = query.ilike("ip_address", pattern)
      else if (field === "region") query = query.ilike("ip_region", pattern)
      else query = query.ilike("email", pattern)
    }
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
    if (error) return null
    const rows = [...((data as LoginHistoryEntry[]) ?? [])].sort((a, b) => {
      const byTime = Date.parse(b.created_at) - Date.parse(a.created_at)
      if (byTime !== 0) return byTime
      return b.id.localeCompare(a.id)
    })
    return { rows, total: count ?? 0 }
  })
}
