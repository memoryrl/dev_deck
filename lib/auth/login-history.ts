import { VISIT_WINDOW_MS } from "@/lib/auth/visit-window"
import { emptyPage, fetchPagedRows, ilikeContains, LIST_PAGE_SIZE, type PagedResult } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isSupabaseConfigured } from "@/lib/utils"
import type { LoginHistoryEntry, LoginHistoryEventType, PageViewEntry } from "@/types/login-history"

export type LoginHistorySearchField = "email" | "ip" | "region"

// INSERT 직후 .select()로 방금 넣은 행의 id를 읽어오는데, login_history/page_views의
// SELECT RLS는 관리자만 허용한다 — 익명 방문자가 넣은 자기 행을 스스로 못 읽어서
// RETURNING이 비어버린다(insert 자체는 성공해도 dd_visit_id를 못 돌려받는 버그였다).
// 서버 전용 트러스티드 코드이므로 서비스 롤로 우회한다.
function trustedClient() {
  try {
    return createServiceClient()
  } catch {
    return createClient()
  }
}

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
// 호출부에서 항상 try/catch로 감싼다. 삽입된 행의 id를 돌려준다 — 이 id가 곧
// 세션 식별자라 호출부가 dd_visit_id 쿠키에 담아 page_views와 잇는다.
async function recordEntry(entry: RecordEntryInput): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = trustedClient()
  const { data, error } = await supabase
    .from("login_history")
    .insert({
      event_type: entry.eventType,
      user_id: entry.userId,
      email: entry.email,
      provider: entry.provider,
      ip_address: entry.ipAddress,
      ip_region: entry.ipRegion,
      user_agent: entry.userAgent,
    })
    .select("id")
    .single()
  if (error) return null
  return (data as { id: string }).id
}

export function recordLoginHistory(entry: Omit<RecordEntryInput, "eventType" | "userId"> & { userId: string }) {
  return recordEntry({ ...entry, eventType: "login" })
}

export function recordVisitHistory(entry: Omit<RecordEntryInput, "eventType">) {
  return recordEntry({ ...entry, eventType: "visit" })
}

// 페이지 이동 한 번 = 한 줄. 지역 조회 없이 순수 insert만 하므로 가볍다
// (docs/10-login-history.md 3.1절 — 성능 근거).
export async function recordPageView(entry: { visitId: string; path: string }) {
  if (!isSupabaseConfigured()) return
  const supabase = trustedClient()
  await supabase.from("page_views").insert({ visit_id: entry.visitId, path: entry.path.slice(0, 500) })
}

// 같은 브라우저·같은 계정(또는 비회원 IP)이 짧은 시간에 로그인+접속을 둘 다
// 남기거나, 추적 API가 두 번 불리는 경우를 걸러 낸다. 찾은 세션의 id를 돌려줘서
// 호출부가 그 세션에 이어서 페이지뷰를 기록할 수 있게 한다. SELECT는 관리자만
// 가능하므로 서비스 롤 클라이언트로 조회한다(일반 방문자 세션에서도 중복 판정이
// 되어야 하므로).
export async function findRecentSessionId({
  userId,
  ipAddress,
}: {
  userId: string | null
  ipAddress: string
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = trustedClient()
  const since = new Date(Date.now() - VISIT_WINDOW_MS).toISOString()
  let query = supabase
    .from("login_history")
    .select("id")
    .eq("ip_address", ipAddress)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
  query = userId ? query.eq("user_id", userId) : query.is("user_id", null)
  const { data, error } = await query
  if (error || !data || data.length === 0) return null
  return (data[0] as { id: string }).id
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

// 목록에 보여줄 "페이지 N건" 배지용 — visit_id별 개수를 한 번의 쿼리로 묶어서
// 가져온다(행마다 따로 COUNT 하는 N+1 쿼리를 피한다).
export async function countPageViewsByVisit(visitIds: string[]): Promise<Record<string, number>> {
  if (!isSupabaseConfigured() || visitIds.length === 0) return {}
  const supabase = createClient()
  const { data, error } = await supabase.from("page_views").select("visit_id").in("visit_id", visitIds)
  if (error) return {}
  const counts: Record<string, number> = {}
  for (const row of (data as { visit_id: string }[]) ?? []) {
    counts[row.visit_id] = (counts[row.visit_id] ?? 0) + 1
  }
  return counts
}

// 행을 펼쳤을 때만 부른다(app/(dashboard)/site/login-history/actions.ts의
// Server Action) — 목록을 그릴 때 모든 세션의 상세를 미리 가져오지 않는다.
export async function listPageViews(visitId: string): Promise<PageViewEntry[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("page_views")
    .select("*")
    .eq("visit_id", visitId)
    .order("created_at", { ascending: true })
  if (error) return []
  return (data as PageViewEntry[]) ?? []
}

export type VisitStatsPeriod = "yearly" | "monthly" | "daily"

export type VisitStatsEntry = {
  label: string
  count: number
}

export async function getVisitStats(period: VisitStatsPeriod): Promise<VisitStatsEntry[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()

  const now = new Date()
  let startDate: Date
  let dateFormat: (date: Date) => string
  let points: number

  switch (period) {
    case "yearly":
      startDate = new Date(now.getFullYear() - 4, 0, 1)
      dateFormat = (d) => `${d.getFullYear()}년`
      points = 5
      break
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      dateFormat = (d) => `${d.getMonth() + 1}월`
      points = 12
      break
    case "daily":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      dateFormat = (d) => `${d.getMonth() + 1}/${d.getDate()}`
      points = 30
      break
  }

  const { data, error } = await supabase
    .from("login_history")
    .select("created_at")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true })

  if (error) return []

  const rows = (data as { created_at: string }[]) ?? []
  const counts: Record<string, number> = {}

  for (const row of rows) {
    const date = new Date(row.created_at)
    let key: string

    switch (period) {
      case "yearly":
        key = `${date.getFullYear()}`
        break
      case "monthly":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        break
      case "daily":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        break
    }

    counts[key] = (counts[key] ?? 0) + 1
  }

  const result: VisitStatsEntry[] = []

  for (let i = 0; i < points; i++) {
    let pointDate: Date
    let key: string

    switch (period) {
      case "yearly":
        pointDate = new Date(now.getFullYear() - (points - 1 - i), 0, 1)
        key = `${pointDate.getFullYear()}`
        break
      case "monthly":
        pointDate = new Date(now.getFullYear(), now.getMonth() - (points - 1 - i), 1)
        key = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, "0")}`
        break
      case "daily":
        pointDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (points - 1 - i))
        key = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, "0")}-${String(pointDate.getDate()).padStart(2, "0")}`
        break
    }

    result.push({
      label: dateFormat(pointDate),
      count: counts[key] ?? 0,
    })
  }

  return result
}
