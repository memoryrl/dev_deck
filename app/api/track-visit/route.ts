import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { hasRecentSessionLog, recordVisitHistory } from "@/lib/auth/login-history"
import { VISIT_LOG_COOKIE, visitLogCookieOptions } from "@/lib/auth/visit-window"
import { clientIpFromHeaders, resolveIpRegion } from "@/lib/comments/ip"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function jsonWithVisitCookie(body: object) {
  const res = NextResponse.json(body)
  res.cookies.set(VISIT_LOG_COOKIE, "1", visitLogCookieOptions())
  return res
}

export async function POST() {
  const jar = cookies()
  if (jar.get(VISIT_LOG_COOKIE)) return NextResponse.json({ skipped: true })

  if (!isSupabaseConfigured()) return jsonWithVisitCookie({ ok: false })

  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const ip = clientIpFromHeaders()
    if (await hasRecentSessionLog({ userId: user?.id ?? null, ipAddress: ip })) {
      return jsonWithVisitCookie({ skipped: true })
    }
    const region = await resolveIpRegion(ip)
    await recordVisitHistory({
      userId: user?.id ?? null,
      email: user?.email ?? null,
      provider: (user?.app_metadata?.provider as string | undefined) ?? null,
      ipAddress: ip,
      ipRegion: region,
      userAgent: headers().get("user-agent"),
    })
    return jsonWithVisitCookie({ ok: true })
  } catch {
    return jsonWithVisitCookie({ ok: false })
  }
}
