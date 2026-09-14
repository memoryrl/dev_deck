"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

function SteamMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 88" className={className} aria-hidden>
      <path
        fill="#c7d5e0"
        d="M43.92 0C20.82 0 1.87 17.82.08 40.47l23.58 9.75c2-1.36 4.41-2.16 7.01-2.16.23 0 .46.01.69.02l10.49-15.19v-.22c0-9.15 7.44-16.6 16.59-16.6 9.15 0 16.59 7.45 16.59 16.6s-7.44 16.59-16.59 16.59h-.39l-14.95 10.67c0 .19.02.39.02.58 0 6.88-5.56 12.45-12.43 12.45-6 0-11.06-4.3-12.21-10l-22.15-9.16C6.83 74.46 23.78 88 43.92 88 68.22 88 88 68.23 88 44S68.22 0 43.92 0zm-16.28 66.75c-3.95 0-7.42-2.53-8.77-6.09l4.75 1.96c.58.23 1.18.35 1.79.35 2.75 0 5.05-2.24 5.05-4.99 0-.25-.02-.5-.07-.75l-4.82-1.99c3.19-1.22 5.74 0 5.74 3.19 0 4.3-3.52 8.32-7.67 8.32zm32.45-29.5c0 6.1-4.96 11.06-11.06 11.06-6.1 0-11.06-4.96-11.06-11.06S43 26.19 49.03 26.19c6.1 0 11.06 4.96 11.06 11.06z"
      />
    </svg>
  )
}

export function SteamCover({
  src,
  appId,
  alt = "",
  className,
}: {
  src: string | string[]
  appId?: number
  alt?: string
  className?: string
}) {
  const sourceKey = Array.isArray(src) ? src.filter(Boolean).join("|") : src
  const [sources, setSources] = useState(() => (Array.isArray(src) ? src : [src]).filter(Boolean))
  const [index, setIndex] = useState(0)
  const [ok, setOk] = useState(false)
  const lookupRef = useRef(false)
  const current = sources[index] ?? ""

  useEffect(() => {
    lookupRef.current = false
    setSources((Array.isArray(src) ? src : [src]).filter(Boolean))
    setIndex(0)
    setOk(false)
    // src is represented by sourceKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, sourceKey])

  useEffect(() => {
    if (!current) return
    let cancelled = false
    const probe = new Image()
    probe.onload = () => {
      if (!cancelled && probe.naturalWidth > 0) setOk(true)
    }
    probe.onerror = () => {
      if (cancelled) return
      setOk(false)
      if (index + 1 < sources.length) {
        setIndex(index + 1)
        return
      }
      if (!appId || lookupRef.current) return
      lookupRef.current = true
      fetch(`/api/steam/cover/${appId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json: { url?: string } | null) => {
          if (cancelled) return
          const url = json?.url
          if (typeof url !== "string" || !url || sources.includes(url)) return
          setSources((prev) => (prev.includes(url) ? prev : [...prev, url]))
          setIndex((prev) => prev + 1)
        })
        .catch(() => {})
    }
    probe.src = current
    return () => {
      cancelled = true
    }
  }, [appId, current, index, sources])

  return (
    <div className={cn("relative overflow-hidden bg-[#171a21]", className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <SteamMark className="h-10 w-10 sm:h-14 sm:w-14" />
      </div>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt={alt} className="absolute inset-0 h-full w-full object-cover object-center" />
      ) : null}
    </div>
  )
}
