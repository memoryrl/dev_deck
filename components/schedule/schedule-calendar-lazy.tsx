"use client"

import dynamic from "next/dynamic"

// FullCalendar는 클라이언트 전용이고 무거워서 캘린더 탭을 열 때만 불러온다(SSR 제외).
export const ScheduleCalendarLazy = dynamic(() => import("./schedule-calendar").then((m) => m.ScheduleCalendar), {
  ssr: false,
  loading: () => <div className="h-[34rem] animate-pulse rounded-xl bg-muted" />,
})
