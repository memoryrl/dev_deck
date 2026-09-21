"use server"

import { revalidatePath } from "next/cache"
import { forgetMemoryCache } from "@/lib/cache/memory"
import { redirect } from "next/navigation"
import { requireOwner } from "@/lib/auth/owner"
import { createClient } from "@/lib/supabase/server"
import { isBlankContent } from "@/lib/content"
import { parseCommaList } from "@/lib/utils"

function refresh() {
  forgetMemoryCache("public:prompts")
  revalidatePath("/")
  revalidatePath("/promptkit")
  revalidatePath("/p", "layout")
}

export async function createPrompt(formData: FormData) {
  const user = await requireOwner()
  const supabase = await createClient()
  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const resultHtml = String(formData.get("result_html") ?? "").trim()
  if (!title || isBlankContent(content)) return { ok: false as const, error: "제목과 본문은 필수입니다." }

  const { error } = await supabase.from("prompts").insert({
    user_id: user.id,
    title,
    content,
    result_html: resultHtml,
    category: String(formData.get("category") ?? "General").trim() || "General",
    tags: parseCommaList(String(formData.get("tags") ?? "")),
    is_public: formData.get("is_public") === "on",
  })
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function updatePrompt(id: string, formData: FormData) {
  await requireOwner()
  const supabase = await createClient()
  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const resultHtml = String(formData.get("result_html") ?? "").trim()
  if (!title || isBlankContent(content)) return { ok: false as const, error: "제목과 본문은 필수입니다." }

  const { error } = await supabase
    .from("prompts")
    .update({
      title,
      content,
      result_html: resultHtml,
      category: String(formData.get("category") ?? "General").trim() || "General",
      tags: parseCommaList(String(formData.get("tags") ?? "")),
      is_public: formData.get("is_public") === "on",
    })
    .eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  revalidatePath(`/promptkit/${id}`)
  revalidatePath(`/p/${id}`)
  return { ok: true as const }
}

export async function deletePrompt(id: string) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("prompts").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
