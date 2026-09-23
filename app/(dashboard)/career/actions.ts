"use server"

import { revalidatePath } from "next/cache"
import { forgetMemoryCache } from "@/lib/cache/memory"
import { requireOwner } from "@/lib/auth/owner"
import { createClient } from "@/lib/supabase/server"
import { isBlankContent } from "@/lib/content"
import { parseCommaList } from "@/lib/utils"
import type { CareerPostType } from "@/types/career"

function refresh() {
  forgetMemoryCache("public:career")
  forgetMemoryCache("public:skills")
  revalidatePath("/")
  revalidatePath("/career")
  revalidatePath("/career/skills")
  revalidatePath("/b/career")
  revalidatePath("/work")
}

const TYPES: CareerPostType[] = ["project", "skill", "note"]

export async function createCareerPost(formData: FormData) {
  const user = await requireOwner()
  const supabase = await createClient()
  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const postType = String(formData.get("post_type") ?? "project") as CareerPostType
  if (!title || isBlankContent(content)) return { ok: false as const, error: "제목과 본문은 필수입니다." }
  if (!TYPES.includes(postType)) return { ok: false as const, error: "글 종류가 올바르지 않습니다." }

  const periodStart = String(formData.get("period_start") ?? "") || null
  const periodEnd = String(formData.get("period_end") ?? "") || null
  if (periodStart && periodEnd && periodEnd < periodStart) {
    return { ok: false as const, error: "종료일이 시작일보다 빠릅니다." }
  }

  const { error } = await supabase.from("career_posts").insert({
    user_id: user.id,
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    content,
    post_type: postType,
    company: String(formData.get("company") ?? "").trim() || null,
    role: String(formData.get("role") ?? "").trim() || null,
    period_start: periodStart,
    period_end: periodEnd,
    skills: parseCommaList(String(formData.get("skills") ?? "")),
    tags: parseCommaList(String(formData.get("tags") ?? "")),
    is_public: formData.get("is_public") === "on",
  })
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function updateCareerPost(id: string, formData: FormData) {
  await requireOwner()
  const supabase = await createClient()
  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const postType = String(formData.get("post_type") ?? "project") as CareerPostType
  if (!title || isBlankContent(content)) return { ok: false as const, error: "제목과 본문은 필수입니다." }
  if (!TYPES.includes(postType)) return { ok: false as const, error: "글 종류가 올바르지 않습니다." }

  const { error } = await supabase
    .from("career_posts")
    .update({
      title,
      excerpt: String(formData.get("excerpt") ?? "").trim() || null,
      content,
      post_type: postType,
      company: String(formData.get("company") ?? "").trim() || null,
      role: String(formData.get("role") ?? "").trim() || null,
      period_start: String(formData.get("period_start") ?? "") || null,
      period_end: String(formData.get("period_end") ?? "") || null,
      skills: parseCommaList(String(formData.get("skills") ?? "")),
      tags: parseCommaList(String(formData.get("tags") ?? "")),
      is_public: formData.get("is_public") === "on",
    })
    .eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  revalidatePath(`/career/${id}`)
  revalidatePath(`/work/${id}`)
  return { ok: true as const }
}

export async function deleteCareerPost(id: string) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("career_posts").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function upsertCareerSkill(formData: FormData) {
  const user = await requireOwner()
  const supabase = await createClient()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { ok: false as const, error: "스킬 이름은 필수입니다." }
  const id = String(formData.get("id") ?? "")

  const payload = {
    user_id: user.id,
    name,
    category: String(formData.get("category") ?? "General").trim() || "General",
    proficiency: String(formData.get("proficiency") ?? "").trim() || null,
    years: String(formData.get("years") ?? "") ? Number(formData.get("years")) : null,
    summary: String(formData.get("summary") ?? "").trim() || null,
    is_public: formData.get("is_public") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  }

  const query = id
    ? supabase.from("career_skills").update(payload).eq("id", id)
    : supabase.from("career_skills").insert(payload)

  const { error } = await query
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}

export async function deleteCareerSkill(id: string) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("career_skills").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refresh()
  return { ok: true as const }
}
