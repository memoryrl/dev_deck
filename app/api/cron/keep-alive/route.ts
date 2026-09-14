import { NextRequest, NextResponse } from "next/server"
import { persistHealthLog, runSupabaseHealthCheck } from "@/lib/supabase-health-check"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false

  const authHeader = request.headers.get("authorization")?.trim() ?? ""
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader

  return token.length > 0 && token === cronSecret
}

/**
 * Supabase Free 티어 7일 미사용 일시정지 방지용 일일 헬스체크.
 * Vercel Cron → GET /api/cron/keep-alive (Authorization: Bearer CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 })
  }

  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase env is not configured" }, { status: 500 })
  }

  const payload = await runSupabaseHealthCheck()
  const log = await persistHealthLog(payload)

  return NextResponse.json({ ...payload, log }, { status: payload.ok ? 200 : 503 })
}
