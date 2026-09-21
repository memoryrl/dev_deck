"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { NOTIFICATION_POLL_INTERVAL_MS } from "@/lib/notifications/config"
import type { NotificationItem, NotificationPoll } from "@/types/notification"

// 어느 알림까지 봤는지(토스트로 알렸는지)의 기준선. 탭이 여러 개여도 같은 값을 공유하므로
// 한 탭이 토스트를 띄우고 나면 다른 탭은 같은 알림으로 다시 띄우지 않는다.
const seenKey = (userKey: string) => `devdeck:notifications:seen:${userKey}`

function readSeen(userKey: string) {
  try {
    return window.localStorage.getItem(seenKey(userKey))
  } catch {
    return null
  }
}

function writeSeen(userKey: string, value: string) {
  try {
    window.localStorage.setItem(seenKey(userKey), value)
  } catch {
    // 저장소를 못 쓰는 환경 — 기준선은 이번 탭에서만 유지된다
  }
}

/**
 * 1분마다 미읽음 개수를 확인한다.
 * - 탭이 가려져 있으면 건너뛰고, 다시 보이는 순간 바로 한 번 확인한다.
 * - 새 알림이 기준선보다 나중이면 onNew로 알린다(토스트용). 처음 접속한 시점의 기존 알림은 알리지 않는다.
 * - changeTick은 개수가 바뀔 때마다 늘어서, 열려 있는 알림 패널이 목록을 다시 불러오는 신호가 된다.
 */
export function useNotificationPolling(
  userKey: string,
  onNew: (latest: NotificationItem, delta: number) => void
) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [changeTick, setChangeTick] = useState(0)
  const onNewRef = useRef(onNew)
  const lastCount = useRef<number | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    onNewRef.current = onNew
  }, [onNew])

  const poll = useCallback(async () => {
    if (document.hidden || inFlight.current) return
    inFlight.current = true
    try {
      const res = await fetch("/api/notifications/poll", { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as NotificationPoll

      const previous = lastCount.current
      lastCount.current = data.unreadCount
      setUnreadCount(data.unreadCount)
      if (previous !== null && previous !== data.unreadCount) setChangeTick((tick) => tick + 1)

      const seen = readSeen(userKey)
      if (seen === null) {
        writeSeen(userKey, data.latest?.createdAt ?? data.serverTime)
      } else if (data.latest && Date.parse(data.latest.createdAt) > Date.parse(seen)) {
        writeSeen(userKey, data.latest.createdAt)
        onNewRef.current(data.latest, Math.max(1, data.unreadCount - (previous ?? 0)))
      }
    } catch {
      // 일시적인 네트워크 오류 — 다음 주기에 다시 확인한다
    } finally {
      inFlight.current = false
    }
  }, [userKey])

  useEffect(() => {
    void poll()
    const timer = window.setInterval(() => void poll(), NOTIFICATION_POLL_INTERVAL_MS)
    const onVisible = () => {
      if (!document.hidden) void poll()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [poll])

  return { unreadCount, setUnreadCount, changeTick, pollNow: poll }
}
