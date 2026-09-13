import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerSkill } from "@/types/career"
import { SkillManager } from "./skill-manager"

export default async function CareerSkillsPage() {
  let skills: CareerSkill[] = []
  if (isSupabaseConfigured()) {
    await ensureProfile()
    const supabase = createClient()
    const { data } = await supabase
      .from("career_skills")
      .select("*")
      .order("sort_order", { ascending: true })
    skills = (data as CareerSkill[]) ?? []
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold">스킬</h1>
      <SkillManager skills={skills} />
    </div>
  )
}
