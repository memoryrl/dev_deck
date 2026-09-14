"use client"

import { useEffect, useState } from "react"

export function usePageActivity() {
  const [active, setActive] = useState(true)

  useEffect(() => {
    const sync = () => {
      setActive(document.visibilityState === "visible" && document.hasFocus())
    }
    sync()
    document.addEventListener("visibilitychange", sync)
    window.addEventListener("focus", sync)
    window.addEventListener("blur", sync)
    return () => {
      document.removeEventListener("visibilitychange", sync)
      window.removeEventListener("focus", sync)
      window.removeEventListener("blur", sync)
    }
  }, [])

  return active
}
