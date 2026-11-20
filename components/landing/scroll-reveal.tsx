"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type RevealVariant = "up" | "scale" | "fade" | "left" | "right"

// 등장은 한 가지 — 짧게 페이드하며 4px 남짓 떠오른다. 방향별 variant는 호출부 호환용으로만 남긴다.
const RISE = "opacity-0 translate-y-4"
const VARIANT_HIDDEN: Record<RevealVariant, string> = {
  up: RISE,
  scale: RISE,
  fade: "opacity-0",
  left: RISE,
  right: RISE,
}

// Apple 제품 페이지류의 "스크롤로 들어오면 살짝 떠오르며 나타난다" 연출을
// 라이브러리 없이 IntersectionObserver로 구현한다. 한 번 보이면 다시 숨기지
// 않는다(once) — 위아래로 왔다갔다할 때 깜빡이는 게 더 산만하다.
export function ScrollReveal({
  children,
  className,
  variant = "up",
  delay = 0,
  duration = 700,
  once = true,
}: {
  children: ReactNode
  className?: string
  variant?: RevealVariant
  delay?: number
  duration?: number
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setVisible(false)
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
        visible ? "translate-x-0 translate-y-0 scale-100 opacity-100" : VARIANT_HIDDEN[variant],
        className
      )}
      style={{ transitionDelay: `${delay}ms`, transitionDuration: `${Math.min(duration, 500)}ms` }}
    >
      {children}
    </div>
  )
}
