"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/utils"

function oauthMessage(message: string) {
  if (message.toLowerCase().includes("provider is not enabled")) {
    return "Supabase에서 Google 로그인이 꺼져 있습니다. Authentication → Providers → Google을 Enable 하고 Client ID/Secret을 넣으세요."
  }
  return message
}

export function LoginButtons() {
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    if (!isSupabaseConfigured()) {
      setError("Supabase 환경변수가 없습니다.")
      return
    }
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    })
    if (oauthError) {
      setError(oauthMessage(oauthError.message))
    }
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" type="button" onClick={signIn}>
        Google로 계속
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
