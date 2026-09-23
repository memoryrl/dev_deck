"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { ChevronDown, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type WritePanelContextValue = {
  open: boolean
  toggle: () => void
  label: string
  closeLabel: string
}

const WritePanelContext = createContext<WritePanelContextValue | null>(null)

export function WritePanel({
  label,
  closeLabel,
  children,
}: {
  label: string
  closeLabel: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const value = useMemo(
    () => ({
      open,
      toggle: () => setOpen((current) => !current),
      label,
      closeLabel,
    }),
    [open, label, closeLabel]
  )
  return (
    <WritePanelContext.Provider value={value}>
      <div className="min-w-0 space-y-3">{children}</div>
    </WritePanelContext.Provider>
  )
}

function useWritePanel() {
  const value = useContext(WritePanelContext)
  if (!value) throw new Error("WritePanel parts must be used inside WritePanel")
  return value
}

export function WriteToggle({ className }: { className?: string }) {
  const { open, toggle, label, closeLabel } = useWritePanel()
  return (
    <Button
      type="button"
      variant={open ? "secondary" : "outline"}
      className={cn("h-9 shrink-0 rounded-sm px-3.5", className)}
      aria-expanded={open}
      onClick={toggle}
    >
      {open ? <ChevronDown className="size-4 rotate-180" /> : <PenLine className="size-4" />}
      {open ? closeLabel : label}
    </Button>
  )
}

export function WriteForm({ children, className }: { children: ReactNode; className?: string }) {
  const { open } = useWritePanel()
  return (
    <div
      className={cn(
        "grid min-w-0 transition-[grid-template-rows] duration-300 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
      <div className={cn("min-w-0", open ? "overflow-x-clip overflow-y-visible" : "overflow-hidden")}>
        {open ? (
          <div
            className={cn(
              "write-compose mt-3 min-w-0 border border-foreground/10 bg-[hsl(var(--lux-sand)/0.35)] px-3 py-4 dark:bg-card/60 sm:px-5 sm:py-5",
              className
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}
