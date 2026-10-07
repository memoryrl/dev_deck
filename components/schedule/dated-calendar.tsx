"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { PanelCloseButton, SplitPanel } from "@/components/schedule/split-panel"
import type { ScheduleEvent, ScheduleRange } from "@/components/schedule/schedule-calendar"
import { ScheduleCalendarLazy } from "@/components/schedule/schedule-calendar-lazy"
import { fetchCalendarCounts, fetchCalendarDay } from "@/lib/calendar/actions"
import { Skeleton } from "@/components/ui/skeleton"
import { kstDateKey } from "@/lib/calendar/kst"
import type { CalendarCount, CalendarDayItem } from "@/lib/calendar/sources"

// 관리자 목록 화면 공용 "캘린더 탭": 좌측 스케줄러(하루별 건수 칩) + 우측 선택한 날짜의 상세 목록.
// 화면마다 source 이름(lib/calendar/sources.ts 레지스트리)만 넘기면 된다.
const DAY_LABEL = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" })
const TIME_LABEL = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })
const labelOf = (date: string) => DAY_LABEL.format(new Date(`${date}T12:00:00+09:00`))
const DAY_LIMIT = 200

function ItemTitle({ item }: { item: CalendarDayItem }) {
  const className = "min-w-0 break-words text-sm font-semibold leading-snug"
  if (!item.href) return <p className={className}>{item.title}</p>
  const external = /^https?:\/\//.test(item.href)
  return external ? (
    <a href={item.href} target="_blank" rel="noreferrer" className={`${className} underline-offset-2 hover:underline`}>
      {item.title}
    </a>
  ) : (
    <Link href={item.href} className={`${className} underline-offset-2 hover:underline`}>
      {item.title}
    </Link>
  )
}

export function DatedCalendar({
  source,
  storageKey,
  emptyHint = "이 날짜의 기록이 없습니다.",
  initialDate = null,
  initialItems,
}: {
  source: string
  storageKey?: string
  emptyHint?: string
  /** 서버가 미리 가져온 "오늘"(KST)과 그날의 목록 — 있으면 첫 진입에 "불러오는 중"이 뜨지 않는다 */
  initialDate?: string | null
  initialItems?: CalendarDayItem[]
}) {
  const [range, setRange] = useState<ScheduleRange | null>(null)
  const [counts, setCounts] = useState<CalendarCount[]>([])
  const [selected, setSelected] = useState<string | null>(initialDate)
  const [items, setItems] = useState<CalendarDayItem[]>(initialItems ?? [])
  // 서버가 준 첫 날짜는 다시 가져오지 않는다.
  const prefetched = useRef(initialDate !== null && initialItems !== undefined ? initialDate : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 같은 기간이면 state를 건드리지 않는다 — 달력이 옵션을 다시 적용하며 같은 기간으로 datesSet을 또 쏴도 재렌더 루프가 안 생기게.
  const handleRange = useCallback(
    (next: ScheduleRange) => setRange((prev) => (prev && prev.from === next.from && prev.to === next.to ? prev : next)),
    []
  )

  // 서버가 날짜를 안 준 경우에만 마운트 후 오늘을 선택한다(서버 렌더와 어긋나지 않게).
  useEffect(() => {
    if (initialDate === null) setSelected(kstDateKey(new Date()))
  }, [initialDate])

  useEffect(() => {
    if (!range) return
    let cancelled = false
    fetchCalendarCounts(source, range.from, range.to)
      .then((rows) => !cancelled && setCounts(rows))
      .catch(() => !cancelled && setError("캘린더 데이터를 불러오지 못했습니다."))
    return () => {
      cancelled = true
    }
  }, [source, range])

  useEffect(() => {
    if (!selected) return
    if (prefetched.current === selected) {
      prefetched.current = null
      return
    }
    let cancelled = false
    setLoading(true)
    fetchCalendarDay(source, selected)
      .then((rows) => !cancelled && setItems(rows))
      .catch(() => !cancelled && setError("선택한 날짜의 기록을 불러오지 못했습니다."))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [source, selected])

  const events = useMemo<ScheduleEvent[]>(
    () => counts.map((c) => ({ id: `${c.date}:${c.key}`, date: c.date, title: `${c.label} ${c.count}`, tone: c.tone })),
    [counts]
  )

  return (
    <>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <SplitPanel
        storageKey={storageKey ?? `devdeck.calendar.${source}.panelRatio`}
        main={
          <div className="rounded-xl border bg-white p-3 dark:bg-card sm:p-5">
            <ScheduleCalendarLazy events={events} selectedDate={selected} onSelectDate={setSelected} onRangeChange={handleRange} />
          </div>
        }
        panelTitle={selected ? labelOf(selected) : "날짜를 선택하세요"}
        panelAction={selected ? <PanelCloseButton onClick={() => { setSelected(null); setItems([]) }} /> : null}
        panel={
          !selected ? (
            <p className="p-6 text-center text-sm text-muted-foreground">캘린더에서 날짜를 누르면 그날의 상세 정보가 여기에 표시됩니다.</p>
          ) : loading ? (
            <div className="space-y-3 p-4" role="status" aria-label="불러오는 중">
              {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{emptyHint}</p>
          ) : (
            <>
              <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">총 {items.length}건{items.length >= DAY_LIMIT ? ` (하루 최대 ${DAY_LIMIT}건까지 표시)` : ""}</p>
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{TIME_LABEL.format(new Date(item.time))}</span>
                      {item.badge ? <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 font-semibold text-foreground/80">{item.badge}</span> : null}
                    </div>
                    <ItemTitle item={item} />
                    {item.subtitle ? <p className="break-words text-xs leading-relaxed text-muted-foreground">{item.subtitle}</p> : null}
                    {item.meta?.map((line) => (
                      <p key={line} className="break-all text-[11px] text-muted-foreground/80">{line}</p>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          )
        }
      />
    </>
  )
}
