import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export const INITIAL_ASK_CYCLES = 2
export const MORE_ASK_CYCLES = 4

export type PortfolioAskCycle = {
  id: string
  question: string
  answer: string
  model: string
  createdAt: string
}

export type AskHistoryCursor = {
  createdAt: string
  id: string
}

export function isAskHistoryCursor(value: unknown): value is AskHistoryCursor {
  if (!value || typeof value !== "object") return false
  const cursor = value as AskHistoryCursor
  if (typeof cursor.id !== "string" || typeof cursor.createdAt !== "string") return false
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor.id)) {
    return false
  }
  return Number.isFinite(Date.parse(cursor.createdAt)) && cursor.createdAt.length <= 40
}

/** 로그인한 회원의 Q&A 사이클을 최신순으로 limit건. cursor보다 오래된 것만. */
export async function listMyPortfolioAskCycles(input: {
  userId: string
  limit: number
  cursor?: AskHistoryCursor | null
}): Promise<{ cycles: PortfolioAskCycle[]; hasMore: boolean; nextCursor: AskHistoryCursor | null }> {
  if (!isSupabaseConfigured()) return { cycles: [], hasMore: false, nextCursor: null }

  const supabase = await createClient()
  let query = supabase
    .from("portfolio_asks")
    .select("id, question, answer, model, created_at")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(input.limit + 1)

  if (input.cursor) {
    query = query.lt("created_at", input.cursor.createdAt)
  }

  const { data, error } = await query
  if (error || !data) return { cycles: [], hasMore: false, nextCursor: null }

  const hasMore = data.length > input.limit
  const rows = (hasMore ? data.slice(0, input.limit) : data) as {
    id: string
    question: string
    answer: string
    model: string
    created_at: string
  }[]
  const cycles = rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    model: row.model,
    createdAt: row.created_at,
  }))
  const last = cycles[cycles.length - 1]
  return {
    cycles,
    hasMore,
    nextCursor: last ? { createdAt: last.createdAt, id: last.id } : null,
  }
}
