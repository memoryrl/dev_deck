"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { VisitStatsEntry, VisitStatsPeriod } from "@/lib/auth/login-history"

type Props = {
  yearlyData: VisitStatsEntry[]
  monthlyData: VisitStatsEntry[]
  dailyData: VisitStatsEntry[]
}

const PERIOD_OPTIONS: { value: VisitStatsPeriod; label: string }[] = [
  { value: "daily", label: "일간" },
  { value: "monthly", label: "월간" },
  { value: "yearly", label: "연간" },
]

export function VisitStatsChart({ yearlyData, monthlyData, dailyData }: Props) {
  const [period, setPeriod] = useState<VisitStatsPeriod>("daily")

  const data = period === "yearly" ? yearlyData : period === "monthly" ? monthlyData : dailyData

  const total = data.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <div className="rounded-xl border bg-white p-6 dark:bg-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">접속 통계</h2>
          <p className="text-sm text-muted-foreground">
            {period === "yearly" && "최근 5년간"}
            {period === "monthly" && "최근 12개월간"}
            {period === "daily" && "최근 30일간"} 총 {total.toLocaleString()}건
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                period === option.value
                  ? "bg-white text-foreground shadow-sm dark:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              formatter={(value) => [`${Number(value).toLocaleString()}건`, "접속수"]}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
