import { postLoginPath } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  let user: { email?: string | null } | null = null
  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()
    user = sessionUser
  }
  return NextResponse.redirect(`${origin}${postLoginPath(user)}`)
}
