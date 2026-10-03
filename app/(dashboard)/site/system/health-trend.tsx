"use client"

import { ResponseTrendChart, UptimeDonut, type HealthPoint } from "@/components/system/health-charts"

// 서버 컴포넌트(system/page.tsx)가 recharts(클라이언트 전용)를 직접 못 쓰므로 얇게 감싼다.
export function HealthTrend({ trend, ok, fail }: { trend: HealthPoint[]; ok: number; fail: number }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <ResponseTrendChart data={trend} />
      <UptimeDonut ok={ok} fail={fail} />
    </section>
  )
}
