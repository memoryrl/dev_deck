"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import multiMonthPlugin from "@fullcalendar/multimonth"
import koLocale from "@fullcalendar/core/locales/ko"
import type { DatesSetArg, DayCellContentArg, EventClickArg } from "@fullcalendar/core"
import type { DateClickArg } from "@fullcalendar/interaction"

// kware_aew의 FullCalendar 위젯(월/주/연 보기, 일 클릭, 일·토 색)을 devdeck에 맞게 옮긴 공용 스케줄러.
// 데이터는 "하루에 붙는 칩" 형태로만 받는다 — 화면마다 이벤트를 자기 방식으로 집계해서 넘긴다.

export type ScheduleEvent = {
  id: string
  /** YYYY-MM-DD */
  date: string
  title: string
  tone: "strong" | "soft"
}

export type ScheduleRange = { from: string; to: string }

// FullCalendar React는 렌더마다 prop 참조가 바뀌면 옵션을 전부 다시 적용(resetOptions)하고 datesSet을 다시 쏜다.
// 그 콜백이 부모 state를 바꾸면 무한 재렌더가 되므로(Maximum update depth), 정적인 옵션은 모듈 상수로 둔다.
const PLUGINS = [dayGridPlugin, interactionPlugin, multiMonthPlugin]
const LOCALES = [koLocale]
const HEADER_TOOLBAR = { left: "prev,next today", center: "title", right: "dayGridMonth,dayGridWeek,multiMonthYear" }
const BUTTON_TEXT = { today: "오늘", month: "월", week: "주", year: "연" }
const VIEWS = { multiMonthYear: { multiMonthMaxColumns: 3, multiMonthMinWidth: 220 } }
const renderDayNumber = (arg: DayCellContentArg) => arg.dayNumberText.replace("일", "")

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export function ScheduleCalendar({
  events,
  selectedDate,
  onSelectDate,
  onRangeChange,
}: {
  events: ScheduleEvent[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  /** 보이는 기간이 바뀔 때(이동·보기 전환) — to는 미포함 */
  onRangeChange: (range: ScheduleRange) => void
}) {
  // FullCalendar는 콜백 prop이 바뀌어도 재설정하지 않으므로 최신 함수를 ref로 읽는다.
  const rangeCb = useRef(onRangeChange)
  rangeCb.current = onRangeChange

  // FullCalendar는 "창 크기"가 바뀔 때만 다시 계산한다. 스플리터로 컬럼 폭만 바뀌면 이전 폭 그대로 그려져
  // 오른쪽이 잘려 보이므로, 컨테이너 크기를 직접 지켜보다가 updateSize()를 호출한다.
  const box = useRef<HTMLDivElement>(null)
  const calendar = useRef<FullCalendar>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => calendar.current?.getApi().updateSize())
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  const calendarEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        start: e.date,
        title: e.title,
        allDay: true,
        classNames: [e.tone === "strong" ? "sched-ev-strong" : "sched-ev-soft"],
      })),
    [events]
  )
  const selectRef = useRef(onSelectDate)
  selectRef.current = onSelectDate
  const handleDateClick = useCallback((arg: DateClickArg) => selectRef.current(arg.dateStr.slice(0, 10)), [])
  const handleEventClick = useCallback((arg: EventClickArg) => {
    arg.jsEvent.preventDefault()
    if (arg.event.startStr) selectRef.current(arg.event.startStr.slice(0, 10))
  }, [])
  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => rangeCb.current({ from: arg.startStr.slice(0, 10), to: arg.endStr.slice(0, 10) }),
    []
  )
  const dayCellClassNames = useCallback(
    (arg: { date: Date }) => {
      const classes: string[] = []
      if (arg.date.getDay() === 0) classes.push("sched-sun")
      if (arg.date.getDay() === 6) classes.push("sched-sat")
      if (selectedDate && dayKey(arg.date) === selectedDate) classes.push("sched-selected")
      return classes
    },
    [selectedDate]
  )

  return (
    <div ref={box} className="schedule-calendar min-w-0">
      <FullCalendar
        ref={calendar}
        plugins={PLUGINS}
        locales={LOCALES}
        locale="ko"
        initialView="dayGridMonth"
        headerToolbar={HEADER_TOOLBAR}
        buttonText={BUTTON_TEXT}
        views={VIEWS}
        height="auto"
        fixedWeekCount={false}
        dayMaxEvents={3}
        dayCellContent={renderDayNumber}
        events={calendarEvents}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        dayCellClassNames={dayCellClassNames}
      />
    </div>
  )
}
