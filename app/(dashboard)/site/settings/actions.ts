"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/auth/owner"
import { parseNoticePopupMode } from "@/lib/boards/notice-popup-window"
import { isGaMeasurementIdInputValid, parseGaMeasurementId } from "@/lib/site/analytics"
import { APP_ENV_KEYS, parseHttpOriginUrl, upsertAppEnv } from "@/lib/site/app-env"
import { updateSiteSettings, type SiteSettings } from "@/lib/site/settings"

export async function saveSiteSettings(formData: FormData) {
  await requireOwner()

  const googleAnalyticsIdRaw = String(formData.get("googleAnalyticsId") ?? "")
  if (!isGaMeasurementIdInputValid(googleAnalyticsIdRaw)) {
    return { ok: false as const, error: "Google Analytics ID는 G- 로 시작하는 측정 ID여야 합니다." }
  }

  const ollamaBaseUrl = parseHttpOriginUrl(String(formData.get("ollamaBaseUrl") ?? ""))
  if (ollamaBaseUrl === null) {
    return { ok: false as const, error: "Ollama 주소는 http(s) URL이어야 합니다." }
  }

  const updates: Partial<SiteSettings> = {
    siteName: String(formData.get("siteName") ?? ""),
    siteDescription: String(formData.get("siteDescription") ?? ""),
    siteKeywords: String(formData.get("siteKeywords") ?? ""),
    footerText: String(formData.get("footerText") ?? ""),
    socialImage: String(formData.get("socialImage") ?? ""),
    googleAnalyticsId: parseGaMeasurementId(googleAnalyticsIdRaw) ?? "",
    noticePopupMode: parseNoticePopupMode(String(formData.get("noticePopupMode") ?? "")),
    maintenanceMode: formData.get("maintenanceMode") === "on",
  }

  const result = await updateSiteSettings(updates)
  if (!result.success) {
    return { ok: false as const, error: result.error ?? "설정을 저장하지 못했습니다." }
  }

  const envResult = await upsertAppEnv({ [APP_ENV_KEYS.ollamaBaseUrl]: ollamaBaseUrl })
  if (!envResult.success) {
    return { ok: false as const, error: envResult.error ?? "환경값을 저장하지 못했습니다." }
  }

  revalidatePath("/site/settings")
  revalidatePath("/site/ollama-chat")
  revalidatePath("/", "layout")
  return { ok: true as const }
}
