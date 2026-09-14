import { NextRequest, NextResponse } from "next/server"
import {
  CRON_SCHEDULE,
  getLatestHealthLog,
  isHealthLogStale,
  runSupabaseHealthCheck,
} from "@/lib/supabase-health-check"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SupabaseStatus = "healthy" | "unhealthy" | "unknown" | "stale"

/**
 * 외부 모니터링용 공개 헬스체크 API (인증 불필요).
 *
 * GET /api/health          — 최근 Cron 로그 기반 상태
 * GET /api/health?live=1   — Supabase 실시간 ping (로그 저장 없음)
 */
export async function GET(request: NextRequest) {
  const live = ["1", "true", "yes"].includes(
    request.nextUrl.searchParams.get("live")?.toLowerCase() ?? ""
  )
  const checkedAt = new Date().toISOString()

  if (live) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        buildResponse({
          checkedAt,
          ok: false,
          siteStatus: "degraded",
          supabaseStatus: "unknown",
          source: "live",
          error: "Supabase is not configured",
        }),
        { status: 503, headers: noStoreHeaders() }
      )
    }

    const liveResult = await runSupabaseHealthCheck()
    const supabaseStatus: SupabaseStatus = liveResult.ok ? "healthy" : "unhealthy"

    return NextResponse.json(
      buildResponse({
        checkedAt,
        ok: liveResult.ok,
        siteStatus: liveResult.ok ? "up" : "degraded",
        supabaseStatus,
        source: "live",
        lastCheckAt: liveResult.checkedAt,
        lastCheckDurationMs: liveResult.durationMs,
        authOk: liveResult.auth?.ok ?? null,
        dbOk: liveResult.db?.ok ?? null,
        stale: false,
      }),
      {
        status: liveResult.ok ? 200 : 503,
        headers: noStoreHeaders(),
      }
    )
  }

  const latest = await getLatestHealthLog()

  if (!latest) {
    return NextResponse.json(
      buildResponse({
        checkedAt,
        ok: false,
        siteStatus: "up",
        supabaseStatus: "unknown",
        source: "log",
        stale: true,
        error: "No health check logs yet",
      }),
      { status: 503, headers: noStoreHeaders() }
    )
  }

  const stale = isHealthLogStale(latest.checked_at)
  const supabaseStatus: SupabaseStatus = stale ? "stale" : latest.ok ? "healthy" : "unhealthy"
  const ok = !stale && latest.ok

  return NextResponse.json(
    buildResponse({
      checkedAt,
      ok,
      siteStatus: ok ? "up" : "degraded",
      supabaseStatus,
      source: "log",
      lastCheckAt: latest.checked_at,
      lastCheckDurationMs: latest.duration_ms,
      authOk: latest.auth_ok,
      dbOk: latest.db_ok,
      stale,
    }),
    { status: ok ? 200 : 503, headers: noStoreHeaders() }
  )
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0" }
}

function buildResponse(input: {
  checkedAt: string
  ok: boolean
  siteStatus: "up" | "degraded" | "down"
  supabaseStatus: SupabaseStatus
  source: "live" | "log"
  lastCheckAt?: string | null
  lastCheckDurationMs?: number | null
  authOk?: boolean | null
  dbOk?: boolean | null
  stale?: boolean
  error?: string
}) {
  return {
    ok: input.ok,
    service: "devdeck",
    checkedAt: input.checkedAt,
    site: {
      status: input.siteStatus,
    },
    supabase: {
      status: input.supabaseStatus,
      auth: input.authOk ?? null,
      db: input.dbOk ?? null,
      lastCheckAt: input.lastCheckAt ?? null,
      lastCheckDurationMs: input.lastCheckDurationMs ?? null,
      cronSchedule: CRON_SCHEDULE,
      cronScheduleNote: "UTC 03:00 (한국 12:00~12:59, Hobby 플랜)",
      stale: input.stale ?? false,
      source: input.source,
    },
    ...(input.error ? { error: input.error } : {}),
  }
}
