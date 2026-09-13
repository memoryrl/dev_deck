"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setDone(true)
    window.setTimeout(() => setDone(false), 1500)
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? "복사됨" : "복사"}
    </Button>
  )
}
