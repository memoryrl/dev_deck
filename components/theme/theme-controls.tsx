"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useThemeConfig } from "@/components/theme/theme-config-provider"
import {
  AOS_ANIMATIONS,
  DEFAULT_THEME,
  THEME_BANNER_IMAGES,
  THEME_BANNER_STYLES,
  THEME_BUTTON_SHAPES,
  THEME_COLOR_MODES,
  THEME_DISPLAY_FONTS,
  THEME_FONT_SCALES,
  THEME_FONTS,
  THEME_LIMITS,
  THEME_SURFACES,
  type ThemeConfig,
} from "@/lib/site/theme-config"
import { cn } from "@/lib/utils"
import { saveThemeConfig } from "@/app/(dashboard)/site/theme/actions"

// glow_platform 원격 제어기와 같은 구성: 상단 탭 2개(영역별/전체) + 탭마다 한 번에 하나만 열리는 아코디언.
// 레이어(폭 360px) 안에서만 쓰므로 컨트롤은 처음부터 조밀한 크기로 만든다.

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-8 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5" aria-label={label} />
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{value}</code>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

function RangeField({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-foreground" aria-label={label} />
    </div>
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <Label>{label}</Label>
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

// 라디오 카드 묶음 — 라벨만 있는 선택지(글꼴·모드·모양 등)에 공통으로 쓴다.
function ChoiceGroup<K extends string>({ label, name, value, options, onChange }: { label: string; name: string; value: K; options: Record<K, string>; onChange: (v: K) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="grid gap-1.5">
        {(Object.keys(options) as K[]).map((key) => (
          <label key={key} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition-colors", value === key ? "border-foreground/30 bg-foreground/[0.03]" : "border-foreground/10 hover:border-foreground/20")}>
            <input type="radio" name={name} checked={value === key} onChange={() => onChange(key)} className="size-3.5 accent-foreground" />
            <span>{options[key]}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

const labelsOf = <T extends Record<string, { label: string }>>(map: T) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.label])) as Record<keyof T, string>

// 0 = 콘텐츠 너비와 동일. 켜면 슬라이더로 따로 지정한다.
function OptionalWidth({ label, value, base, onChange }: { label: string; value: number; base: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <ToggleRow label={label} hint={value ? "콘텐츠와 별도 너비" : "콘텐츠 너비와 동일"} checked={value > 0} onChange={(on) => onChange(on ? base : 0)} />
      {value > 0 ? <RangeField label="너비" value={value} display={`${value}px`} {...THEME_LIMITS.containerWidth} onChange={onChange} /> : null}
    </div>
  )
}

function AccordionItem({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: (id: string) => void; children: React.ReactNode }) {
  return (
    <div data-accordion-id={id} className="border-b last:border-b-0">
      <h3>
        <button type="button" aria-expanded={open} onClick={() => onToggle(id)} className={cn("flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-muted/60", open && "bg-muted/60")}>
          {title}
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </h3>
      {/* grid-rows 0fr→1fr 전환으로 높이를 부드럽게 열고 닫는다. 닫힌 동안은 inert로 포커스도 막는다. */}
      <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!open}>
          <div className="space-y-3 px-3 pb-3 pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

type TabId = "area" | "overall"
const TABS: { id: TabId; label: string }[] = [
  { id: "area", label: "영역별 설정" },
  { id: "overall", label: "전체 설정" },
]

export function ThemeControls() {
  const { config, saved, preview } = useThemeConfig()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [tab, setTab] = useState<TabId>("area")
  const [openId, setOpenId] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const set = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => preview({ ...config, [key]: value })
  const dirty = JSON.stringify(config) !== JSON.stringify(saved)

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id))
  // 열린 항목이 스크롤 영역 밖이면 보이는 곳으로 끌어온다(glow의 아코디언 자동 스크롤).
  useEffect(() => {
    if (!openId) return
    const timer = window.setTimeout(() => {
      scroller.current?.querySelector(`[data-accordion-id="${openId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }, 220)
    return () => window.clearTimeout(timer)
  }, [openId])

  const save = () =>
    startTransition(async () => {
      const result = await saveThemeConfig(config)
      setMessage(result.ok ? { ok: true, text: "적용했습니다." } : { ok: false, text: result.error })
      // 서버가 새 값을 내려주면 provider가 saved/미리보기를 그 값으로 맞춘다.
      if (result.ok) router.refresh()
    })

  const item = (id: string, title: string, body: React.ReactNode) => (
    <AccordionItem key={id} id={id} title={title} open={openId === id} onToggle={toggle}>
      {body}
    </AccordionItem>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2">
        <div role="tablist" className="flex">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setOpenId(null) }} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors", tab === t.id ? "border-[hsl(var(--lux-champagne))] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
        <Button type="button" size="sm" className="h-7 rounded-full px-4 text-xs" onClick={save} disabled={pending || !dirty}>
          적용
        </Button>
      </div>

      <div ref={scroller} role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {tab === "area" ? (
          <>
            {item("header-footer", "헤더·푸터 영역", (
              <>
                <OptionalWidth label="헤더 영역 너비" value={config.headerWidth} base={config.containerWidth} onChange={(v) => set("headerWidth", v)} />
                <OptionalWidth label="푸터 영역 너비" value={config.footerWidth} base={config.containerWidth} onChange={(v) => set("footerWidth", v)} />
              </>
            ))}
            {item("banner", "타이틀 배너 영역", (
              <>
                <ChoiceGroup label="배너 스타일" name="bannerStyle" value={config.bannerStyle} options={THEME_BANNER_STYLES} onChange={(v) => set("bannerStyle", v)} />
                {config.bannerStyle === "style2" || config.bannerStyle === "style3" ? (
                  <div className="space-y-1">
                    <Label>배경 이미지 <span className="font-normal text-muted-foreground">(랜덤: 화면을 열 때마다 바뀜)</span></Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button type="button" onClick={() => set("bannerImage", "random")} aria-pressed={config.bannerImage === "random"} title="랜덤" className={cn("flex h-[52px] items-center justify-center rounded-lg border-2 bg-muted text-xs font-semibold transition-colors", config.bannerImage === "random" ? "border-[hsl(var(--lux-champagne))]" : "border-transparent hover:border-foreground/20")}>
                        🎲 랜덤
                      </button>
                      {Object.entries(THEME_BANNER_IMAGES).map(([key, img]) => (
                        <button key={key} type="button" onClick={() => set("bannerImage", key as ThemeConfig["bannerImage"])} aria-pressed={config.bannerImage === key} title={img.label} className={cn("overflow-hidden rounded-lg border-2 transition-colors", config.bannerImage === key ? "border-[hsl(var(--lux-champagne))]" : "border-transparent hover:border-foreground/20")}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.src} alt={img.label} loading="lazy" className="h-12 w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ))}
            {item("content", "콘텐츠 영역", (
              <RangeField label="콘텐츠 최대 너비" value={config.containerWidth} display={`${config.containerWidth}px`} {...THEME_LIMITS.containerWidth} onChange={(v) => set("containerWidth", v)} />
            ))}
            {item("home", "홈 화면 영역", (
              <>
                <ToggleRow label="3D 토폴로지 히어로" hint="끄면 클래식 히어로만 보이고 3D 슬라이드·조작이 사라집니다." checked={config.heroTopology} onChange={(v) => set("heroTopology", v)} />
                <RangeField label="마키 한 바퀴 시간" value={config.marqueeSeconds} display={`${config.marqueeSeconds}초`} {...THEME_LIMITS.marqueeSeconds} onChange={(v) => set("marqueeSeconds", v)} />
              </>
            ))}
            {item("dashboard", "관리자 대시보드 영역", (
              <ToggleRow label="3D 개요" hint="끄면 three.js를 불러오지 않고 KPI 카드만 보입니다." checked={config.dashboard3d} onChange={(v) => set("dashboard3d", v)} />
            ))}
          </>
        ) : (
          <>
            {item("colors", "색상·배경", (
              <>
                <ColorField label="포인트 색상" hint="강조선·포커스 링·배지 등 샴페인 골드 톤" value={config.accentColor} onChange={(v) => set("accentColor", v)} />
                <ColorField label="딥 색상" hint="날짜·강조 텍스트·오른쪽 카드 포인트 등 코냑 브라운 톤" value={config.deepColor} onChange={(v) => set("deepColor", v)} />
                <div className="space-y-1">
                  <Label>배경·카드 프리셋</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(THEME_SURFACES).map(([key, preset]) => (
                      <button key={key} type="button" onClick={() => set("surface", key)} title={preset.label} aria-pressed={config.surface === key} className={cn("flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors", config.surface === key ? "border-foreground/40 bg-foreground/[0.04]" : "border-foreground/10 hover:border-foreground/25")}>
                        <span className="size-4 rounded-full border" style={{ backgroundColor: preset.swatch }} />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <ChoiceGroup label="기본 색상 모드" name="colorMode" value={config.colorMode} options={THEME_COLOR_MODES} onChange={(v) => set("colorMode", v)} />
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">방문자가 직접 고른 모드가 있으면 그쪽이 우선합니다. 처음 방문자에게만 적용됩니다.</p>
                </div>
              </>
            ))}
            {item("fonts", "글꼴·크기", (
              <>
                <ChoiceGroup label="본문 글꼴" name="font" value={config.font} options={labelsOf(THEME_FONTS)} onChange={(v) => set("font", v)} />
                <ChoiceGroup label="제목 글꼴" name="displayFont" value={config.displayFont} options={labelsOf(THEME_DISPLAY_FONTS)} onChange={(v) => set("displayFont", v)} />
                <ChoiceGroup label="기본 글자 크기" name="fontScale" value={config.fontScale} options={labelsOf(THEME_FONT_SCALES)} onChange={(v) => set("fontScale", v)} />
              </>
            ))}
            {item("shape", "모양", (
              <>
                <RangeField label="모서리 둥글기" value={config.radius} display={`${config.radius}rem`} {...THEME_LIMITS.radius} onChange={(v) => set("radius", v)} />
                <ChoiceGroup label="버튼 모양" name="buttonShape" value={config.buttonShape} options={THEME_BUTTON_SHAPES} onChange={(v) => set("buttonShape", v)} />
              </>
            ))}
            {item("motion", "모션 (AOS)", (
              <>
                <ToggleRow label="스크롤 등장 애니메이션" hint="콘텐츠 블록이 스크롤에 맞춰 나타납니다." checked={config.aosEnabled} onChange={(v) => set("aosEnabled", v)} />
                {config.aosEnabled ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="aosAnimation">애니메이션 종류</Label>
                      <select id="aosAnimation" value={config.aosAnimation} onChange={(e) => set("aosAnimation", e.target.value as ThemeConfig["aosAnimation"])} className="h-8 w-full rounded-lg border border-input bg-[hsl(var(--field))] px-2 text-sm">
                        {AOS_ANIMATIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <RangeField label="지속 시간" value={config.aosDuration} display={`${config.aosDuration}ms`} {...THEME_LIMITS.aosDuration} onChange={(v) => set("aosDuration", v)} />
                    <RangeField label="블록 간 지연" value={config.aosStagger} display={`${config.aosStagger}ms`} {...THEME_LIMITS.aosStagger} onChange={(v) => set("aosStagger", v)} />
                    <RangeField label="시작 거리 (offset)" value={config.aosOffset} display={`${config.aosOffset}px`} {...THEME_LIMITS.aosOffset} onChange={(v) => set("aosOffset", v)} />
                    <ToggleRow label="모바일·태블릿에서도 사용" hint="끄면 1024px 미만에서는 애니메이션 없이 바로 보입니다." checked={config.aosOnMobile} onChange={(v) => set("aosOnMobile", v)} />
                  </>
                ) : null}
              </>
            ))}
            {item("convenience", "편의 기능", (
              <ToggleRow label="맨 위로 버튼" hint="스크롤을 내리면 오른쪽 아래에 TOP 버튼을 보여줍니다." checked={config.scrollTopEnabled} onChange={(v) => set("scrollTopEnabled", v)} />
            ))}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-2 py-1.5">
        <p className={cn("min-w-0 truncate text-xs", message ? (message.ok ? "text-green-600" : "text-destructive") : "text-muted-foreground")}>
          {message ? message.text : dirty ? "저장하지 않은 변경이 있습니다." : "변경 사항 없음"}
        </p>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => preview(DEFAULT_THEME)} disabled={pending}>기본값</Button>
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => preview(saved)} disabled={pending || !dirty}>되돌리기</Button>
        </div>
      </div>
    </div>
  )
}
