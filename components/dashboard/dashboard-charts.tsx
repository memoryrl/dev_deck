"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Point = { label: string; count: number }

const PALETTE = ["#d8b98a", "#9a7550", "#7d9a8c", "#6b86a8", "#b9805f"]
const GOLD = "#b8935f"

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 13,
  color: "hsl(var(--foreground))",
}

function ChartCard({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 dark:bg-card sm:p-6 ${className ?? ""}`}>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4 h-64 w-full min-w-0 text-muted-foreground">{children}</div>
    </div>
  )
}

const axis = { tick: { fontSize: 12, fill: "currentColor" }, tickLine: false, axisLine: false } as const

export function VisitAreaChart({ title, subtitle, data, unit, className }: { title: string; subtitle?: string; data: Point[]; unit: string; className?: string }) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.5} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 3" />
          <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} {...axis} />
          <YAxis allowDecimals={false} width={44} {...axis} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()}${unit}`, ""]} />
          <Area type="monotone" dataKey="count" stroke={GOLD} strokeWidth={2.5} fill="url(#visitFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function MonthlyBarChart({ title, subtitle, data, unit, className }: { title: string; subtitle?: string; data: Point[]; unit: string; className?: string }) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 3" />
          <XAxis dataKey="label" {...axis} />
          <YAxis allowDecimals={false} width={44} {...axis} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.06 }} contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()}${unit}`, ""]} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? GOLD : "#d8b98a"} fillOpacity={i === data.length - 1 ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ContentDonut({ title, items, totalLabel, className }: { title: string; items: { label: string; value: number }[]; totalLabel: string; className?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0)
  // 전부 0이면 도넛이 안 그려지니 회색 링으로 대체
  const data = total === 0 ? [{ label: "-", value: 1 }] : items
  return (
    <div className={`rounded-2xl border bg-white p-5 dark:bg-card sm:p-6 ${className ?? ""}`}>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <div className="relative mt-4 h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={total === 0 ? 0 : 3} cornerRadius={6} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={total === 0 ? "currentColor" : PALETTE[i % PALETTE.length]} fillOpacity={total === 0 ? 0.1 : 1} />
              ))}
            </Pie>
            {total === 0 ? null : <Tooltip contentStyle={tooltipStyle} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold tabular-nums">{total.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">{totalLabel}</span>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="ml-auto font-semibold tabular-nums">{item.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
