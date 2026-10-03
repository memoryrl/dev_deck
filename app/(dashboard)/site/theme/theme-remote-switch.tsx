"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Palette } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { showAlert } from "@/lib/ui/layer-dialog"
import { setThemeRemoteVisible } from "./actions"

export function ThemeRemoteSwitch({ initial }: { initial: boolean }) {
  const router = useRouter()
  const [on, setOn] = useState(initial)
  const [pending, startTransition] = useTransition()

  const change = (next: boolean) => {
    setOn(next)
    startTransition(async () => {
      const result = await setThemeRemoteVisible(next)
      if (!result.ok) {
        setOn(!next)
        await showAlert(result.error)
        return
      }
      // 서버 레이아웃이 레이어를 렌더/제거하도록 새로 받는다.
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-full border bg-card py-2 pl-4 pr-3 shadow-sm">
      <Label htmlFor="theme-remote" className="flex cursor-pointer items-center gap-1.5 text-sm">
        <Palette className="size-4" />
        테마 원격 제어기
      </Label>
      <Switch id="theme-remote" checked={on} disabled={pending} onCheckedChange={change} />
    </div>
  )
}
