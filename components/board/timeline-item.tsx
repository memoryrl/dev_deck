"use client"

import { useEffect, useRef } from "react"

// 화면에 들어오면 data-visible을 켜서 globals.css의 타임라인 애니메이션을 재생한다.
export function TimelineItem({ className, index, children }: { className?: string; index: number; children: React.ReactNode }) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.dataset.visible = ""
        io.disconnect()
      },
      { rootMargin: "0px 0px -10% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <li ref={ref} className={className} style={{ "--i": Math.min(index, 2) } as React.CSSProperties}>
      {children}
    </li>
  )
}
