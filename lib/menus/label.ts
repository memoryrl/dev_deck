import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config"
import type { MenuLabels, NavNode } from "@/types/menu"

/** DB에 저장된 한글(또는 브랜드) 라벨 → locales 키. labels JSON이 비어 있을 때 보조. */
export const PUBLIC_MENU_LABEL_KEYS: Record<string, string> = {
  "AI Prompt": "mega.prompt.label",
  "공개 프롬프트": "footer.publicPrompts",
  "AI 프롬프트 목록": "mega.prompt.public",
  "허브 홈": "mega.prompt.home",
  "추천 프롬프트": "mega.prompt.top",
  "프롬프트 관리": "mega.prompt.manage",
  "커리어로그": "mega.career.label",
  "전체 글": "mega.career.posts",
  "그동안의 업무내용": "mega.career.all",
  "최근 커리어": "mega.career.recent",
  "스킬": "mega.career.skills",
  "스킬 추천": "mega.career.skillsTop",
  "글·스킬 관리": "mega.career.manage",
  "게임리뷰": "mega.games.label",
  "게임 목록": "mega.games.list",
  "추천 게임": "mega.games.featured",
  "추천 글": "mega.games.featured",
  "리뷰 관리": "mega.games.manage",
  "커뮤니티": "mega.community.label",
  "공지사항": "mega.community.notice",
  "자유게시판": "mega.community.free",
  "둘러보기": "footer.browse",
  "홈": "common.home",
  "커리어": "footer.career",
  "게임": "footer.games",
  PromptKit: "nav.promptkit",
  "대시보드": "footer.dashboard",
  CareerLog: "nav.career",
  "게시판": "footer.board",
  Steam: "steam.title",
  "라이브러리": "footer.library",
  "리뷰": "footer.reviews",
}

export function inferMenuLabelKey(label: string): string | undefined {
  return PUBLIC_MENU_LABEL_KEYS[label]
}

export function resolveMenuLabelKey(item: { label: string; labelKey?: string | null }) {
  return item.labelKey || inferMenuLabelKey(item.label) || null
}

export function parseMenuLabels(value: unknown, fallbackLabel?: string): MenuLabels {
  const out: MenuLabels = {}
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    for (const locale of SUPPORTED_LOCALES) {
      const text = record[locale]
      if (typeof text === "string" && text.trim()) out[locale] = text.trim()
    }
  }
  if (!out[DEFAULT_LOCALE] && fallbackLabel?.trim()) {
    out[DEFAULT_LOCALE] = fallbackLabel.trim()
  }
  return out
}

export function buildMenuLabels(ko: string, en?: string | null): MenuLabels {
  const labels: MenuLabels = { ko: ko.trim() }
  const english = en?.trim()
  if (english) labels.en = english
  return labels
}

export type MenuLabelSource = {
  label: string
  labelKey?: string | null
  labels?: MenuLabels | null
}

export function menuLabel(
  t: (key: string) => string,
  item: MenuLabelSource,
  locale: AppLocale = DEFAULT_LOCALE
) {
  const parsed = parseMenuLabels(item.labels, item.label)
  const fromDb = parsed[locale] || (locale === DEFAULT_LOCALE ? parsed.ko : undefined)
  if (fromDb) return fromDb

  const key = resolveMenuLabelKey(item)
  if (key) {
    const translated = t(key)
    if (translated && translated !== key) return translated
  }
  return parsed.ko || parsed.en || item.label
}

export function localizeNavNodes(
  nodes: NavNode[],
  t: (key: string) => string,
  locale: AppLocale = DEFAULT_LOCALE
): NavNode[] {
  return nodes.map((node) => {
    const labels = parseMenuLabels(node.labels, node.label)
    const labelKey = resolveMenuLabelKey(node)
    return {
      ...node,
      labels,
      labelKey,
      label: menuLabel(t, { label: node.label, labelKey, labels }, locale),
      children: node.children.map((child) => {
        const childLabels = parseMenuLabels(child.labels, child.label)
        const childKey = resolveMenuLabelKey(child)
        return {
          ...child,
          labels: childLabels,
          labelKey: childKey,
          label: menuLabel(t, { label: child.label, labelKey: childKey, labels: childLabels }, locale),
        }
      }),
    }
  })
}
