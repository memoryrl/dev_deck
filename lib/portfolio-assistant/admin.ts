import { emptyPage, fetchPagedRows, ilikeContains, LIST_PAGE_SIZE, type PagedResult } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export type PortfolioAskEntry = {
  id: string
  userId: string
  question: string
  answer: string
  model: string
  createdAt: string
  displayName: string
  email: string | null
}

const ANSWER_MAX = 4_000

export async function recordPortfolioAsk(input: {
  userId: string
  question: string
  answer: string
  model: string
}) {
  if (!isSupabaseConfigured()) return
  const supabase = await createClient()
  const { error } = await supabase.from("portfolio_asks").insert({
    user_id: input.userId,
    question: input.question.trim().slice(0, 1_000),
    answer: input.answer.trim().slice(0, ANSWER_MAX),
    model: input.model.slice(0, 64),
  })
  if (error) console.error("[portfolio_asks] insert failed", error.message)
}

export async function listPortfolioAsks({
  page = 1,
  q = "",
}: {
  page?: number
  q?: string
} = {}): Promise<PagedResult<PortfolioAskEntry>> {
  if (!isSupabaseConfigured()) return emptyPage(page, LIST_PAGE_SIZE)

  const supabase = await createClient()
  const needle = q.trim()
  const pattern = needle ? ilikeContains(needle) : ""

  let matchingUserIds: string[] = []
  if (pattern) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
      .limit(50)
    matchingUserIds = ((profiles ?? []) as { id: string }[]).map((row) => row.id)
  }

  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase
      .from("portfolio_asks")
      .select("id, user_id, question, answer, model, created_at", { count: "exact" })

    if (pattern) {
      const filters = [`question.ilike.${pattern}`, `answer.ilike.${pattern}`]
      if (matchingUserIds.length > 0) {
        filters.push(`user_id.in.(${matchingUserIds.join(",")})`)
      }
      query = query.or(filters.join(","))
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) return null

    const rows = (data ?? []) as {
      id: string
      user_id: string
      question: string
      answer: string
      model: string
      created_at: string
    }[]
    const userIds = [...new Set(rows.map((row) => row.user_id))]

    const [profileResult, emailResult] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, username, full_name").in("id", userIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.rpc("get_user_emails", { user_ids: userIds }).select("*")
        : Promise.resolve({ data: [] }),
    ])

    const names = new Map<string, string>()
    for (const row of (profileResult.data ?? []) as { id: string; username: string | null; full_name: string | null }[]) {
      names.set(row.id, row.full_name?.trim() || row.username?.trim() || row.id.slice(0, 8))
    }
    const emails = new Map<string, string>()
    for (const row of (emailResult.data ?? []) as { id: string; email: string }[]) {
      emails.set(row.id, row.email)
    }

    return {
      total: count ?? 0,
      rows: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        question: row.question,
        answer: row.answer,
        model: row.model,
        createdAt: row.created_at,
        displayName: names.get(row.user_id) ?? row.user_id.slice(0, 8),
        email: emails.get(row.user_id) ?? null,
      })),
    }
  })
}
