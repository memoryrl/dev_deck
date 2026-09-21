"use client"

import dynamic from "next/dynamic"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { PodiumEntry } from "@/lib/steam/top"

function PodiumLoading() {
  const { t } = useI18n()
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      {t("games.topLoading")}
    </div>
  )
}

const PodiumScene = dynamic(
  () => import("@/components/games/podium-topology/podium-scene").then((mod) => mod.PodiumScene),
  { ssr: false, loading: () => <PodiumLoading /> }
)

export function PodiumPanel({ entries }: { entries: PodiumEntry[] }) {
  return (
    <div className="relative z-0 h-[min(78vh,720px)] w-full overflow-hidden bg-[#efe6d8] dark:bg-[#1d1a17]">
      <PodiumScene entries={entries} />
    </div>
  )
}
