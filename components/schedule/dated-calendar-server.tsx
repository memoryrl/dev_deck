import { DatedCalendar } from "@/components/schedule/dated-calendar"
import { kstDateKey } from "@/lib/calendar/kst"
import { isCalendarSource, listCalendarDay } from "@/lib/calendar/sources"

// 관리자 화면 전용 — 첫 진입 날짜(오늘)의 목록을 서버에서 미리 가져와 클라이언트 캘린더에 넘긴다.
// 호출하는 페이지가 이미 관리자 확인을 마친 뒤라 서버 액션처럼 requireOwner를 다시 부르지 않는다.
export async function DatedCalendarServer(props: Omit<React.ComponentProps<typeof DatedCalendar>, "initialDate" | "initialItems">) {
  const today = kstDateKey(new Date())
  const items = isCalendarSource(props.source) ? await listCalendarDay(props.source, today).catch(() => undefined) : undefined
  return <DatedCalendar {...props} initialDate={items ? today : null} initialItems={items} />
}
