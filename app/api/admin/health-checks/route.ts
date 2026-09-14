import { NextRequest, NextResponse } from "next/server"
import { isOwnerUser } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** 관리자 전용: Supabase 일일 헬스체크 로그 조회 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isOwnerUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const limitParam = Number(request.nextUrl.searchParams.get("limit") || "90")
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 365) : 90

    const { data, error } = await supabase
      .from("supabase_health_checks")
      .select(
        "id, checked_at, ok, duration_ms, auth_ok, auth_status, db_ok, error_message, details, created_at"
      )
      .order("checked_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    const logs = data || []
    const successCount = logs.filter((row) => row.ok).length
    const failureCount = logs.length - successCount
    const latest = logs[0] || null

    return NextResponse.json({
      latest,
      summary: {
        total: logs.length,
        success: successCount,
        failure: failureCount,
      },
      logs,
    })
  } catch (error) {
    console.error("admin health-checks api error:", error)
    return NextResponse.json({ error: "Failed to load health check logs" }, { status: 500 })
  }
}
