"use server"

import { requireOwner } from "@/lib/auth/owner"
import { listPageViews } from "@/lib/auth/login-history"
import type { PageViewEntry } from "@/types/login-history"

// 행을 펼쳤을 때만 클라이언트(login-history-row.tsx)가 부른다 — 목록을 그릴 때
// 모든 세션의 상세를 미리 가져오지 않는다. listPageViews 자체도 RLS로 관리자만
// 읽히지만, Server Action 진입점에서도 한 번 더 확인한다.
export async function fetchPageViews(visitId: string): Promise<PageViewEntry[]> {
  await requireOwner()
  return listPageViews(visitId)
}
