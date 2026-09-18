"use client"

import { useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { MemberStatsEntry, MemberStatsPeriod } from "@/lib/site/member-stats"

type Props = {
  yearlyData: MemberStatsEntry[]
  monthlyData: MemberStatsEntry[]
  dailyData: MemberStatsEntry[]
}

const PERIOD_OPTIONS: { value: MemberStatsPeriod; labelKey: string }[] = [
  { value: "daily", labelKey: "admin.members.periodDaily" },
  { value: "monthly", labelKey: "admin.members.periodMonthly" },
  { value: "yearly", labelKey: "admin.members.periodYearly" },
]

export function MemberStatsChart({ yearlyData, monthlyData, dailyData }: Props) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<MemberStatsPeriod>("daily")

  const data = period === "yearly" ? yearlyData : period === "monthly" ? monthlyData : dailyData
  const signups = data.reduce((sum, entry) => sum + entry.signups, 0)
  const withdrawals = data.reduce((sum, entry) => sum + entry.withdrawals, 0)
  const rangeKey =
    period === "yearly"
      ? "admin.members.chartRangeYearly"
      : period === "monthly"
        ? "admin.members.chartRangeMonthly"
        : "admin.members.chartRangeDaily"

  return (
    <div className="rounded-xl border bg-white p-6 dark:bg-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">{t("admin.members.chartTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(rangeKey)} · {t("admin.members.chartTotals", { signups, withdrawals })}
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                period === option.value
                  ? "bg-white text-foreground shadow-sm dark:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd2" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#8a7d6b" }}
              tickLine={false}
              axisLine={{ stroke: "#e8dfd2" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#8a7d6b" }}
              tickLine={false}
              axisLine={{ stroke: "#e8dfd2" }}
              allowDecimals={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e8dfd2",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              formatter={(value, name) => [
                `${Number(value).toLocaleString()}${t("admin.members.chartUnit")}`,
                name === "signups" ? t("admin.members.signup") : t("admin.members.withdraw"),
              ]}
            />
            <Legend
              formatter={(value) =>
                value === "signups" ? t("admin.members.signup") : t("admin.members.withdraw")
              }
            />
            <Line
              type="monotone"
              dataKey="signups"
              stroke="#1a1614"
              strokeWidth={2}
              dot={{ fill: "#1a1614", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="withdrawals"
              stroke="#b4533a"
              strokeWidth={2}
              dot={{ fill: "#b4533a", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
