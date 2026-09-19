import en from "@/locales/en.json"
import { t, type Messages } from "@/lib/i18n/t"
import { buildMenuLabels, inferMenuLabelKey, parseMenuLabels } from "@/lib/menus/label"
import type { MenuLabels } from "@/types/menu"

const EN = en as Messages

function englishFromKey(labelKey: string | null | undefined, fallback: string) {
  if (!labelKey) return fallback
  const translated = t(EN, labelKey)
  return translated && translated !== labelKey ? translated : fallback
}

export function labelsFromKey(label: string, labelKey?: string | null): MenuLabels {
  const key = labelKey || inferMenuLabelKey(label) || null
  return buildMenuLabels(label, englishFromKey(key, label))
}

export function mergeMenuLabels(
  current: unknown,
  label: string,
  labelKey?: string | null
): MenuLabels {
  const existing = parseMenuLabels(current, label)
  const inferred = labelsFromKey(label, labelKey)
  return {
    ko: existing.ko || inferred.ko || label,
    en: existing.en || inferred.en,
  }
}
