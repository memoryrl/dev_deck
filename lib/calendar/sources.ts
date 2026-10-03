import { commentTargetHref, commentTargetLabel } from "@/lib/comments/public"
import type { CommentTargetType } from "@/types/comment"
import { createServiceClient } from "@/lib/supabase/service"
import { isSupabaseConfigured } from "@/lib/utils"
import { isDateKey, kstDateKey, kstDayStartIso, kstNextDayStartIso } from "@/lib/calendar/kst"

// 관리자 목록 화면의 "캘린더" 탭이 쓰는 데이터 원천 레지스트리.
// 화면마다 따로 쿼리를 만들지 않고, 테이블·날짜 컬럼·항목 모양만 선언하면 하루별 건수와 하루 상세가 나온다.
// 서비스 롤로 읽으므로 호출하는 서버 액션(lib/calendar/actions.ts)이 먼저 소유자 확인을 해야 한다.

export type CalendarDayItem = {
  id: string
  /** ISO 시각 */
  time: string
  title: string
  subtitle?: string
  badge?: string
  href?: string
  meta?: string[]
}

export type CalendarSeries = { key: string; label: string; tone: "strong" | "soft" }
export type CalendarCount = { date: string; key: string; label: string; tone: "strong" | "soft"; count: number }

type Row = Record<string, unknown>
type Db = ReturnType<typeof createServiceClient>

type Source = {
  table: string
  dateColumn: string
  select: string
  /** 칩을 나누는 컬럼과 값별 표시. 없으면 한 종류("단일 시리즈")로 센다 */
  seriesColumn?: string
  series: Record<string, CalendarSeries> | CalendarSeries
  /** 화면이 "범위"를 가질 때(예: 특정 게시판) 걸 컬럼 */
  scopeColumn?: string
  toItems: (rows: Row[], db: Db) => Promise<CalendarDayItem[]> | CalendarDayItem[]
}

const str = (value: unknown) => (typeof value === "string" ? value : "")
const excerpt = (value: unknown, max = 90) => {
  const text = str(value).replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const TERMS_LABEL: Record<string, string> = { terms: "이용약관", privacy: "개인정보 처리방침" }

export const CALENDAR_SOURCES = {
  comments: {
    table: "comments",
    dateColumn: "created_at",
    select: "id, author_name, body, target_type, target_id, created_at",
    series: { key: "comment", label: "댓글", tone: "strong" },
    async toItems(rows, db) {
      // 게시판 댓글 링크는 board slug가 필요하다.
      const boardIds = rows.filter((r) => r.target_type === "board").map((r) => str(r.target_id))
      const slugs = new Map<string, string>()
      if (boardIds.length > 0) {
        const { data } = await db.from("board_posts").select("id, boards(slug)").in("id", boardIds)
        for (const p of (data ?? []) as unknown as { id: string; boards: { slug: string } | null }[]) {
          if (p.boards?.slug) slugs.set(p.id, p.boards.slug)
        }
      }
      return rows.map((r) => ({
        id: str(r.id),
        time: str(r.created_at),
        title: str(r.author_name).trim() || "이름 없음",
        subtitle: excerpt(r.body),
        badge: commentTargetLabel(str(r.target_type) as CommentTargetType),
        href: commentTargetHref(str(r.target_type) as CommentTargetType, str(r.target_id), slugs.get(str(r.target_id))),
      }))
    },
  },
  loginHistory: {
    table: "login_history",
    dateColumn: "created_at",
    select: "id, event_type, email, ip_region, created_at",
    seriesColumn: "event_type",
    series: { login: { key: "login", label: "로그인", tone: "strong" }, visit: { key: "visit", label: "접속", tone: "soft" } },
    toItems: (rows) =>
      rows.map((r) => ({
        id: `visit-${str(r.id)}`,
        time: str(r.created_at),
        title: r.event_type === "login" ? "로그인" : "사이트 접속",
        subtitle: str(r.email) || str(r.ip_region) || "익명",
        badge: "접속",
      })),
  },
  health: {
    table: "supabase_health_checks",
    dateColumn: "checked_at",
    select: "id, checked_at, ok, duration_ms, auth_ok, auth_status, db_ok, error_message",
    seriesColumn: "ok",
    series: { true: { key: "ok", label: "정상", tone: "soft" }, false: { key: "fail", label: "장애", tone: "strong" } },
    toItems: (rows) =>
      rows.map((r) => ({
        id: str(r.id),
        time: str(r.checked_at),
        title: r.ok ? "시스템 정상" : "장애 감지",
        subtitle: r.duration_ms != null ? `응답 ${String(r.duration_ms)}ms` : undefined,
        badge: r.ok ? "정상" : "장애",
        meta: [
          `Auth ${r.auth_ok ? "정상" : r.auth_ok === false ? "오류" : "-"}${r.auth_status ? ` (${String(r.auth_status)})` : ""}`,
          `DB ${r.db_ok ? "정상" : r.db_ok === false ? "오류" : "-"}`,
          ...(str(r.error_message) ? [str(r.error_message)] : []),
        ],
      })),
  },
  members: {
    table: "member_events",
    dateColumn: "created_at",
    select: "id, event_type, user_id, created_at",
    seriesColumn: "event_type",
    series: { signup: { key: "signup", label: "가입", tone: "strong" }, withdraw: { key: "withdraw", label: "탈퇴", tone: "soft" } },
    async toItems(rows, db) {
      const ids = [...new Set(rows.map((r) => str(r.user_id)).filter(Boolean))]
      const names = new Map<string, string>()
      if (ids.length > 0) {
        const { data } = await db.from("profiles").select("id, full_name, username").in("id", ids)
        for (const p of (data ?? []) as { id: string; full_name: string | null; username: string | null }[]) {
          names.set(p.id, p.full_name || p.username || "회원")
        }
      }
      return rows.map((r) => ({
        id: str(r.id),
        time: str(r.created_at),
        title: names.get(str(r.user_id)) ?? (r.event_type === "withdraw" ? "탈퇴한 회원" : "회원"),
        badge: r.event_type === "withdraw" ? "탈퇴" : "가입",
        href: r.event_type === "withdraw" ? undefined : "/site/members",
      }))
    },
  },
  shares: {
    table: "share_links",
    dateColumn: "created_at",
    select: "id, key, link_type, target_type, title, created_at, expires_at, period_limited, deleted_at",
    series: { key: "share", label: "공유 생성", tone: "strong" },
    toItems: (rows) =>
      rows.map((r) => ({
        id: str(r.id),
        time: str(r.created_at),
        title: str(r.title),
        subtitle: r.link_type === "invite" ? "초대 링크" : "공개 링크",
        badge: r.deleted_at ? "삭제됨" : undefined,
        href: r.link_type === "public" && !r.deleted_at ? `/share/${str(r.key)}` : undefined,
        meta: r.period_limited && r.expires_at ? [`만료 ${kstDateKey(str(r.expires_at))}`] : undefined,
      })),
  },
  terms: {
    table: "terms_revisions",
    dateColumn: "created_at",
    select: "id, slug, version, title, note, edited_by_email, created_at",
    series: { key: "terms", label: "약관 수정", tone: "strong" },
    toItems: (rows) =>
      rows.map((r) => ({
        id: str(r.id),
        time: str(r.created_at),
        title: `${str(r.title)} v${str(r.version)}`,
        subtitle: str(r.note) || undefined,
        badge: TERMS_LABEL[str(r.slug)] ?? str(r.slug),
        href: `/site/terms/history/${str(r.id)}`,
        meta: str(r.edited_by_email) ? [str(r.edited_by_email)] : undefined,
      })),
  },
  portfolioAsks: {
    table: "portfolio_asks",
    dateColumn: "created_at",
    select: "id, question, answer, model, created_at",
    series: { key: "ask", label: "질문", tone: "strong" },
    toItems: (rows) =>
      rows.map((r) => ({
        id: str(r.id),
        time: str(r.created_at),
        title: excerpt(r.question, 70),
        subtitle: excerpt(r.answer, 110),
        badge: str(r.model) || undefined,
      })),
  },
  prompts: {
    table: "prompts",
    dateColumn: "created_at",
    select: "id, title, is_public, created_at",
    series: { key: "prompt", label: "프롬프트", tone: "strong" },
    toItems: (rows) =>
      rows.map((r) => ({
        id: str(r.id),
        time: str(r.created_at),
        title: str(r.title),
        badge: r.is_public ? "공개" : "비공개",
        href: `/promptkit/${str(r.id)}`,
      })),
  },
  career: {
    table: "career_posts",
    dateColumn: "created_at",
    select: "id, title, is_public, created_at",
    series: { key: "career", label: "커리어", tone: "strong" },
    toItems: (rows) =>
      rows.map((r) => ({
        id: str(r.id),
        time: str(r.created_at),
        title: str(r.title),
        badge: r.is_public ? "공개" : "비공개",
        href: `/career/${str(r.id)}`,
      })),
  },
} satisfies Record<string, Source>

// 여러 원천을 한 캘린더에 합치는 묶음 — 대시보드 "최근 활동"(댓글 + 로그인·접속)
const COMPOSITES = { activity: ["comments", "loginHistory"] } as const satisfies Record<string, readonly (keyof typeof CALENDAR_SOURCES)[]>

type SingleKey = keyof typeof CALENDAR_SOURCES
export type CalendarSourceKey = SingleKey | keyof typeof COMPOSITES
const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)
export const isCalendarSource = (value: string): value is CalendarSourceKey => own(CALENDAR_SOURCES, value) || own(COMPOSITES, value)

const seriesOf = (source: Source, value: unknown): CalendarSeries => {
  if (typeof source.series.key === "string") return source.series as CalendarSeries
  const map = source.series as Record<string, CalendarSeries>
  const raw = value == null ? "" : String(value) // boolean 컬럼(ok)도 "true"/"false"로 찾는다
  return map[raw] ?? { key: raw || "etc", label: raw || "기타", tone: "soft" }
}

// 하루별·종류별 건수. Supabase는 한 번에 1000행까지만 주므로 쪽을 넘기며 읽는다.
// ponytail: 상한 30,000행 — 이 이상이면 SQL 집계(RPC)로 옮긴다.
export async function countCalendar(key: CalendarSourceKey, from: string, to: string, scope?: string): Promise<CalendarCount[]> {
  if (key in COMPOSITES) {
    const parts = await Promise.all(COMPOSITES[key as keyof typeof COMPOSITES].map((k) => countCalendar(k, from, to, scope)))
    return parts.flat().sort((a, b) => a.date.localeCompare(b.date))
  }
  if (!isSupabaseConfigured() || !isDateKey(from) || !isDateKey(to)) return []
  const source: Source = CALENDAR_SOURCES[key as SingleKey]
  const db = createServiceClient()
  const columns = [source.dateColumn, source.seriesColumn].filter(Boolean).join(", ")
  const counts = new Map<string, CalendarCount>()
  const PAGE = 1000
  for (let offset = 0; offset < 30 * PAGE; offset += PAGE) {
    let query = db.from(source.table).select(columns).gte(source.dateColumn, kstDayStartIso(from)).lt(source.dateColumn, kstDayStartIso(to))
    if (source.scopeColumn && scope) query = query.eq(source.scopeColumn, scope)
    const { data, error } = await query.order(source.dateColumn, { ascending: true }).range(offset, offset + PAGE - 1)
    if (error) return []
    const rows = (data ?? []) as unknown as Row[]
    for (const row of rows) {
      const date = kstDateKey(str(row[source.dateColumn]))
      const series = seriesOf(source, source.seriesColumn ? row[source.seriesColumn] : null)
      const id = `${date}:${series.key}`
      const entry = counts.get(id) ?? { date, key: series.key, label: series.label, tone: series.tone, count: 0 }
      entry.count += 1
      counts.set(id, entry)
    }
    if (rows.length < PAGE) break
  }
  return [...counts.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export const CALENDAR_DAY_LIMIT = 200
export async function listCalendarDay(key: CalendarSourceKey, date: string, scope?: string): Promise<CalendarDayItem[]> {
  if (key in COMPOSITES) {
    const parts = await Promise.all(COMPOSITES[key as keyof typeof COMPOSITES].map((k) => listCalendarDay(k, date, scope)))
    return parts.flat().sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, CALENDAR_DAY_LIMIT)
  }
  if (!isSupabaseConfigured() || !isDateKey(date)) return []
  const source: Source = CALENDAR_SOURCES[key as SingleKey]
  const db = createServiceClient()
  let query = db.from(source.table).select(source.select).gte(source.dateColumn, kstDayStartIso(date)).lt(source.dateColumn, kstNextDayStartIso(date))
  if (source.scopeColumn && scope) query = query.eq(source.scopeColumn, scope)
  const { data, error } = await query.order(source.dateColumn, { ascending: false }).limit(CALENDAR_DAY_LIMIT)
  if (error) return []
  return source.toItems((data ?? []) as unknown as Row[], db)
}
