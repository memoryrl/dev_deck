import { Suspense } from "react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerSkill } from "@/types/career"
import { SkillManager } from "./skill-manager"

export default function CareerSkillsPage() {
  return (
    <div className="w-full">
      <PageTitleBanner title="스킬" breadcrumb={[{ label: "스킬" }]} className="mb-6" />
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
    const supabase = await createClient()
    const { data } = await supabase.from("career_skills").select("*").order("sort_order", { ascending: true })
    skills = (data as CareerSkill[]) ?? []
  }
  return <SkillManager skills={skills} />
}
