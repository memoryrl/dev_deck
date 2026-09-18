import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isSupabaseConfigured } from "@/lib/utils"

export type MemberStatsPeriod = "yearly" | "monthly" | "daily"

export type MemberStatsEntry = {
  label: string
  signups: number
  withdrawals: number
}

type MemberEventRow = {
  event_type: "signup" | "withdraw"
  created_at: string
}

function trustedClient() {
  try {
    return createServiceClient()
  } catch {
    return createClient()
  }
}

export async function getMemberStats(period: MemberStatsPeriod): Promise<MemberStatsEntry[]> {
  if (!isSupabaseConfigured()) return emptyBuckets(period)

  const now = new Date()
  const { startDate, dateFormat, points } = periodConfig(period, now)
  const supabase = trustedClient()

  const { data, error } = await supabase
    .from("member_events")
    .select("event_type, created_at")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true })

  if (error) return emptyBuckets(period)

  const signups: Record<string, number> = {}
  const withdrawals: Record<string, number> = {}

  for (const row of (data as MemberEventRow[]) ?? []) {
    const key = bucketKey(period, new Date(row.created_at))
    if (row.event_type === "withdraw") {
      withdrawals[key] = (withdrawals[key] ?? 0) + 1
    } else {
      signups[key] = (signups[key] ?? 0) + 1
    }
  }

  const result: MemberStatsEntry[] = []
  for (let i = 0; i < points; i++) {
    const pointDate = pointAt(period, now, points, i)
    const key = bucketKey(period, pointDate)
    result.push({
      label: dateFormat(pointDate),
      signups: signups[key] ?? 0,
      withdrawals: withdrawals[key] ?? 0,
    })
  }
  return result
}

function emptyBuckets(period: MemberStatsPeriod): MemberStatsEntry[] {
  const now = new Date()
  const { dateFormat, points } = periodConfig(period, now)
  return Array.from({ length: points }, (_, i) => ({
    label: dateFormat(pointAt(period, now, points, i)),
    signups: 0,
    withdrawals: 0,
  }))
}

function periodConfig(period: MemberStatsPeriod, now: Date) {
  switch (period) {
    case "yearly":
      return {
        startDate: new Date(now.getFullYear() - 4, 0, 1),
        dateFormat: (d: Date) => `${d.getFullYear()}년`,
        points: 5,
      }
    case "monthly":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        dateFormat: (d: Date) => `${d.getMonth() + 1}월`,
        points: 12,
      }
    case "daily":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
        dateFormat: (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`,
        points: 30,
      }
  }
}

function pointAt(period: MemberStatsPeriod, now: Date, points: number, i: number) {
  const offset = points - 1 - i
  switch (period) {
    case "yearly":
      return new Date(now.getFullYear() - offset, 0, 1)
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth() - offset, 1)
    case "daily":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
  }
}

function bucketKey(period: MemberStatsPeriod, date: Date) {
  switch (period) {
    case "yearly":
      return `${date.getFullYear()}`
    case "monthly":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    case "daily":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }
}
