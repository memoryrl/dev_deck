import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export type DashboardStats = {
  totalPosts: number
  totalComments: number
  totalPrompts: number
  totalProfiles: number
  totalVisitsToday: number
  totalVisitsWeek: number
  totalVisitsMonth: number
  totalUploads: number
  storageUsedMB: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const defaultStats: DashboardStats = {
    totalPosts: 0,
    totalComments: 0,
    totalPrompts: 0,
    totalProfiles: 0,
    totalVisitsToday: 0,
    totalVisitsWeek: 0,
    totalVisitsMonth: 0,
    totalUploads: 0,
    storageUsedMB: 0,
  }

  if (!isSupabaseConfigured()) return defaultStats

  const supabase = createClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString()

  const [
    postsResult,
    commentsResult,
    promptsResult,
    profilesResult,
    visitsTodayResult,
    visitsWeekResult,
    visitsMonthResult,
    uploadsResult,
  ] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("comments").select("*", { count: "exact", head: true }),
    supabase.from("prompts").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("login_history").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("login_history").select("*", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("login_history").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase.from("uploads").select("*", { count: "exact", head: true }),
  ])

  return {
    totalPosts: postsResult.count ?? 0,
    totalComments: commentsResult.count ?? 0,
    totalPrompts: promptsResult.count ?? 0,
    totalProfiles: profilesResult.count ?? 0,
    totalVisitsToday: visitsTodayResult.count ?? 0,
    totalVisitsWeek: visitsWeekResult.count ?? 0,
    totalVisitsMonth: visitsMonthResult.count ?? 0,
    totalUploads: uploadsResult.count ?? 0,
    storageUsedMB: 0,
  }
}

export type RecentActivity = {
  id: string
  type: "comment" | "visit" | "post"
  title: string
  description: string
  createdAt: string
}

export async function getRecentActivity(limit = 10): Promise<RecentActivity[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = createClient()

  const [commentsResult, visitsResult] = await Promise.all([
    supabase
      .from("comments")
      .select("id, author_name, body, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("login_history")
      .select("id, email, event_type, ip_region, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const activities: RecentActivity[] = []

  for (const comment of commentsResult.data ?? []) {
    activities.push({
      id: `comment-${comment.id}`,
      type: "comment",
      title: `${comment.author_name}님의 댓글`,
      description: (comment.body as string).slice(0, 50) + ((comment.body as string).length > 50 ? "..." : ""),
      createdAt: comment.created_at,
    })
  }

  for (const visit of visitsResult.data ?? []) {
    const v = visit as { id: string; email: string | null; event_type: string; ip_region: string | null; created_at: string }
    activities.push({
      id: `visit-${v.id}`,
      type: "visit",
      title: v.event_type === "login" ? "로그인" : "사이트 접속",
      description: v.email ?? v.ip_region ?? "익명",
      createdAt: v.created_at,
    })
  }

  return activities
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit)
}
