import { NextResponse } from "next/server"
import { NOTIFICATION_LIST_LIMIT } from "@/lib/notifications/config"
import { listNotifications } from "@/lib/notifications/server"
import { getAuthUser } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NO_STORE = { "Cache-Control": "no-store" }

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ items: [] }, { headers: NO_STORE })
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE })

  const params = new URL(request.url).searchParams
  const limit = Math.min(Math.max(Number(params.get("limit")) || NOTIFICATION_LIST_LIMIT, 1), 50)

  try {
    const items = await listNotifications({ unreadOnly: params.get("filter") === "unread", limit })
    return NextResponse.json({ items }, { headers: NO_STORE })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "list_failed" },
      { status: 500, headers: NO_STORE }
    )
  }
}
