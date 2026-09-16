"use client"

import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

type HeroViewSwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function HeroViewSwitch({ checked, onCheckedChange }: HeroViewSwitchProps) {
  const { t } = useI18n()
  return (
    <div className="hidden items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 shadow-sm ring-1 ring-foreground/10 backdrop-blur-md md:flex">
      <span
        className={cn(
          "text-xs font-semibold transition-colors",
          !checked ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {t("landing.classic")}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={t("landing.heroViewAria")} />
      <span
        className={cn(
          "text-xs font-semibold transition-colors",
          checked ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {t("landing.topology")}
      </span>
    </div>
  )
}
