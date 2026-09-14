import { resolveSteamHeaderUrl } from "@/lib/steam/store"
import { NextResponse } from "next/server"

export async function GET(_request: Request, { params }: { params: { appid: string } }) {
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
