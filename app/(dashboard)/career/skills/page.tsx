import { Suspense } from "react"
import { ListSkeleton } from "@/components/layout/skeletons"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerSkill } from "@/types/career"
import { SkillManager } from "./skill-manager"

export default function CareerSkillsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold">스킬</h1>
      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <CareerSkillsBody />
      </Suspense>
    </div>
  )
}

async function CareerSkillsBody() {
  let skills: CareerSkill[] = []
  if (isSupabaseConfigured()) {
    await ensureProfile()
    const supabase = createClient()
    const { data } = await supabase.from("career_skills").select("*").order("sort_order", { ascending: true })
    skills = (data as CareerSkill[]) ?? []
  }
  return <SkillManager skills={skills} />
}
