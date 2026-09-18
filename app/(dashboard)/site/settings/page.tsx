import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { requireOwner } from "@/lib/auth/owner"
import { getSiteSettings } from "@/lib/site/settings"
import { saveSiteSettings } from "./actions"

export default async function SiteSettingsPage() {
  await requireOwner()
  const settings = await getSiteSettings()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageTitleBanner
        title="사이트 설정"
        breadcrumb={[
          { label: "사이트 관리", href: "/site/dashboard" },
          { label: "설정" },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        사이트의 기본 정보와 SEO 설정을 관리합니다.
      </p>

      <form action={saveSiteSettings} className="space-y-8">
        {/* 기본 정보 */}
        <section className="rounded-xl border bg-white p-6 dark:bg-card">
          <h2 className="mb-6 font-display text-lg font-bold">기본 정보</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">사이트 이름</Label>
              <Input
                id="siteName"
                name="siteName"
                defaultValue={settings.siteName}
                placeholder="DevDeck"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">사이트 설명</Label>
              <Textarea
                id="siteDescription"
                name="siteDescription"
                defaultValue={settings.siteDescription}
                placeholder="사이트에 대한 간단한 설명"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                검색 결과와 소셜 미리보기에 표시됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerText">푸터 문구</Label>
              <Input
                id="footerText"
                name="footerText"
                defaultValue={settings.footerText}
                placeholder="© 2024 DevDeck"
              />
            </div>
          </div>
        </section>

        {/* SEO 설정 */}
        <section className="rounded-xl border bg-white p-6 dark:bg-card">
          <h2 className="mb-6 font-display text-lg font-bold">SEO 설정</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteKeywords">키워드</Label>
              <Input
                id="siteKeywords"
                name="siteKeywords"
                defaultValue={settings.siteKeywords}
                placeholder="AI, 프롬프트, 포트폴리오"
              />
              <p className="text-xs text-muted-foreground">
                쉼표로 구분하여 입력하세요.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialImage">소셜 미리보기 이미지 URL</Label>
              <Input
                id="socialImage"
                name="socialImage"
                defaultValue={settings.socialImage}
                placeholder="https://example.com/og-image.png"
              />
              <p className="text-xs text-muted-foreground">
                SNS 공유 시 표시되는 이미지입니다. (권장: 1200x630)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
              <Input
                id="googleAnalyticsId"
                name="googleAnalyticsId"
                defaultValue={settings.googleAnalyticsId}
                placeholder="G-XXXXXXXXXX"
              />
            </div>
          </div>
        </section>

        {/* 고급 설정 */}
        <section className="rounded-xl border bg-white p-6 dark:bg-card">
          <h2 className="mb-6 font-display text-lg font-bold">고급 설정</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenanceMode">유지보수 모드</Label>
                <p className="text-sm text-muted-foreground">
                  활성화하면 관리자 외 접속이 차단됩니다.
                </p>
              </div>
              <Switch
                id="maintenanceMode"
                name="maintenanceMode"
                defaultChecked={settings.maintenanceMode}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" className="rounded-full px-8">
            설정 저장
          </Button>
        </div>
      </form>
    </div>
  )
}
