"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isOwnerUser } from "@/lib/auth/roles"
import { createClient, getAuthUser } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isSupabaseConfigured } from "@/lib/utils"

export async function withdrawAccount() {
  if (!isSupabaseConfigured()) return { error: "not_configured" as const }

  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (isOwnerUser(user)) return { error: "owner" as const }

  let eventId: string | null = null
  try {
    const service = createServiceClient()
    const { data: event, error: eventError } = await service
      .from("member_events")
      .insert({ event_type: "withdraw", user_id: user.id })
      .select("id")
      .single()

    if (eventError) return { error: eventError.message }
    eventId = (event as { id: string } | null)?.id ?? null

    const { error: deleteError } = await service.auth.admin.deleteUser(user.id)
    if (deleteError) {
      if (eventId) {
        await service.from("member_events").delete().eq("id", eventId)
      }
      return { error: deleteError.message }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "withdraw_failed" }
  }

  const supabase = createClient()
  await supabase.auth.signOut({ scope: "local" }).catch(() => {})
  revalidatePath("/", "layout")
  revalidatePath("/site/members")
  redirect("/")
}
