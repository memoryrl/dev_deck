// 사이트 테마 설정 — glow_platform의 테마 원격 제어기를 devdeck 토큰 체계(CSS 변수)에 맞게 옮긴 것.
// 서버(저장·검증)와 클라이언트(미리보기)가 같이 쓰므로 server-only 의존성을 두지 않는다.

export const THEME_FONTS = {
  default: { label: "기본 (Inter)", stack: null },
  system: {
    label: "시스템 고딕",
    stack: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  },
  serif: { label: "명조·세리프", stack: 'Georgia, "Noto Serif KR", "Nanum Myeongjo", serif' },
} as const
export type ThemeFont = keyof typeof THEME_FONTS

export const THEME_DISPLAY_FONTS = {
  default: { label: "기본 (Public Sans)", stack: null },
  body: { label: "본문과 동일", stack: "inherit" },
  serif: { label: "명조·세리프", stack: 'Georgia, "Noto Serif KR", "Nanum Myeongjo", serif' },
  system: { label: "시스템 고딕", stack: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif' },
} as const
export type ThemeDisplayFont = keyof typeof THEME_DISPLAY_FONTS

export const THEME_HERO_TRANSITIONS = {
  slide: "좌우 전환 (기본) · 좌우 버튼·드래그",
  scroll: "세로 스크롤 전환 · 내리면 사무실로 바뀜",
} as const
export type ThemeHeroTransition = keyof typeof THEME_HERO_TRANSITIONS

export const THEME_COLOR_MODES = { light: "라이트", dark: "다크", system: "시스템 설정 따라가기" } as const
export type ThemeColorMode = keyof typeof THEME_COLOR_MODES

export const THEME_FONT_SCALES = { sm: { label: "작게", percent: 93.75 }, md: { label: "보통", percent: 100 }, lg: { label: "크게", percent: 109.375 } } as const
export type ThemeFontScale = keyof typeof THEME_FONT_SCALES

export const THEME_BANNER_STYLES = {
  style1: "스타일 1 · 그라디언트 카드 (기본)",
  style2: "스타일 2 · 와이드 이미지 배경",
  style3: "스타일 3 · 로봇 회의실 (3D)",
} as const
export type ThemeBannerStyle = keyof typeof THEME_BANNER_STYLES

// 스타일 2 배경 — public/hero 의 기존 이미지만 허용 목록으로 쓴다(임의 URL 불가).
export const THEME_BANNER_IMAGES = {
  stone: { label: "스톤", src: "/hero/stone.jpg" },
  silk: { label: "실크", src: "/hero/silk.jpg" },
  dusk: { label: "노을", src: "/hero/dusk.jpg" },
  desk: { label: "데스크", src: "/hero/desk.jpg" },
  arch: { label: "건축", src: "/hero/arch.jpg" },
  ember: { label: "불씨", src: "/hero/ember.jpg" },
} as const
export type ThemeBannerImage = keyof typeof THEME_BANNER_IMAGES | "random"

export const THEME_BUTTON_SHAPES = { default: "기본 라운드", pill: "알약형", square: "각진 형" } as const
export type ThemeButtonShape = keyof typeof THEME_BUTTON_SHAPES

// 배경·카드 프리셋 — [light, dark] 토큰 묶음. parchment(기본)는 globals.css 값을 그대로 쓴다.
type SurfaceTokens = Record<"background" | "card" | "muted" | "secondary" | "border", string>
export const THEME_SURFACES: Record<string, { label: string; swatch: string; tokens: [SurfaceTokens, SurfaceTokens] | null }> = {
  parchment: { label: "파치먼트 (기본)", swatch: "#f6f1e9", tokens: null },
  mist: {
    label: "미스트 그레이",
    swatch: "#f2f4f7",
    tokens: [
      { background: "210 20% 96%", card: "210 25% 99%", muted: "210 16% 92%", secondary: "210 18% 90%", border: "210 14% 85%" },
      { background: "215 16% 8%", card: "215 14% 11%", muted: "215 12% 15%", secondary: "215 12% 15%", border: "215 12% 22%" },
    ],
  },
  paper: {
    label: "페이퍼 화이트",
    swatch: "#ffffff",
    tokens: [
      { background: "0 0% 100%", card: "0 0% 100%", muted: "0 0% 96%", secondary: "0 0% 94%", border: "0 0% 88%" },
      { background: "0 0% 6%", card: "0 0% 9%", muted: "0 0% 14%", secondary: "0 0% 14%", border: "0 0% 20%" },
    ],
  },
  sage: {
    label: "세이지 그린",
    swatch: "#eef2ea",
    tokens: [
      { background: "100 18% 94%", card: "100 25% 98%", muted: "100 14% 90%", secondary: "100 14% 87%", border: "100 12% 80%" },
      { background: "120 10% 7%", card: "120 8% 10%", muted: "120 7% 14%", secondary: "120 7% 14%", border: "120 7% 20%" },
    ],
  },
  blush: {
    label: "블러시 로즈",
    swatch: "#f8ece6",
    tokens: [
      { background: "20 40% 95%", card: "20 50% 98%", muted: "20 25% 91%", secondary: "20 28% 88%", border: "20 20% 82%" },
      { background: "10 12% 7%", card: "10 10% 10%", muted: "10 9% 14%", secondary: "10 9% 14%", border: "10 9% 21%" },
    ],
  },
}
export type ThemeSurface = keyof typeof THEME_SURFACES

export const AOS_ANIMATIONS = ["fade-up", "fade-right", "fade-left", "zoom-in", "flip-up"] as const
export type AosAnimation = (typeof AOS_ANIMATIONS)[number]

export type ThemeConfig = {
  accentColor: string
  deepColor: string
  font: ThemeFont
  radius: number
  containerWidth: number
  aosEnabled: boolean
  aosAnimation: AosAnimation
  aosDuration: number
  scrollTopEnabled: boolean
  colorMode: ThemeColorMode
  surface: ThemeSurface
  displayFont: ThemeDisplayFont
  fontScale: ThemeFontScale
  bannerStyle: ThemeBannerStyle
  bannerImage: ThemeBannerImage
  buttonShape: ThemeButtonShape
  /** 0 = 콘텐츠 너비와 동일 */
  headerWidth: number
  footerWidth: number
  aosStagger: number
  aosOffset: number
  aosOnMobile: boolean
  marqueeSeconds: number
  heroTopology: boolean
  heroTransition: ThemeHeroTransition
  dashboard3d: boolean
}

export const DEFAULT_THEME: ThemeConfig = {
  accentColor: "#c4a574",
  deepColor: "#6b4f3a",
  font: "default",
  radius: 0.5,
  containerWidth: 1152,
  aosEnabled: true,
  aosAnimation: "fade-up",
  aosDuration: 700,
  scrollTopEnabled: true,
  colorMode: "light",
  surface: "parchment",
  displayFont: "default",
  fontScale: "md",
  bannerStyle: "style1",
  bannerImage: "random",
  buttonShape: "default",
  headerWidth: 0,
  footerWidth: 0,
  aosStagger: 80,
  aosOffset: 60,
  aosOnMobile: false,
  marqueeSeconds: 36,
  heroTopology: true,
  heroTransition: "slide",
  dashboard3d: true,
}

export const THEME_LIMITS = {
  radius: { min: 0, max: 1.25, step: 0.125 },
  containerWidth: { min: 960, max: 1440, step: 16 },
  aosDuration: { min: 300, max: 1500, step: 100 },
  aosStagger: { min: 0, max: 200, step: 50 },
  aosOffset: { min: 0, max: 200, step: 10 },
  marqueeSeconds: { min: 12, max: 80, step: 4 },
} as const

const HEX = /^#[0-9a-fA-F]{6}$/

const clamp = (value: unknown, { min, max }: { min: number; max: number }, fallback: number) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback)
// 허용 목록(객체 키)에 있는 값만 통과 — 임의 문자열이 CSS로 흘러가지 않게 한다.
const pick = <K extends string>(value: unknown, allowed: Record<K, unknown>, fallback: K): K =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(allowed, value) ? (value as K) : fallback
const optionalWidth = (value: unknown) => (Number(value) > 0 ? clamp(value, THEME_LIMITS.containerWidth, 0) : 0)

// DB·클라이언트에서 온 값은 신뢰하지 않는다 — 여기서 걸러진 값만 <style>로 나간다(CSS 주입 방지).
export function sanitizeTheme(raw: unknown): ThemeConfig {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_THEME
  return {
    accentColor: typeof src.accentColor === "string" && HEX.test(src.accentColor) ? src.accentColor.toLowerCase() : d.accentColor,
    deepColor: typeof src.deepColor === "string" && HEX.test(src.deepColor) ? src.deepColor.toLowerCase() : d.deepColor,
    font: pick(src.font, THEME_FONTS, d.font),
    radius: clamp(src.radius, THEME_LIMITS.radius, d.radius),
    containerWidth: clamp(src.containerWidth, THEME_LIMITS.containerWidth, d.containerWidth),
    aosEnabled: typeof src.aosEnabled === "boolean" ? src.aosEnabled : d.aosEnabled,
    aosAnimation: AOS_ANIMATIONS.includes(src.aosAnimation as AosAnimation) ? (src.aosAnimation as AosAnimation) : d.aosAnimation,
    aosDuration: clamp(src.aosDuration, THEME_LIMITS.aosDuration, d.aosDuration),
    scrollTopEnabled: bool(src.scrollTopEnabled, d.scrollTopEnabled),
    colorMode: pick(src.colorMode, THEME_COLOR_MODES, d.colorMode),
    surface: pick(src.surface, THEME_SURFACES, d.surface),
    displayFont: pick(src.displayFont, THEME_DISPLAY_FONTS, d.displayFont),
    fontScale: pick(src.fontScale, THEME_FONT_SCALES, d.fontScale),
    bannerStyle: pick(src.bannerStyle, THEME_BANNER_STYLES, d.bannerStyle),
    bannerImage: pick<ThemeBannerImage>(src.bannerImage, { ...THEME_BANNER_IMAGES, random: 0 }, "random"),
    buttonShape: pick(src.buttonShape, THEME_BUTTON_SHAPES, d.buttonShape),
    headerWidth: optionalWidth(src.headerWidth),
    footerWidth: optionalWidth(src.footerWidth),
    aosStagger: clamp(src.aosStagger, THEME_LIMITS.aosStagger, d.aosStagger),
    aosOffset: clamp(src.aosOffset, THEME_LIMITS.aosOffset, d.aosOffset),
    aosOnMobile: bool(src.aosOnMobile, d.aosOnMobile),
    marqueeSeconds: clamp(src.marqueeSeconds, THEME_LIMITS.marqueeSeconds, d.marqueeSeconds),
    heroTopology: bool(src.heroTopology, d.heroTopology),
    heroTransition: pick(src.heroTransition, THEME_HERO_TRANSITIONS, d.heroTransition),
    dashboard3d: bool(src.dashboard3d, d.dashboard3d),
  }
}

export function parseTheme(json: string | null | undefined): ThemeConfig {
  if (!json) return DEFAULT_THEME
  try {
    return sanitizeTheme(JSON.parse(json))
  } catch {
    return DEFAULT_THEME
  }
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l * 100]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, s * 100, l * 100]
}

const triplet = ([h, s, l]: [number, number, number]) => `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`
const shiftL = ([h, s, l]: [number, number, number], delta: number): [number, number, number] => [h, s, Math.min(85, Math.max(15, l + delta))]

// 기본값과 다른 항목만 내보낸다 — 아무것도 안 바꿨으면 빈 문자열(기존 스타일 그대로).
// 다크 모드는 기본 팔레트가 라이트 대비 보이는 만큼(champagne -5, cognac +16 명도)만 옮겨 가독성을 유지한다.
export function themeCss(config: ThemeConfig): string {
  const d = DEFAULT_THEME
  const light: string[] = []
  const dark: string[] = []
  if (config.accentColor !== d.accentColor) {
    const hsl = hexToHsl(config.accentColor)
    light.push(`--lux-champagne:${triplet(hsl)}`, `--ring:${triplet(hsl)}`)
    dark.push(`--lux-champagne:${triplet(shiftL(hsl, -5))}`, `--ring:${triplet(hsl)}`)
  }
  if (config.deepColor !== d.deepColor) {
    const hsl = hexToHsl(config.deepColor)
    light.push(`--lux-cognac:${triplet(hsl)}`)
    dark.push(`--lux-cognac:${triplet(shiftL(hsl, 16))}`)
  }
  if (config.radius !== d.radius) light.push(`--radius:${config.radius}rem`)
  if (config.containerWidth !== d.containerWidth) light.push(`--container-max:${config.containerWidth}px`)
  if (config.headerWidth) light.push(`--container-max-header:${config.headerWidth}px`)
  if (config.footerWidth) light.push(`--container-max-footer:${config.footerWidth}px`)
  const surface = THEME_SURFACES[config.surface].tokens
  if (surface) {
    // popover는 card, accent·input은 secondary·border와 같은 값으로 묶는다.
    const tokenCss = (t: SurfaceTokens) =>
      `--background:${t.background};--card:${t.card};--popover:${t.card};--muted:${t.muted};--secondary:${t.secondary};--accent:${t.secondary};--border:${t.border};--input:${t.border}`
    light.push(tokenCss(surface[0]))
    dark.push(tokenCss(surface[1]))
  }

  let css = ""
  if (light.length) css += `:root{${light.join(";")}}`
  if (dark.length) css += `.dark{${dark.join(";")}}`
  const stack = THEME_FONTS[config.font].stack
  // next/font가 body 클래스에 거는 font-family를 이기도록 [class]로 명시도를 올린다.
  if (stack) css += `html body[class]{font-family:${stack}}`
  const displayStack = THEME_DISPLAY_FONTS[config.displayFont].stack
  if (displayStack) css += `.font-display{font-family:${displayStack}}`
  if (config.fontScale !== d.fontScale) css += `html{font-size:${THEME_FONT_SCALES[config.fontScale].percent}%}`
  // 아래 훅(data-ui=button, theme-w-*)은 해당 컴포넌트에 달려 있다.
  if (config.buttonShape === "pill") css += '[data-ui="button"]{border-radius:9999px}'
  if (config.buttonShape === "square") css += '[data-ui="button"]{border-radius:0.25rem}'
  if (config.marqueeSeconds !== d.marqueeSeconds) css += `.animate-marquee{animation-duration:${config.marqueeSeconds}s}`
  return css
}
