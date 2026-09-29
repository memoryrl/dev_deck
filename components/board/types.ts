export type PostListRow = {
  href: string
  title: string
  createdAt: string
  author?: string | null
  meta?: string | null
  thumbnailUrl?: string | null
  excerpt?: string | null
  /** layout="timeline" 전용 — 카드에 날짜 대신 보여줄 기간(예: "2024.09 – 2026.09") */
  periodLabel?: string | null
  /** layout="timeline" 전용 — 원형 배지에 크게 보여줄 연도(예: "2024") */
  periodYear?: string | null
}
