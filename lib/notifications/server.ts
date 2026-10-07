import { createClient } from "@/lib/supabase/server"
import type { NotificationItem, NotificationPoll, NotificationType } from "@/types/notification"

// 조회·읽음 처리는 로그인 세션(RLS)으로 한다. RLS가 "내 알림 + (관리자면) 관리자 공용 알림"만
// 돌려주므로 여기서 받는 사람을 다시 거르지 않는다.
const COLUMNS = "id, type, actor_name, subject, link_url, read_at, created_at"

type Row = {
  id: string
  type: NotificationType
  actor_name: string | null
  subject: string | null
  link_url: string | null
  read_at: string | null
  created_at: string
}

function toItem(row: Row): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    actorName: row.actor_name,
    subject: row.subject,
    linkUrl: row.link_url,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export async function pollNotifications(): Promise<NotificationPoll> {
  const supabase = await createClient()
  const [count, latest] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase
      .from("notifications")
      .select(COLUMNS)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
  ])
  if (count.error || latest.error) throw new Error(count.error?.message ?? latest.error?.message)
  const row = ((latest.data ?? []) as Row[])[0]
  return {
    unreadCount: count.count ?? 0,
    latest: row ? toItem(row) : null,
    serverTime: new Date().toISOString(),
  }
}

// 알림이 가리키는 글이 삭제되면 링크가 404가 된다. 목록을 줄 때 대상이 아직 있는지 한 번에 확인한다.
// 글 삭제 때 알림도 지우는 트리거(supabase/patch-notifications-cleanup.sql)가 정상 경로이고, 이건 이미 남은 고아 알림 방어선이다.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const LINK_TABLE: [RegExp, string][] = [
  [new RegExp(`^/p/(${UUID})$`, "i"), "prompts"],
  [new RegExp(`^/work/(${UUID})$`, "i"), "career_posts"],
  [new RegExp(`^/b/[^/]+/(${UUID})$`, "i"), "board_posts"],
]

async function markMissingTargets(items: NotificationItem[]): Promise<NotificationItem[]> {
  const wanted = new Map<string, Set<string>>()
  const targetOf = new Map<string, { table: string; id: string }>()
  for (const item of items) {
    for (const [pattern, table] of LINK_TABLE) {
      const id = item.linkUrl?.match(pattern)?.[1]?.toLowerCase()
      if (!id) continue
      targetOf.set(item.id, { table, id })
      if (!wanted.has(table)) wanted.set(table, new Set())
      wanted.get(table)!.add(id)
    }
  }
  if (!targetOf.size) return items

  const supabase = await createClient()
  const alive = new Set<string>()
  await Promise.all(
    [...wanted].map(async ([table, ids]) => {
      const { data, error } = await supabase.from(table).select("id").in("id", [...ids])
      // 조회 실패는 "있다"로 본다 — 일시 오류로 멀쩡한 알림을 삭제됨으로 표시하지 않는다.
      if (error) ids.forEach((id) => alive.add(`${table}:${id}`))
      else (data ?? []).forEach((row: { id: string }) => alive.add(`${table}:${row.id.toLowerCase()}`))
    })
  )
  return items.map((item) => {
    const target = targetOf.get(item.id)
    return target && !alive.has(`${target.table}:${target.id}`) ? { ...item, linkMissing: true } : item
  })
}

export async function listNotifications({
  unreadOnly,
  limit,
}: {
  unreadOnly: boolean
  limit: number
}): Promise<NotificationItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (unreadOnly) query = query.is("read_at", null)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return markMissingTargets(((data ?? []) as Row[]).map(toItem))
}

export async function markNotificationsRead({ id }: { id?: string }) {
  const supabase = await createClient()
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
  if (id) query = query.eq("id", id)
  const { error } = await query
  if (error) throw new Error(error.message)
}
