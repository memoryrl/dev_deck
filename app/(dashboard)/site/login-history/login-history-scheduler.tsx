"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { PanelCloseButton, SplitPanel } from "@/components/schedule/split-panel"
import type { ScheduleEvent, ScheduleRange } from "@/components/schedule/schedule-calendar"
import { ScheduleCalendarLazy } from "@/components/schedule/schedule-calendar-lazy"
import { cn } from "@/lib/utils"
import type { LoginHistoryEntry } from "@/types/login-history"
import { fetchDailyCounts, fetchHistoryByDate } from "./actions"
import { LoginHistoryRow } from "./login-history-row"

type DailyCount = { date: string; login: number; visit: number }
type Filter = "all" | "login" | "visit"
type Day = { entries: LoginHistoryEntry[]; pageCounts: Record<string, number> }

const KST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })
const DAY_LABEL = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" })
// 날짜 문자열(YYYY-MM-DD)을 정오 기준으로 만들어 어느 시간대에서도 같은 날로 읽히게 한다.
const labelOf = (date: string) => DAY_LABEL.format(new Date(`${date}T12:00:00+09:00`))

export function LoginHistoryScheduler() {
  const [range, setRange] = useState<ScheduleRange | null>(null)
  const [counts, setCounts] = useState<DailyCount[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [day, setDay] = useState<Day | null>(null)
  const [loadingDay, setLoadingDay] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")
  const [error, setError] = useState<string | null>(null)

  // 같은 기간이면 state를 건드리지 않는다 — 달력이 옵션을 다시 적용하며 같은 기간으로 datesSet을 또 쏴도 재렌더 루프가 안 생기게.
  const handleRange = useCallback(
    (next: ScheduleRange) => setRange((prev) => (prev && prev.from === next.from && prev.to === next.to ? prev : next)),
    []
  )

  // 처음엔 오늘을 선택한다(서버 렌더와 어긋나지 않게 마운트 후에).
  useEffect(() => setSelected(KST_DAY.format(new Date())), [])

  useEffect(() => {
    if (!range) return
    let cancelled = false
    fetchDailyCounts(range.from, range.to)
      .then((rows) => !cancelled && setCounts(rows))
      .catch(() => !cancelled && setError("캘린더 데이터를 불러오지 못했습니다."))
    return () => {
      cancelled = true
    }
  }, [range])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoadingDay(true)
    setFilter("all")
    fetchHistoryByDate(selected)
      .then((result) => !cancelled && setDay(result))
      .catch(() => !cancelled && setError("선택한 날짜의 이력을 불러오지 못했습니다."))
      .finally(() => !cancelled && setLoadingDay(false))
    return () => {
      cancelled = true
    }
  }, [selected])

  const events = useMemo<ScheduleEvent[]>(
    () =>
      counts.flatMap((c) => [
        ...(c.login ? [{ id: `${c.date}:login`, date: c.date, title: `로그인 ${c.login}`, tone: "strong" as const }] : []),
        ...(c.visit ? [{ id: `${c.date}:visit`, date: c.date, title: `접속 ${c.visit}`, tone: "soft" as const }] : []),
      ]),
    [counts]
  )

  const entries = day?.entries ?? []
  const loginCount = entries.filter((e) => e.event_type === "login").length
  const visible = filter === "all" ? entries : entries.filter((e) => e.event_type === filter)
  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "전체", count: entries.length },
    { id: "login", label: "로그인", count: loginCount },
    { id: "visit", label: "접속", count: entries.length - loginCount },
  ]

  return (
    <>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <SplitPanel
        storageKey="devdeck.loginHistory.panelRatio"
        main={
          <div className="rounded-xl border bg-white p-3 dark:bg-card sm:p-5">
            <ScheduleCalendarLazy events={events} selectedDate={selected} onSelectDate={setSelected} onRangeChange={handleRange} />
          </div>
        }
        panelTitle={selected ? labelOf(selected) : "날짜를 선택하세요"}
        panelAction={selected ? <PanelCloseButton onClick={() => { setSelected(null); setDay(null) }} /> : null}
        panel={
          !selected ? (
            <p className="p-6 text-center text-sm text-muted-foreground">캘린더에서 날짜를 누르면 그날의 로그인·접속 이력이 여기에 표시됩니다.</p>
          ) : loadingDay ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              불러오는 중…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 border-b px-4 py-2.5">
                {chips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id)}
                    aria-pressed={filter === chip.id}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      filter === chip.id ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-muted-foreground hover:border-foreground/30"
                    )}
                  >
                    {chip.label} {chip.count}
                  </button>
                ))}
              </div>
              {visible.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">이 날짜의 이력이 없습니다.</p>
              ) : (
                <ul className="divide-y">
                  {visible.map((entry, index) => (
                    <LoginHistoryRow key={entry.id} entry={entry} number={visible.length - index} pageCount={day?.pageCounts[entry.id] ?? 0} compact />
                  ))}
                </ul>
              )}
              {entries.length >= 300 ? <p className="border-t px-4 py-2 text-xs text-muted-foreground">하루 최대 300건까지 표시합니다. 더 보려면 전체목록 탭의 검색을 쓰세요.</p> : null}
            </>
          )
        }
      />
    </>
  )
}
