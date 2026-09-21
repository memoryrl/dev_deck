"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/auth/owner"
import { isGaMeasurementIdInputValid, parseGaMeasurementId } from "@/lib/site/analytics"
import { updateSiteSettings, type SiteSettings } from "@/lib/site/settings"

export async function saveSiteSettings(formData: FormData) {
  await requireOwner()

  const googleAnalyticsIdRaw = String(formData.get("googleAnalyticsId") ?? "")
  if (!isGaMeasurementIdInputValid(googleAnalyticsIdRaw)) {
    return { ok: false as const, error: "Google Analytics ID는 G- 로 시작하는 측정 ID여야 합니다." }
  }

  const updates: Partial<SiteSettings> = {
    siteName: String(formData.get("siteName") ?? ""),
    siteDescription: String(formData.get("siteDescription") ?? ""),
    siteKeywords: String(formData.get("siteKeywords") ?? ""),
    footerText: String(formData.get("footerText") ?? ""),
    socialImage: String(formData.get("socialImage") ?? ""),
    googleAnalyticsId: parseGaMeasurementId(googleAnalyticsIdRaw) ?? "",
    maintenanceMode: formData.get("maintenanceMode") === "on",
  }

  const result = await updateSiteSettings(updates)
  if (!result.success) {
    return { ok: false as const, error: result.error ?? "설정을 저장하지 못했습니다." }
  }

  revalidatePath("/site/settings")
  revalidatePath("/", "layout")
  return { ok: true as const }
}
