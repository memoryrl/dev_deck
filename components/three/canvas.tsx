"use client"

import { Canvas as FiberCanvas, events as createEvents, type CanvasProps } from "@react-three/fiber"

// 새로 만드는 루트용 가드. 이미 handlers가 있는 루트(Fast Refresh)는 events 프롭을 무시하고
// 라이브러리 connect를 그대로 호출하므로, 그 경로는 scripts/patch-r3f-events.mjs가 막는다.
function events(store: Parameters<typeof createEvents>[0]) {
  const manager = createEvents(store)
  const connect = manager.connect
  manager.connect = (target) => {
    if (!target) return
    connect?.(target)
  }
  return manager
}

export function Canvas(props: CanvasProps) {
  return <FiberCanvas {...props} events={events} />
}
