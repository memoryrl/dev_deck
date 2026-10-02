"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/auth/owner"
import { updateSiteSettings } from "@/lib/site/settings"
import { pushThemeHistory } from "@/lib/site/theme"
import { sanitizeTheme, type ThemeConfig } from "@/lib/site/theme-config"

export async function saveThemeConfig(input: ThemeConfig, note = "") {
  const user = await requireOwner()
  // 클라이언트 값은 그대로 믿지 않고 서버에서 다시 검증·정규화해 저장한다.
  const theme = sanitizeTheme(input)
  const result = await updateSiteSettings({ themeConfig: JSON.stringify(theme) })
  if (!result.success) return { ok: false as const, error: result.error ?? "테마를 저장하지 못했습니다." }
  // 이력 기록 실패가 저장 자체를 되돌리진 않는다(테마는 이미 반영됨).
  const history = await pushThemeHistory({ savedBy: user.email ?? "", note: note.slice(0, 80), config: theme })
  if (!history.success) console.error("[theme] history push failed", history.error)
  revalidatePath("/", "layout")
  return { ok: true as const }
}

// 원격 제어기 레이어 표시 스위치 — 테마 값과 별개로 즉시 저장하고, 이력에는 남기지 않는다(glow의 visibility PATCH와 동일).
export async function setThemeRemoteVisible(visible: boolean) {
  await requireOwner()
  const result = await updateSiteSettings({ themeRemoteVisible: visible === true })
  if (!result.success) return { ok: false as const, error: result.error ?? "저장하지 못했습니다." }
  revalidatePath("/", "layout")
  return { ok: true as const }
}
