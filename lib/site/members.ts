import { emptyPage, fetchPagedRows, ilikeContains, LIST_PAGE_SIZE, type PagedResult } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export type MemberListEntry = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  steam_id: string | null
  updated_at: string
  email: string | null
  commentCount: number
}

export async function listMembers({
  page = 1,
  q = "",
}: {
  page?: number
  q?: string
} = {}): Promise<PagedResult<MemberListEntry>> {
  if (!isSupabaseConfigured()) return emptyPage(page, LIST_PAGE_SIZE)

  const supabase = createClient()
  const needle = q.trim()
  const pattern = needle ? ilikeContains(needle) : ""

  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, steam_id, updated_at", { count: "exact" })

    if (pattern) {
      query = query.or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    }

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to)

    if (error) return null

    const profiles = (data ?? []) as {
      id: string
      username: string | null
      full_name: string | null
      avatar_url: string | null
      steam_id: string | null
      updated_at: string
    }[]

    const userIds = profiles.map((p) => p.id)

    const [emailResult, commentCountResult] = await Promise.all([
      supabase.rpc("get_user_emails", { user_ids: userIds }).select("*"),
      userIds.length > 0
        ? supabase.from("comments").select("user_id").in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const emailMap = new Map<string, string>()
    for (const row of (emailResult.data ?? []) as { id: string; email: string }[]) {
      emailMap.set(row.id, row.email)
    }

    const commentCounts = new Map<string, number>()
    for (const row of (commentCountResult.data ?? []) as { user_id: string }[]) {
      commentCounts.set(row.user_id, (commentCounts.get(row.user_id) ?? 0) + 1)
    }

    const rows: MemberListEntry[] = profiles.map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? null,
      commentCount: commentCounts.get(p.id) ?? 0,
    }))

    return { rows, total: count ?? 0 }
  })
}

export async function getMemberDetail(userId: string): Promise<MemberListEntry | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, steam_id, updated_at")
    .eq("id", userId)
    .single()

  if (error || !data) return null

  const profile = data as {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
    steam_id: string | null
    updated_at: string
  }

  const [emailResult, commentCountResult] = await Promise.all([
    supabase.rpc("get_user_emails", { user_ids: [userId] }).select("*"),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const email = ((emailResult.data ?? []) as { id: string; email: string }[])[0]?.email ?? null

  return {
    ...profile,
    email,
    commentCount: commentCountResult.count ?? 0,
  }
}
