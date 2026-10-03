"use server"

import { requireOwner } from "@/lib/auth/owner"
import {
  countCalendar,
  isCalendarSource,
  listCalendarDay,
  type CalendarCount,
  type CalendarDayItem,
} from "@/lib/calendar/sources"

// 관리자 목록 화면의 캘린더 탭이 부르는 서버 액션. 서비스 롤로 읽으므로 입구에서 소유자를 확인하고,
// 클라이언트가 보낸 source 이름은 레지스트리에 있는 것만 통과시킨다.
export async function fetchCalendarCounts(source: string, from: string, to: string): Promise<CalendarCount[]> {
  await requireOwner()
  if (!isCalendarSource(source)) return []
  return countCalendar(source, from, to)
}

export async function fetchCalendarDay(source: string, date: string): Promise<CalendarDayItem[]> {
  await requireOwner()
  if (!isCalendarSource(source)) return []
  return listCalendarDay(source, date)
}
