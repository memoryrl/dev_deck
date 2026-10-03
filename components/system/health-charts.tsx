"use client"

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type HealthPoint = { label: string; ms: number; ok: boolean }

const GOLD = "#b8935f"
const RED = "#dc2626"
const GREEN = "#16a34a"
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 13,
  color: "hsl(var(--foreground))",
}

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 dark:bg-card ${className ?? ""}`}>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-3 text-muted-foreground">{children}</div>
    </div>
  )
}

// 정기 헬스체크 응답시간 추이 — 장애였던 점은 빨갛게, 기준선(1.5초) 위는 "주의" 구간이다.
export const SLOW_MS = 3000
export function ResponseTrendChart({ data, className }: { data: HealthPoint[]; className?: string }) {
  return (
    <Card title="응답 시간 추이" subtitle={`최근 정기 체크 ${data.length}회 · 점선은 주의 기준 ${SLOW_MS}ms`} className={className}>
      {data.length === 0 ? (
        <p className="grid h-56 place-items-center text-sm">정기 헬스체크 기록이 아직 없습니다.</p>
      ) : (
        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} width={48} unit="ms" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()}ms`, "응답"]} />
              <ReferenceLine y={SLOW_MS} stroke={RED} strokeDasharray="4 4" strokeOpacity={0.6} />
              <Area
                type="monotone"
                dataKey="ms"
                stroke={GOLD}
                strokeWidth={2.5}
                fill="url(#healthFill)"
                dot={(props: { cx?: number; cy?: number; payload?: HealthPoint; index?: number }) => (
                  <circle key={props.index} cx={props.cx} cy={props.cy} r={props.payload?.ok ? 3 : 5} fill={props.payload?.ok ? GOLD : RED} stroke="none" />
                )}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// 가동률 도넛 — 정상 / 장애 횟수 비율, 가운데에 퍼센트.
export function UptimeDonut({ ok, fail, className }: { ok: number; fail: number; className?: string }) {
  const total = ok + fail
  const rate = total === 0 ? null : Math.round((ok / total) * 1000) / 10
  const data = total === 0 ? [{ name: "기록 없음", value: 1 }] : [{ name: "정상", value: ok }, { name: "장애", value: fail }]
  return (
    <Card title="가동률" subtitle={total ? `최근 정기 체크 ${total}회 기준` : "기록이 쌓이면 표시됩니다"} className={className}>
      <div className="relative h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={fail && ok ? 3 : 0} cornerRadius={6} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={total === 0 ? "currentColor" : d.name === "정상" ? GREEN : RED} fillOpacity={total === 0 ? 0.1 : 1} />
              ))}
            </Pie>
            {total ? <Tooltip contentStyle={tooltipStyle} /> : null}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-foreground">
          <span className="font-display text-3xl font-bold tabular-nums">{rate === null ? "-" : `${rate}%`}</span>
          <span className="text-xs text-muted-foreground">{total ? `정상 ${ok} · 장애 ${fail}` : ""}</span>
        </div>
      </div>
    </Card>
  )
}
