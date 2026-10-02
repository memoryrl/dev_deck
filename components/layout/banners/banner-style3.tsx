"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { BannerBreadcrumb } from "./banner-breadcrumb"
import type { BannerStyleProps } from "./types"

// three.js·로봇 모델은 이 스타일을 고른 화면에서만, 클라이언트에서만 불러온다.
const MeetingScene = dynamic(() => import("./meeting-scene"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-2xl bg-white/10" />,
})

const delay = (ms: number) => ({ animationDelay: `${ms}ms` })

/**
 * 스타일 3 — 로봇 회의실.
 * 현재 메뉴의 팀장 로봇과 하위 메뉴 팀원 로봇들이 회의 테이블에 모여 돌아가며 말하는 3D 장면을 제목 옆에 둔다.
 */
export function BannerStyle3({ title, lede, crumbs, actions, image, team, admin, className }: BannerStyleProps) {
  const sceneBox = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const el = sceneBox.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    // 스타일 2와 같은 플랫한 전체 폭. 위 여백은 부모 패딩(공개 py-12, 관리자 py-8)을 음수 마진으로 지운다.
    <div data-aos-skip className={cn("relative overflow-hidden border-y", admin ? "-mx-5 -mt-8" : "ml-[calc(50%-50vw)] w-screen -mt-12", className)}>
      {/* 스타일 2와 같은 배경 이미지(랜덤/고정은 테마 설정) + 어두운 스크림 — 위에 흰 글자와 3D 장면을 올린다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/20" />
      {/* 배경은 전체 폭, 안쪽 내용은 콘텐츠 최대 너비(관리자는 영역 전체).
          모바일은 장면을 흐름에서 빼 우측 하단에 겹치므로, 배너 높이는 글 높이에 맞춘다. */}
      <div className={cn("relative mx-auto grid min-h-[13.5rem] items-end px-5 pb-4 pt-6 md:min-h-[240px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-6 md:pb-10 md:pt-12", admin ? "" : "max-w-6xl")}>
        {/* 모바일에서 글 영역(z-10)이 칸 전체 폭을 덮어 뒤의 3D 장면 터치를 가로채던 문제 — 모바일은 pointer-events-none, 눌러야 하는 것만 auto */}
        <div className="pointer-events-none relative z-10 min-w-0 text-white md:pointer-events-auto">
          {/* 렌더링되면 왼쪽 요소들은 왼→오른쪽으로 차례로(100ms 간격), 오른쪽 3D 장면은 애니메이션 없이 고정으로 보인다(globals.css banner-enter-left). 스크롤 연동(AOS)이 아니라 마운트 즉시 재생된다. */}
          <div className="banner-enter-left pointer-events-auto w-fit">
            <BannerBreadcrumb crumbs={crumbs} className="text-white/70" currentClass="text-white" />
          </div>
          <h1 style={delay(100)} className={cn("banner-enter-left font-display text-3xl font-extrabold tracking-tight md:text-5xl", crumbs.length > 0 ? "mt-2 md:mt-4" : null)}>{title}</h1>
          <div style={delay(200)} className="banner-enter-left mt-3 h-1 w-12 rounded-full bg-[hsl(var(--lux-champagne))] md:mt-5" aria-hidden />
          {lede ? <p style={delay(300)} className="banner-enter-left mt-3 max-w-[58%] text-sm leading-relaxed text-white/80 md:mt-5 md:max-w-md md:text-base">{lede}</p> : null}
          {actions ? <div style={delay(400)} className="banner-enter-left pointer-events-auto mt-3 flex max-w-[58%] flex-wrap items-center gap-2 text-foreground md:mt-5 md:max-w-none">{actions}</div> : null}
        </div>
        {/* 모바일: 배너 우측 하단. md+: 글 옆 열, 아래 끝까지 내리고 위·옆만 배경에 녹인다. */}
        <div
          ref={sceneBox}
          aria-hidden
          className="banner-scene-mask absolute bottom-0 right-0 top-[4.5rem] w-[78%] cursor-grab touch-none select-none active:cursor-grabbing md:static md:inset-auto md:-mb-10 md:h-[14.5rem] md:w-full"
        >
          <MeetingScene team={team} active={visible} />
        </div>
      </div>
    </div>
  )
}
