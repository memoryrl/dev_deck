"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteCareerSkill, upsertCareerSkill } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { CareerSkill } from "@/types/career"

export function SkillManager({ skills }: { skills: CareerSkill[] }) {
  const router = useRouter()
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    if (isPublic) formData.set("is_public", "on")
    const result = await upsertCareerSkill(formData)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <form action={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="category">분류</Label>
              <Input id="category" name="category" placeholder="General" />
            </div>
            <div>
              <Label htmlFor="proficiency">숙련도</Label>
              <Input id="proficiency" name="proficiency" placeholder="실무" />
            </div>
            <div>
              <Label htmlFor="years">연차</Label>
              <Input id="years" name="years" type="number" step="0.5" />
            </div>
            <div>
              <Label htmlFor="sort_order">순서</Label>
              <Input id="sort_order" name="sort_order" type="number" defaultValue={0} />
            </div>
          </div>
          <div>
            <Label htmlFor="summary">한 줄</Label>
            <Input id="summary" name="summary" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label>공개</Label>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit">스킬 추가</Button>
        </form>
      </Card>
      <div className="space-y-3">
        {skills.map((skill) => (
          <Card key={skill.id} className="flex items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <strong>{skill.name}</strong>
                <Badge>{skill.category}</Badge>
                {skill.is_public ? <Badge variant="secondary">공개</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{skill.summary}</p>
            </div>
            <form
              action={async () => {
                await deleteCareerSkill(skill.id)
                router.refresh()
              }}
            >
              <Button type="submit" variant="destructive">
                삭제
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  )
}
