"use server"

import { requireOwner } from "@/lib/auth/owner"
import {
  countPageViewsByVisit,
  getLoginHistoryDailyCounts,
  listLoginHistoryByDate,
  listPageViews,
  type DailyCount,
} from "@/lib/auth/login-history"
import type { LoginHistoryEntry, PageViewEntry } from "@/types/login-history"

// 행을 펼쳤을 때만 클라이언트(login-history-row.tsx)가 부른다 — 목록을 그릴 때
// 모든 세션의 상세를 미리 가져오지 않는다. listPageViews 자체도 RLS로 관리자만
// 읽히지만, Server Action 진입점에서도 한 번 더 확인한다.
export async function fetchPageViews(visitId: string): Promise<PageViewEntry[]> {
  await requireOwner()
  return listPageViews(visitId)
}

// 캘린더 탭 — 보이는 기간(from 포함, to 미포함, YYYY-MM-DD)의 하루별 로그인·접속 건수
export async function fetchDailyCounts(from: string, to: string): Promise<DailyCount[]> {
  await requireOwner()
  return getLoginHistoryDailyCounts(from, to)
}

// 캘린더 탭 우측 패널 — 선택한 하루의 이력과 세션별 페이지 수
export async function fetchHistoryByDate(date: string): Promise<{ entries: LoginHistoryEntry[]; pageCounts: Record<string, number> }> {
  await requireOwner()
  const entries = await listLoginHistoryByDate(date)
  return { entries, pageCounts: await countPageViewsByVisit(entries.map((entry) => entry.id)) }
}
