// 캘린더 화면 공용 날짜 도구 — 서버·클라이언트 어디서나 쓰는 순수 함수.
// 날짜 경계는 사이트 운영 기준(한국 시간)으로 자른다(서버가 UTC로 돌아도 "오늘"이 어긋나지 않게).
const KST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }) // YYYY-MM-DD
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const kstDateKey = (value: string | Date) => KST_DAY.format(typeof value === "string" ? new Date(value) : value)
export const isDateKey = (value: string) => DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+09:00`))
export const kstDayStartIso = (date: string) => new Date(`${date}T00:00:00+09:00`).toISOString()
export const kstNextDayStartIso = (date: string) => new Date(new Date(`${date}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000).toISOString()
