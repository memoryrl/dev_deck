"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/auth/owner"
import { createClient } from "@/lib/supabase/server"

function refresh() {
  revalidatePath("/site/comments")
  revalidatePath("/", "layout")
}

export async function hideComment(id: string, hidden: boolean) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("comments").update({ is_hidden: hidden }).eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function deleteComment(id: string) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("comments").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function addProfanityWord(formData: FormData) {
  await requireOwner()
  const word = String(formData.get("word") ?? "").trim()
  const replacement = String(formData.get("replacement") ?? "**").trim() || "**"
  if (!word) return { ok: false as const, error: "단어를 입력하세요." }
  const supabase = await createClient()
  const { error } = await supabase.from("profanity_words").insert({ word, replacement })
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function removeProfanityWord(id: string) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("profanity_words").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}
