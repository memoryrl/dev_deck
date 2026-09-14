"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addProfanityWord } from "@/app/(dashboard)/site/comments/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ProfanityWordForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    setError(null)
    const result = await addProfanityWord(formData)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[10rem] flex-1">
        <Label htmlFor="word">단어</Label>
        <Input id="word" name="word" required placeholder="치환할 단어" />
      </div>
      <div className="w-24">
        <Label htmlFor="replacement">치환</Label>
        <Input id="replacement" name="replacement" defaultValue="**" />
      </div>
      <Button type="submit">추가</Button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
