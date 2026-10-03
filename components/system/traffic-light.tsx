import { cn } from "@/lib/utils"

export type HealthLevel = "ok" | "warn" | "error"

const LAMPS: { level: HealthLevel; on: string; off: string; label: string }[] = [
  { level: "error", on: "#ef4444", off: "#4a2523", label: "장애" },
  { level: "warn", on: "#f59e0b", off: "#4a3a1c", label: "주의" },
  { level: "ok", on: "#22c55e", off: "#1d3d29", label: "정상" },
]

// 시스템 상태를 신호등으로 보여 준다 — 켜진 램프만 밝게 빛나고 천천히 숨 쉬듯 깜빡인다(차트·표 없이도 한눈에).
export function TrafficLight({ level, className }: { level: HealthLevel; className?: string }) {
  return (
    <svg viewBox="0 0 96 220" role="img" aria-label={`시스템 상태: ${LAMPS.find((l) => l.level === level)?.label}`} className={cn("h-44 w-auto shrink-0", className)}>
      {/* 기둥 */}
      <rect x="42" y="190" width="12" height="30" rx="3" fill="#3b3631" />
      {/* 몸체 */}
      <rect x="8" y="4" width="80" height="190" rx="22" fill="#1f1b18" stroke="#3b3631" strokeWidth="3" />
      {LAMPS.map((lamp, i) => {
        const cy = 40 + i * 58
        const active = lamp.level === level
        return (
          <g key={lamp.level}>
            {/* 차양 */}
            <path d={`M20 ${cy - 22} Q48 ${cy - 34} 76 ${cy - 22} L76 ${cy - 17} Q48 ${cy - 28} 20 ${cy - 17} Z`} fill="#0f0d0c" />
            {active ? <circle cx="48" cy={cy} r="30" fill={lamp.on} opacity="0.22" className="motion-safe:animate-pulse" /> : null}
            <circle cx="48" cy={cy} r="21" fill={active ? lamp.on : lamp.off} style={active ? { filter: `drop-shadow(0 0 8px ${lamp.on})` } : undefined} className={active ? "motion-safe:animate-pulse" : undefined} />
            {/* 렌즈 하이라이트 */}
            <ellipse cx="41" cy={cy - 8} rx="7" ry="4" fill="#fff" opacity={active ? 0.45 : 0.1} />
          </g>
        )
      })}
    </svg>
  )
}
