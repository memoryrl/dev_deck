"use client"

import dynamic from "next/dynamic"
import { useThemeConfig } from "@/components/theme/theme-config-provider"
import type { TowerItem } from "@/components/dashboard/stat-towers"

// three.js 번들은 대시보드에서만, 그리고 클라이언트에서만 불러온다.
const StatTowers = dynamic(() => import("@/components/dashboard/stat-towers"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-white/5" />,
})

export type HeroKpi = { label: string; value: number }

export function DashboardHero({ title, kpis, towers }: { title: string; kpis: HeroKpi[]; towers: TowerItem[] }) {
  // 테마 설정에서 3D 효과를 끄면 three.js 번들 자체를 불러오지 않는다.
  const { dashboard3d } = useThemeConfig().config
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#14110f] text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(216,185,138,0.28),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(107,134,168,0.18),transparent_50%)]"
      />
      <div className={dashboard3d ? "relative grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : "relative"}>
        <div className="flex flex-col justify-between gap-8 p-6 md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d8b98a]">Live overview</p>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">{title}</h2>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur sm:p-4">
                <dt className="truncate text-[11px] text-white/60 sm:text-xs">{kpi.label}</dt>
                <dd className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{kpi.value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </div>
        {dashboard3d ? (
          <div className="h-72 sm:h-96 lg:h-[26rem]" aria-hidden>
            <StatTowers items={towers} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
