import type { StaticImageData } from "next/image"
import arch from "@/public/hero/arch.jpg"
import desk from "@/public/hero/desk.jpg"
import dusk from "@/public/hero/dusk.jpg"
import ember from "@/public/hero/ember.jpg"
import silk from "@/public/hero/silk.jpg"
import stone from "@/public/hero/stone.jpg"

export type HeroWallpaper = {
  id: "desk" | "silk" | "stone" | "dusk" | "arch" | "ember"
  image: StaticImageData
  /** CSS object-position — 피사체가 우측에 있으므로 좁은 화면에서 잘리는 쪽을 정한다. */
  position: string
  /** 어두운 사진은 라이트 모드 스크림을 더 세게 깔아 헤드라인 대비를 확보한다. */
  tone: "light" | "dark"
}

// 좌측 2/3가 비어 있는 구도로 통일 — 히어로 카피가 왼쪽에 고정돼 있어서
// 사진 피사체(창·주름·빛줄기·바위)는 모두 우측에 몰아 두었다.
export const HERO_WALLPAPERS: readonly HeroWallpaper[] = [
  { id: "desk", image: desk, position: "70% 60%", tone: "light" },
  { id: "silk", image: silk, position: "80% 50%", tone: "light" },
  { id: "stone", image: stone, position: "70% 50%", tone: "light" },
  { id: "arch", image: arch, position: "78% 50%", tone: "light" },
  { id: "dusk", image: dusk, position: "75% 50%", tone: "dark" },
  { id: "ember", image: ember, position: "80% 45%", tone: "dark" },
]

/**
 * 요청마다 시작 장을 고른다. 클라이언트 캐러셀이 이 장부터 2초 간격으로
 * 좌측 슬라이드 순환한다. 폴백·본 히어로에 같은 시드를 내려 스트리밍 중
 * 첫 페인트가 어긋나지 않게 한다.
 */
export function pickHeroWallpaper(): HeroWallpaper {
  return HERO_WALLPAPERS[Math.floor(Math.random() * HERO_WALLPAPERS.length)]
}
