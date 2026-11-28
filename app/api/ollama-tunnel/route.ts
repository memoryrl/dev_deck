import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { APP_ENV_KEYS } from "@/lib/site/app-env"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// 맥미니의 터널 스크립트가 cloudflared 를 다시 켤 때마다 새 trycloudflare 주소를 등록한다.
// 인증은 Caddy 문지기와 같은 OLLAMA_PROXY_KEY (맥미니와 Vercel 에만 있다).
const TUNNEL_URL = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.OLLAMA_PROXY_KEY?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")?.trim() ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  const noStore = { "Cache-Control": "no-store" }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore })
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  if (!TUNNEL_URL.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400, headers: noStore })
  }

  const { error } = await createServiceClient()
    .from("app_env")
    .upsert({ key: APP_ENV_KEYS.ollamaBaseUrl, value: url, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) {
    console.error("[ollama-tunnel] upsert failed", error.message)
    return NextResponse.json({ error: "db_error" }, { status: 500, headers: noStore })
  }
  return new NextResponse(null, { status: 204, headers: noStore })
}
