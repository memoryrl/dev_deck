"use client"

import { useEffect } from "react"
import AOS from "aos"
import "aos/dist/aos.css"
import { useThemeConfig } from "@/components/theme/theme-config-provider"

// 화면마다 data-aos를 달지 않아도 되게, #main-content 안의 "콘텐츠 블록"에 자동으로 붙인다.
// 블록 = main에서 자식이 하나뿐인 래퍼를 타고 내려가 처음 갈라지는 지점의 자식들.
//  - 직접 data-aos를 단 요소는 그대로 존중하고, 옵트아웃은 조상에 data-aos-skip.
//  - 라우트 이동·Suspense 스트리밍으로 DOM이 바뀌면 MutationObserver로 다시 태깅한다.
//  - 켜기/끄기·애니메이션 종류·지속 시간은 테마 설정(useThemeConfig)을 따른다.
function blocksOf(main: HTMLElement) {
  let node: HTMLElement = main
  while (node.children.length === 1 && node.firstElementChild instanceof HTMLDivElement) {
    node = node.firstElementChild
  }
  return Array.from(node.children).filter((el): el is HTMLElement => el instanceof HTMLElement)
}

// 모션 줄이기 설정, 그리고(테마에서 허용하지 않으면) 모바일·태블릿(<1024px)에서는 AOS를 쓰지 않는다
// — 태깅도 하지 않아 요소가 숨겨지지 않는다.
const isOff = (onMobile: boolean) =>
  window.matchMedia(onMobile ? "(prefers-reduced-motion: reduce)" : "(max-width: 1023px), (prefers-reduced-motion: reduce)").matches

function untag() {
  document.querySelectorAll<HTMLElement>("[data-aos-auto]").forEach((el) => {
    el.removeAttribute("data-aos")
    el.removeAttribute("data-aos-delay")
    el.removeAttribute("data-aos-auto")
    el.classList.remove("aos-init", "aos-animate")
  })
}

// AOS 지연은 CSS 선택자가 50ms 단위(0·50·100…)로만 정의돼 있어 그 사이 값은 무시된다 — 50 단위로 맞춘다.
const delayStep = (ms: number) => String(Math.round(ms / 50) * 50)

function tagBlocks(animation: string, stagger: number) {
  const main = document.getElementById("main-content")
  if (!main || main.closest("[data-aos-skip]")) return
  blocksOf(main).forEach((el, i) => {
    if (el.hasAttribute("data-aos") && !el.hasAttribute("data-aos-auto")) return
    if (el.closest("[data-aos-skip]")) return
    el.setAttribute("data-aos", animation)
    el.setAttribute("data-aos-auto", "")
    el.setAttribute("data-aos-delay", delayStep(Math.min(i, 5) * stagger))
  })
}

export function AosInit() {
  const { config } = useThemeConfig()
  const { aosEnabled, aosAnimation, aosDuration, aosStagger, aosOffset, aosOnMobile } = config

  useEffect(() => {
    if (!aosEnabled) {
      untag()
      return
    }
    AOS.init({
      once: true,
      duration: aosDuration,
      offset: aosOffset,
      easing: "ease-out-cubic",
      disable: () => isOff(aosOnMobile),
    })
    const sync = () => {
      if (isOff(aosOnMobile)) return
      tagBlocks(aosAnimation, aosStagger)
      AOS.refreshHard()
    }
    sync()
    // main이 페이지마다 새로 마운트되므로 body를 본다. ponytail: 변경이 잦아 느려지면 pathname 변경 시점 태깅으로 좁힌다.
    let raf = 0
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(sync)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [aosEnabled, aosAnimation, aosDuration, aosStagger, aosOffset, aosOnMobile])
  return null
}
