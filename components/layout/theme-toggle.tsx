"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [ready, setReady] = useState(false)

  useEffect(() => setReady(true), [])
  if (!ready) return <span className="h-9 w-9" />

  const dark = theme === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "라이트 모드" : "다크 모드"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}
