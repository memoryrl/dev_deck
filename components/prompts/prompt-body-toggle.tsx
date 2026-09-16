"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { RichContent } from "@/components/editor/rich-content"
import { cn } from "@/lib/utils"

export function PromptBodyToggle({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-semibold transition hover:bg-muted/40"
      >
        {open ? t("prompt.collapse") : t("prompt.expand")}
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t px-4 py-5 md:px-6">
          <RichContent content={content} />
        </div>
      ) : null}
    </section>
  )
}
