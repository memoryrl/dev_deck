import { createClient } from "@supabase/supabase-js"

const DEVDECK_SCHEMA = "devdeck"

export type HealthPayload = {
  ok: boolean
  checkedAt: string
  durationMs: number
  auth?: { status: number; ok: boolean }
  db?: { ok: boolean; error: string | null; note: string | null }
  error?: string
}

export type HealthLogResult = { saved: true } | { saved: false; reason: string }

export type HealthLogRow = {
  id: string
  checked_at: string
  ok: boolean
  duration_ms: number | null
  auth_ok: boolean | null
  auth_status: number | null
  db_ok: boolean | null
  error_message: string | null
}

export const CRON_SCHEDULE = "0 3 * * *"
/** 일일 Cron 기준 — 26시간 넘으면 stale */
export const HEALTH_LOG_STALE_MS = 26 * 60 * 60 * 1000

function getJwtRole(key: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")) as {
      role?: string
    }
    return payload.role ?? null
  } catch {
    return null
  }
}

function healthClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: DEVDECK_SCHEMA },
  })
}

export async function runSupabaseHealthCheck(): Promise<HealthPayload> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env is not configured")
  }

  const startedAt = Date.now()

  try {
    const authHealthRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    const supabase = healthClient(supabaseUrl, supabaseAnonKey)
    const { error: dbError } = await supabase.from("profiles").select("id").limit(1)
    const dbReached =
      !dbError || /permission denied|row-level security|JWT/i.test(dbError.message || "")

    return {
      ok: authHealthRes.ok && dbReached,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      auth: {
        status: authHealthRes.status,
        ok: authHealthRes.ok,
      },
      db: {
        ok: dbReached,
        error: dbError && !dbReached ? dbError.message : null,
        note: dbError && dbReached ? dbError.message : null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function persistHealthLog(payload: HealthPayload): Promise<HealthLogResult> {
  const admin = createServiceRoleClient()
  if (!admin) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!serviceRoleKey) {
      console.warn("keep-alive: SUPABASE_SERVICE_ROLE_KEY 없음 — 헬스체크 로그 미저장")
      return { saved: false, reason: "missing_service_role" }
    }
    console.warn("keep-alive: SUPABASE_SERVICE_ROLE_KEY가 service_role 키가 아닙니다 — 로그 미저장")
    return { saved: false, reason: "invalid_service_role_key" }
  }

  const { error } = await admin.from("supabase_health_checks").insert({
    checked_at: payload.checkedAt,
    ok: payload.ok,
    duration_ms: payload.durationMs,
    auth_ok: payload.auth?.ok ?? null,
    auth_status: payload.auth?.status ?? null,
    db_ok: payload.db?.ok ?? null,
    error_message: payload.error || payload.db?.error || null,
    details: {
      auth: payload.auth ?? null,
      db: payload.db ?? null,
      error: payload.error ?? null,
    },
  })

  if (error) {
    console.error("keep-alive: 헬스체크 로그 저장 실패:", error.message)
    return { saved: false, reason: error.message }
  }

  return { saved: true }
}

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) return null
  if (getJwtRole(serviceRoleKey) !== "service_role") return null
  return healthClient(supabaseUrl, serviceRoleKey)
}

export async function getLatestHealthLog(): Promise<HealthLogRow | null> {
  const admin = createServiceRoleClient()
  if (!admin) return null

  const { data, error } = await admin
    .from("supabase_health_checks")
    .select("id, checked_at, ok, duration_ms, auth_ok, auth_status, db_ok, error_message")
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("getLatestHealthLog error:", error.message)
    return null
  }

  return data
}

export function isHealthLogStale(checkedAt: string | null | undefined): boolean {
  if (!checkedAt) return true
  return Date.now() - new Date(checkedAt).getTime() > HEALTH_LOG_STALE_MS
}
