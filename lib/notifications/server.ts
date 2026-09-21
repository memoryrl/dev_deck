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
  return ((data ?? []) as Row[]).map(toItem)
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
