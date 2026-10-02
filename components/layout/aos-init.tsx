"use client"

import { useEffect } from "react"
import AOS from "aos"
import "aos/dist/aos.css"

// 화면마다 data-aos를 달지 않아도 되게, #main-content 안의 "콘텐츠 블록"에 자동으로 붙인다.
// 블록 = main에서 자식이 하나뿐인 래퍼를 타고 내려가 처음 갈라지는 지점의 자식들.
//  - 직접 data-aos를 단 요소는 그대로 존중하고, 옵트아웃은 조상에 data-aos-skip.
//  - loading.tsx 경계 때문에 셸만 먼저 hydrate되고 페이지 HTML은 아직 fiber가 없을 수 있다.
//    그 상태에서 속성을 쓰면 hydration mismatch가 나므로, fiber가 붙은 뒤에만 태깅한다.
function blocksOf(main: HTMLElement) {
  let node: HTMLElement = main
  while (node.children.length === 1 && node.firstElementChild instanceof HTMLDivElement) {
    node = node.firstElementChild
  }
  return Array.from(node.children).filter((el): el is HTMLElement => el instanceof HTMLElement)
}

function hasReactFiber(el: Element) {
  return Object.keys(el).some((key) => key.startsWith("__reactFiber$"))
}

function tagBlocks() {
  const main = document.getElementById("main-content")
  if (!main || main.closest("[data-aos-skip]")) return false
  let tagged = false
  let pending = false
  blocksOf(main).forEach((el, i) => {
    if (el.hasAttribute("data-aos") || el.closest("[data-aos-skip]")) return
    if (!hasReactFiber(el)) {
      pending = true
      return
    }
    el.setAttribute("data-aos", "fade-up")
    el.setAttribute("data-aos-delay", String(Math.min(i, 5) * 80))
    tagged = true
  })
  // refresh()는 init 시점에 모아 둔 목록만 다시 계산한다. 나중에 붙인 data-aos는 refreshHard로 다시 수집해야 aos-animate가 붙고, 안 그러면 opacity: 0에 멈춘다.
  if (tagged) AOS.refreshHard()
  return pending
}

export function AosInit() {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    AOS.init({
      once: true,
      duration: 700,
      offset: 60,
      easing: "ease-out-cubic",
      disable: () => mql.matches,
    })
    if (mql.matches) return

    let raf = 0
    let frames = 0
    const pump = () => {
      const pending = tagBlocks()
      frames += 1
      if (pending && frames < 180) raf = requestAnimationFrame(pump)
    }
    const kick = () => {
      frames = 0
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(pump)
    }

    kick()
    const main = document.getElementById("main-content")
    const observer = new MutationObserver(kick)
    if (main) observer.observe(main, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
