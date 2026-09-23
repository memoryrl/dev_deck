import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export const APP_ENV_KEYS = {
  ollamaBaseUrl: "OLLAMA_BASE_URL",
} as const

export type AppEnvKey = (typeof APP_ENV_KEYS)[keyof typeof APP_ENV_KEYS]

const URL_MAX = 500

export function parseHttpOriginUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return ""
  if (value.length > URL_MAX) return null
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return null
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
  if (parsed.username || parsed.password) return null
  return parsed.toString().replace(/\/+$/, "")
}

function formatDbError(error: { message: string; code?: string; details?: string | null; hint?: string | null }) {
  const parts = [error.message, error.details, error.hint].filter(
    (part): part is string => Boolean(part && part.trim())
  )
  const body = parts.join(" — ") || "데이터베이스 오류"
  const blob = `${error.code ?? ""} ${body}`
  if (/schema cache|does not exist|PGRST205|42P01/i.test(blob)) {
    return `${body} — Supabase SQL 편집기에서 patch-app-env.sql 을 실행하세요.`
  }
  return error.code ? `[${error.code}] ${body}` : body
}

export const getAppEnvMap = cache(async (): Promise<Record<string, string>> => {
  if (!isSupabaseConfigured()) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.from("app_env").select("key, value")
  if (error || !data) return {}
  return Object.fromEntries((data as { key: string; value: string }[]).map((row) => [row.key, row.value]))
})

export async function getAppEnv(key: AppEnvKey): Promise<string> {
  const map = await getAppEnvMap()
  return map[key]?.trim() ?? ""
}

export async function upsertAppEnv(
  updates: Partial<Record<AppEnvKey, string>>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" }

  const now = new Date().toISOString()
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value: value ?? "",
    updated_at: now,
  }))
  if (rows.length === 0) return { success: true }

  const supabase = await createClient()
  const { error } = await supabase.from("app_env").upsert(rows, { onConflict: "key" })
  if (error) {
    console.error("[app_env] upsert failed", error)
    return { success: false, error: formatDbError(error) }
  }
  return { success: true }
}
