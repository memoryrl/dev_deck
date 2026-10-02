import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { getThemeHistory } from "@/lib/site/theme"
import { ThemeHistory } from "./theme-history"
import { getSiteSettings } from "@/lib/site/settings"
import { ThemeRemoteSwitch } from "./theme-remote-switch"

export default async function SiteThemePage() {
  await requireOwner()
  const [{ t }, history, settings] = await Promise.all([getT(), getThemeHistory(), getSiteSettings()])
  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={t("nav.theme")}
        description="오른쪽 위 스위치를 켜면 관리자 로그인 상태에서 모든 화면에 테마 원격 제어기 레이어가 떠서 색상·글꼴·모서리·너비·모션을 바로 바꿔 볼 수 있습니다. 저장 전에는 이 브라우저에서만 미리 보입니다."
        actions={<ThemeRemoteSwitch initial={settings.themeRemoteVisible} />}
      />
      <ThemeHistory entries={history} currentId={history[0]?.id ?? null} />
    </div>
  )
}
