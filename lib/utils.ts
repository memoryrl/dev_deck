import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function formatPlaytime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours <= 0) return `${rest}m`
  return `${hours}h ${rest}m`
}

export function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return null
  const from = start ? start.slice(0, 7).replace("-", ".") : ""
  const to = end ? end.slice(0, 7).replace("-", ".") : "현재"
  return `${from} – ${to}`
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
