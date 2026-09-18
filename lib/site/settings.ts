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

export async function getSiteSettings(): Promise<SiteSettings> {
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
}

export async function updateSiteSettings(
  updates: Partial<SiteSettings>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" }

  const supabase = createClient()

  for (const [key, value] of Object.entries(updates)) {
    const stringValue = typeof value === "boolean" ? String(value) : (value as string)

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: stringValue }, { onConflict: "key" })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}
