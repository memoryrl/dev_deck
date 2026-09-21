"use client"

import Script from "next/script"
import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { NOTICE_POPUP_PATH } from "@/lib/boards/notice-popup-window"
import { isAnalyticsLocalHost } from "@/lib/site/analytics"

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function sendPageView(measurementId: string, path: string) {
  if (typeof window.gtag !== "function") return
  if (path.startsWith(NOTICE_POPUP_PATH)) return
  if (isAnalyticsLocalHost(window.location.hostname)) return
  window.gtag("event", "page_view", {
    send_to: measurementId,
    page_path: `${path}${window.location.search}`,
    page_title: document.title,
  })
}

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    sendPageView(measurementId, pathname)
  }, [measurementId, pathname])

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('js',new Date());
gtag('config','${measurementId}',{anonymize_ip:true});`}
      </Script>
    </>
  )
}
