"use client"

import { usePathname } from "next/navigation"
import { useThemeConfig } from "@/components/theme/theme-config-provider"
import { THEME_BANNER_IMAGES } from "@/lib/site/theme-config"
import { BannerStyle1 } from "./banner-style1"
import { BannerStyle2 } from "./banner-style2"
import { BannerStyle3 } from "./banner-style3"
import type { BannerStyleProps } from "./types"

const STYLES = { style1: BannerStyle1, style2: BannerStyle2, style3: BannerStyle3 } as const

// 서버(PageTitleBanner)가 만든 데이터를 받아 테마 설정의 스타일로 그린다.
// 클라이언트에서 고르므로 원격 제어기에서 바꾸면 저장 전에도 바로 미리보기가 된다.
const ADMIN_PATH = /^\/(site|promptkit|career|steam)(\/|$)/

export function ThemedBanner({ randomImage, ...props }: Omit<BannerStyleProps, "image" | "admin"> & { randomImage: string }) {
  const { bannerStyle, bannerImage } = useThemeConfig().config
  const pathname = usePathname()
  const Style = STYLES[bannerStyle]
  // "random"이면 서버가 이번 화면용으로 뽑아 준 이미지를 쓴다(허용 목록 밖이면 기본 이미지).
  const key = bannerImage === "random" ? randomImage : bannerImage
  const image = (THEME_BANNER_IMAGES[key as keyof typeof THEME_BANNER_IMAGES] ?? THEME_BANNER_IMAGES.stone).src
  return <Style {...props} image={image} admin={ADMIN_PATH.test(pathname)} />
}
