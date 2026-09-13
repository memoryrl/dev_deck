import { fetchOwnedGames } from "@/lib/steam/client"
import { NextResponse } from "next/server"

export async function GET() {
  if (!process.env.STEAM_API_KEY || !process.env.STEAM_ID) {
    return NextResponse.json({ error: "Steam is not configured" }, { status: 500 })
  }

  try {
    const data = await fetchOwnedGames()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Steam 응답이 실패했습니다." }, { status: 502 })
  }
}
