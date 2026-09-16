"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { AppLocale } from "@/lib/i18n/config"
import { t, type Messages } from "@/lib/i18n/t"

type I18nValue = {
  locale: AppLocale
  dictionary: Messages
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: AppLocale
  dictionary: Messages
  children: ReactNode
}) {
  const value: I18nValue = {
    locale,
    dictionary,
    t: (key, vars) => t(dictionary, key, vars),
  }
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return value
}
