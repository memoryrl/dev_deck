import { resolveSteamHeaderUrl } from "@/lib/steam/store"
import { NextResponse } from "next/server"

export async function GET(_request: Request, props: { params: Promise<{ appid: string }> }) {
  const params = await props.params;
  const appId = Number(params.appid)
  if (!Number.isFinite(appId) || appId <= 0) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  try {
    const url = await resolveSteamHeaderUrl(appId)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ url: null }, { status: 502 })
  }
}
