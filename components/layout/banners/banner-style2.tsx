import { cn } from "@/lib/utils"
import { BannerBreadcrumb } from "./banner-breadcrumb"
import type { BannerStyleProps } from "./types"

/**
 * 스타일 2 — 와이드 이미지 배경.
 * 배경 이미지는 좌우 여백까지 전부 쓰고(전체 폭), 글자 영역은 콘텐츠 최대 너비에 맞춘다. 높이도 더 길다.
 * 전체 폭은 transform 없이 음수 마진으로 낸다 — AOS가 같은 요소에 transform을 걸기 때문.
 *  - 공개 페이지: 가운데 정렬된 컨테이너 기준으로 뷰포트 폭까지 (ml-[calc(50%-50vw)])
 *  - 관리자: main 의 좌우 패딩(px-5)만큼만 (사이드바를 덮지 않게)
 */
export function BannerStyle2({ title, lede, crumbs, actions, image, admin, className }: BannerStyleProps) {
  return (
    <div className={cn("relative overflow-hidden", admin ? "-mx-5" : "ml-[calc(50%-50vw)] w-screen", className)}>
      {/* 장식 이미지 — next/image 대신 <img>: 기존 히어로와 같은 이유(exFAT 개발 환경)로 최적화 경로를 거치지 않는다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/20" />
      <div className={cn("relative mx-auto flex min-h-[260px] items-end px-5 pb-10 pt-24 md:min-h-[360px] md:pb-14", admin ? "" : "max-w-6xl")}>
        <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 text-white">
            <BannerBreadcrumb crumbs={crumbs} className="text-white/70" currentClass="text-white" />
            <h1 className={cn("font-display text-4xl font-extrabold tracking-tight md:text-5xl", crumbs.length > 0 ? "mt-4" : null)}>{title}</h1>
            <div className="mt-5 h-1 w-12 rounded-full bg-[hsl(var(--lux-champagne))]" aria-hidden />
            {lede ? <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">{lede}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}
