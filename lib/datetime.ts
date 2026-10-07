// 화면에 나오는 날짜·시간은 전부 한국 시간(KST) 기준 — 서버(Vercel=UTC)와 브라우저가 같은 값을 그리게 한다.
// Date의 getHours() 등은 실행 환경 시간대를 따라가서 서버/클라이언트가 서로 다른 글자를 만든다.
export const KST_TIME_ZONE = "Asia/Seoul"

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: KST_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
})
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export function kstParts(date: Date) {
  const map: Record<string, string> = {}
  for (const part of PARTS.formatToParts(date)) map[part.type] = part.value
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hours: map.hour,
    minutes: map.minute,
    seconds: map.second,
    weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  }
}

/** YYYY.MM.DD */
export function formatKstDate(date: Date) {
  const p = kstParts(date)
  return `${p.year}.${p.month}.${p.day}`
}

/** YYYY-MM-DD (요일) HH:mm:ss */
export function formatKstDateTime(date: Date, weekdays: readonly string[]) {
  const p = kstParts(date)
  return `${p.year}-${p.month}-${p.day} (${weekdays[p.weekday]}) ${p.hours}:${p.minutes}:${p.seconds}`
}
