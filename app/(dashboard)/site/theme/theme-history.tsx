"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { History, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { showAlert, showConfirm } from "@/lib/ui/layer-dialog"
import { THEME_BUTTON_SHAPES, THEME_FONTS, THEME_SURFACES } from "@/lib/site/theme-config"
import type { ThemeHistoryEntry } from "@/lib/site/theme"
import { saveThemeConfig } from "./actions"

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))

export function ThemeHistory({ entries, currentId }: { entries: ThemeHistoryEntry[]; currentId: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  const restore = async (entry: ThemeHistoryEntry) => {
    if (!(await showConfirm(`${fmt(entry.savedAt)} 버전으로 복원할까요? 현재 테마가 이 설정으로 바뀌고 새 이력으로 남습니다.`))) return
    setBusy(entry.id)
    startTransition(async () => {
      const result = await saveThemeConfig(entry.config, `복원: ${fmt(entry.savedAt)}`)
      setBusy(null)
      if (!result.ok) {
        await showAlert(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <section>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <History className="size-5" />
        테마 변경 이력
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">최근 {entries.length}건 (최대 30건). 복원하면 그 설정이 새 이력으로 저장됩니다.</p>
      {entries.length === 0 ? (
        <p className="mt-4 border-y border-foreground/15 bg-white px-4 py-6 text-sm text-muted-foreground dark:bg-card">
          아직 저장한 테마가 없습니다. 원격 제어기에서 저장하면 여기에 쌓입니다.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-foreground/15 border-y border-foreground/15 bg-white dark:bg-card">
          {entries.map((entry, i) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 sm:w-52 sm:shrink-0">
                <p className="text-sm font-medium">
                  {fmt(entry.savedAt)}
                  {i === 0 ? <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">현재</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.savedBy || "-"}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="size-4 rounded-full border" style={{ backgroundColor: entry.config.accentColor }} title={entry.config.accentColor} />
                <span className="size-4 rounded-full border" style={{ backgroundColor: entry.config.deepColor }} title={entry.config.deepColor} />
                <span>{THEME_SURFACES[entry.config.surface].label}</span>
                <span>· {THEME_FONTS[entry.config.font].label}</span>
                <span>· {THEME_BUTTON_SHAPES[entry.config.buttonShape]}</span>
                <span>· {entry.config.radius}rem</span>
                <span>· {entry.config.containerWidth}px</span>
                <span>· AOS {entry.config.aosEnabled ? entry.config.aosAnimation : "off"}</span>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={pending || entry.id === currentId} onClick={() => restore(entry)}>
                <RotateCcw className="mr-1 size-3.5" />
                {busy === entry.id ? "복원 중…" : "복원"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
