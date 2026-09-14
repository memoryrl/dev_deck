import { NextResponse } from "next/server"
import { isOwnerUser } from "@/lib/auth/roles"
import { persistHealthLog, runSupabaseHealthCheck } from "@/lib/supabase-health-check"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** 관리자 수동 keep-alive 실행 (Cron과 동일한 헬스체크) */
export async function POST() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isOwnerUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const payload = await runSupabaseHealthCheck()
    const log = await persistHealthLog(payload)
    return NextResponse.json({ ...payload, log }, { status: payload.ok ? 200 : 503 })
  } catch (error) {
    console.error("admin trigger-health-check error:", error)
    return NextResponse.json({ error: "Failed to run health check" }, { status: 500 })
  }
}
