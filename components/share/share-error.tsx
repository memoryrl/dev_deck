import Link from "next/link"
import { CalendarX2, Ban, Gauge, Link2Off, FileX2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/dictionary"
import type { ShareFailure } from "@/lib/share/service"

export type ShareErrorReason = ShareFailure | "target_deleted"

const ICONS = {
  expired: CalendarX2,
  limited: Gauge,
  forbidden: Ban,
  target_deleted: FileX2,
  deleted_public: Link2Off,
  deleted_invite: Link2Off,
} as const

export function ShareError({ reason }: { reason: ShareErrorReason }) {
  const { t } = getT()
  const Icon = ICONS[reason]

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/10">
        <Icon className="size-6" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight">{t(`share.view.error.${reason}.title`)}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`share.view.error.${reason}.desc`)}</p>
      <Button asChild className="mt-7">
        <Link href="/">{t("share.view.error.home")}</Link>
      </Button>
    </div>
  )
}
