"use client"

import { useMemo, useState } from "react"
import { PanelCloseButton, SplitPanel } from "@/components/schedule/split-panel"
import type { ScheduleEvent } from "@/components/schedule/schedule-calendar"
import { ScheduleCalendarLazy } from "@/components/schedule/schedule-calendar-lazy"
import type { ThemeHistoryEntry } from "@/lib/site/theme"
import { ThemeHistoryItems } from "./theme-history"

const KST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })
const DAY_LABEL = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" })
const labelOf = (date: string) => DAY_LABEL.format(new Date(`${date}T12:00:00+09:00`))
const noop = () => {}

// 이력은 최대 30건이라 서버에서 이미 다 받아 두었다 — 날짜별 묶기와 선택은 전부 클라이언트에서 한다.
export function ThemeHistoryScheduler({ entries, currentId }: { entries: ThemeHistoryEntry[]; currentId: string | null }) {
  const byDay = useMemo(() => {
    const map = new Map<string, ThemeHistoryEntry[]>()
    for (const entry of entries) {
      const key = KST_DAY.format(new Date(entry.savedAt))
      map.set(key, [...(map.get(key) ?? []), entry])
    }
    return map
  }, [entries])

  // 처음엔 가장 최근에 변경한 날을 보여 준다(이력이 없으면 비어 있음). 목록은 최신순이다.
  const [selected, setSelected] = useState<string | null>(() => (entries[0] ? KST_DAY.format(new Date(entries[0].savedAt)) : null))

  const events = useMemo<ScheduleEvent[]>(
    () => [...byDay].map(([date, list]) => ({ id: `${date}:theme`, date, title: `변경 ${list.length}`, tone: "strong" as const })),
    [byDay]
  )
  const dayEntries = selected ? (byDay.get(selected) ?? []) : []

  return (
    <SplitPanel
      storageKey="devdeck.themeHistory.panelRatio"
      main={
        <div className="rounded-xl border bg-white p-3 dark:bg-card sm:p-5">
          <ScheduleCalendarLazy events={events} selectedDate={selected} onSelectDate={setSelected} onRangeChange={noop} />
        </div>
      }
      panelTitle={selected ? labelOf(selected) : "날짜를 선택하세요"}
      panelAction={selected ? <PanelCloseButton onClick={() => setSelected(null)} /> : null}
      panel={
        !selected ? (
          <p className="p-6 text-center text-sm text-muted-foreground">캘린더에서 날짜를 누르면 그날의 테마 변경 이력이 여기에 표시됩니다.</p>
        ) : dayEntries.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">이 날짜에는 테마 변경 이력이 없습니다.</p>
        ) : (
          <>
            <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">변경 {dayEntries.length}건 · 복원하면 그 설정이 새 이력으로 저장됩니다.</p>
            <ThemeHistoryItems entries={dayEntries} currentId={currentId} compact />
          </>
        )
      }
    />
  )
}
