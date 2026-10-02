"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { themeCss, type ThemeConfig } from "@/lib/site/theme-config"

type Ctx = {
  /** 화면에 적용 중인 값 — 테마 편집 중에는 저장 전 미리보기 값 */
  config: ThemeConfig
  /** DB에 저장된 값 */
  saved: ThemeConfig
  preview: (next: ThemeConfig) => void
}

const ThemeConfigContext = createContext<Ctx | null>(null)

export function ThemeConfigProvider({ initial, nonce, children }: { initial: ThemeConfig; nonce?: string; children: React.ReactNode }) {
  const [config, setConfig] = useState(initial)
  // 저장 후 서버가 새 값을 내려주면 미리보기를 그 값으로 맞춘다.
  const initialKey = JSON.stringify(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 내용이 바뀔 때만 동기화
  useEffect(() => setConfig(initial), [initialKey])
  const value = useMemo(() => ({ config, saved: initial, preview: setConfig }), [config, initial])
  const css = themeCss(config)
  return (
    <ThemeConfigContext.Provider value={value}>
      {css ? <style nonce={nonce} dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {children}
    </ThemeConfigContext.Provider>
  )
}

export function useThemeConfig() {
  const ctx = useContext(ThemeConfigContext)
  if (!ctx) throw new Error("ThemeConfigProvider 밖에서 useThemeConfig를 쓸 수 없습니다.")
  return ctx
}
