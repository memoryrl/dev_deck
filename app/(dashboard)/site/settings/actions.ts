"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/auth/owner"
import { updateSiteSettings, type SiteSettings } from "@/lib/site/settings"

export async function saveSiteSettings(formData: FormData): Promise<void> {
  await requireOwner()

  const updates: Partial<SiteSettings> = {
    siteName: formData.get("siteName") as string,
    siteDescription: formData.get("siteDescription") as string,
    siteKeywords: formData.get("siteKeywords") as string,
    footerText: formData.get("footerText") as string,
    socialImage: formData.get("socialImage") as string,
    googleAnalyticsId: formData.get("googleAnalyticsId") as string,
    maintenanceMode: formData.get("maintenanceMode") === "on",
  }

  const result = await updateSiteSettings(updates)

  if (!result.success) {
    throw new Error(result.error)
  }

  revalidatePath("/site/settings")
}
