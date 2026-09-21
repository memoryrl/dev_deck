import { NextResponse } from "next/server"
import { markNotificationsRead } from "@/lib/notifications/server"
import { getAuthUser } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// body: { id: string } 이면 그 알림만, { all: true } 이면 내 알림 전체를 읽음 처리한다.
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true })
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { id?: unknown; all?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  const id = typeof body.id === "string" ? body.id : undefined
  if (id ? !UUID.test(id) : body.all !== true) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }

  try {
    await markNotificationsRead({ id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "read_failed" },
      { status: 500 }
    )
  }
}
