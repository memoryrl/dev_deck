import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export type SiteSettings = {
  siteName: string
  siteDescription: string
  siteKeywords: string
  footerText: string
  socialImage: string
  googleAnalyticsId: string
  maintenanceMode: boolean
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "DevDeck",
  siteDescription: "AI 프롬프트, 커리어, 게임 리뷰를 기록하는 개인 포트폴리오",
  siteKeywords: "AI, 프롬프트, 포트폴리오, 게임 리뷰, 커리어",
  footerText: "© 2024 DevDeck. All rights reserved.",
  socialImage: "",
  googleAnalyticsId: "",
  maintenanceMode: false,
}

function formatDbError(error: {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}) {
  const parts = [error.message, error.details, error.hint].filter(
    (part): part is string => Boolean(part && part.trim())
  )
  const body = parts.join(" — ") || "데이터베이스 오류"
  const blob = `${error.code ?? ""} ${body}`
  if (/schema cache|does not exist|PGRST205|42P01/i.test(blob)) {
    return `${body} — Supabase SQL 편집기에서 patch-site-settings.sql 을 실행하세요.`
  }
  return error.code ? `[${error.code}] ${body}` : body
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS

  const supabase = createClient()
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")

  if (error || !data) return DEFAULT_SETTINGS

  const settings = { ...DEFAULT_SETTINGS }
  for (const row of data as { key: string; value: string }[]) {
    if (row.key in settings) {
      const key = row.key as keyof SiteSettings
      if (typeof settings[key] === "boolean") {
        (settings as Record<string, unknown>)[key] = row.value === "true"
      } else {
        (settings as Record<string, unknown>)[key] = row.value
      }
    }
  }

  return settings
})

export async function updateSiteSettings(
  updates: Partial<SiteSettings>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" }

  const supabase = createClient()
  const now = new Date().toISOString()
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value: typeof value === "boolean" ? String(value) : String(value ?? ""),
    updated_at: now,
  }))

  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" })

  if (error) {
    console.error("[site_settings] upsert failed", error)
    return { success: false, error: formatDbError(error) }
  }

  return { success: true }
}
