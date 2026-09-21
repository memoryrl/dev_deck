import { NextResponse } from "next/server"
import { pollNotifications } from "@/lib/notifications/server"
import { getAuthUser } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_STORE = { "Cache-Control": "no-store" }

// 1분 주기 확인용 — 미읽음 개수와 가장 최근 미읽음 1건만 돌려주는 가벼운 조회.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ unreadCount: 0, latest: null, serverTime: new Date().toISOString() }, { headers: NO_STORE })
  }
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE })

  try {
    return NextResponse.json(await pollNotifications(), { headers: NO_STORE })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "poll_failed" },
      { status: 500, headers: NO_STORE }
    )
  }
}
