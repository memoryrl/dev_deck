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

// React가 아직 하이드레이션하지 않은 노드(스트리밍으로 뒤늦게 도착한 Suspense 내용 등)에 속성을 달면
// "서버 HTML과 속성이 다르다"는 하이드레이션 불일치가 난다. React가 하이드레이션한 요소에는
// __reactFiber$… 키가 붙으므로, 그게 있는 요소에만 태깅하고 나머지는 다음 재시도에 맡긴다.
// ponytail: React 내부 키 이름에 기대는 방식 — 깨지면 pathname 변경 후 고정 지연 태깅으로 대체.
const isHydrated = (el: HTMLElement) => Object.keys(el).some((key) => key.startsWith("__reactFiber$"))

// 글 상세 본문(RichContent variant="article") — CKEditor로 쓴 HTML이 dangerouslySetInnerHTML로 들어 있다.
const ARTICLE_BODY = ".rich-content.prose-article"
// 이미지류는 로딩 중 높이가 바뀌어 줄바꿈이 흔들리므로 이동 없이 페이드만 준다.
const MEDIA = "img, figure, picture, iframe, video"

/**
 * 블록이 글 본문을 품고 있으면 블록 전체를 한 덩어리로 띄우지 않는다(본문 안쪽이 따로 움직이므로 이중 애니메이션이 된다).
 * 대신 본문을 품지 않은 형제(제목·메타 등)만 각자 태깅 대상으로 돌려준다.
 */
function targetsOf(block: HTMLElement): HTMLElement[] {
  if (!block.querySelector(ARTICLE_BODY) && !block.matches(ARTICLE_BODY)) return [block]
  if (block.matches(ARTICLE_BODY)) return []
  return Array.from(block.children).flatMap((child) => (child instanceof HTMLElement ? targetsOf(child) : []))
}

/**
 * 글 본문의 직계 자식(문단·제목·표·이미지 등)을 각자 화면에 들어올 때 나타나게 한다.
 * dangerouslySetInnerHTML 내용도 React는 하이드레이션 때 서버가 준 HTML 문자열과 비교한다 — 그 전에 안쪽 DOM에
 * 속성을 달면 "서버 HTML과 다르다"는 불일치가 나므로, 본문 요소 자체가 하이드레이션된 뒤에만 태깅한다.
 * 아직이면 true를 돌려줘 호출자가 다시 시도한다.
 */
function tagArticleBodies(animation: string, onImageLoad: () => void): boolean {
  let pending = false
  document.querySelectorAll<HTMLElement>(`#main-content ${ARTICLE_BODY}`).forEach((body) => {
    if (body.closest("[data-aos-skip]")) return
    if (!isHydrated(body)) {
      pending = true
      return
    }
    for (const el of Array.from(body.children)) {
      if (!(el instanceof HTMLElement) || el.hasAttribute("data-aos")) continue
      el.setAttribute("data-aos", el.matches(MEDIA) || el.querySelector(MEDIA) ? "fade" : animation)
      el.setAttribute("data-aos-auto", "")
    }
    // 이미지가 늦게 로드되면 아래 요소들의 위치가 밀리므로, 로드되는 대로 AOS 위치를 다시 계산한다.
    body.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", onImageLoad, { once: true })
    })
  })
  return pending
}

/** 아직 하이드레이션 전이라 건너뛴 블록이 있으면 true(호출자가 다시 시도한다) */
function tagBlocks(animation: string, stagger: number, onImageLoad: () => void): boolean {
  const main = document.getElementById("main-content")
  if (!main || main.closest("[data-aos-skip]")) return false
  let pending = false
  let index = 0
  blocksOf(main).forEach((block) => {
    for (const el of targetsOf(block)) {
      if (el.hasAttribute("data-aos") && !el.hasAttribute("data-aos-auto")) continue
      if (el.closest("[data-aos-skip]")) continue
      if (!isHydrated(el)) {
        pending = true
        continue
      }
      el.setAttribute("data-aos", animation)
      el.setAttribute("data-aos-auto", "")
      el.setAttribute("data-aos-delay", delayStep(Math.min(index, 5) * stagger))
      index += 1
    }
  })
  return tagArticleBodies(animation, onImageLoad) || pending
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
    const MAX_RETRY = 40 // 150ms × 40 = 6초까지 하이드레이션을 기다린다
    let retries = 0
    let retryTimer = 0
    const sync = () => {
      if (isOff(aosOnMobile)) return
      const pending = tagBlocks(aosAnimation, aosStagger, () => AOS.refresh())
      AOS.refreshHard()
      window.clearTimeout(retryTimer)
      if (pending && retries++ < MAX_RETRY) retryTimer = window.setTimeout(sync, 150)
    }
    sync()
    // main이 페이지마다 새로 마운트되므로 body를 본다. ponytail: 변경이 잦아 느려지면 pathname 변경 시점 태깅으로 좁힌다.
    let raf = 0
    const observer = new MutationObserver(() => {
      retries = 0
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(sync)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
      window.clearTimeout(retryTimer)
    }
  }, [aosEnabled, aosAnimation, aosDuration, aosStagger, aosOffset, aosOnMobile])
  return null
}
