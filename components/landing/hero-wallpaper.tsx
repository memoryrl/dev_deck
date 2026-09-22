import Image from "next/image"
import { cn } from "@/lib/utils"
import type { HeroWallpaper as HeroWallpaperData } from "@/lib/landing/hero-wallpapers"

// 클래식 히어로 바닥에 깔리는 풀블리드 월페이퍼. 사진 위에 스크림을 겹쳐 얹는다:
// 1) 카피가 놓이는 쪽(데스크톱은 좌측, 모바일은 상단)을 배경색으로 눌러 가독성 확보
// 2) 하단은 페이지 배경으로 녹여 다음 섹션과 경계가 딱 끊기지 않게
// 3) 다크 모드는 사진이 밝은 톤이라 전체를 한 번 더 어둡게 눌러 준다
export function HeroWallpaper({ wallpaper }: { wallpaper: HeroWallpaperData }) {
  const dark = wallpaper.tone === "dark"
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src={wallpaper.image}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: wallpaper.position }}
      />
      <div className="absolute inset-0 hidden dark:block dark:bg-background/55" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b via-55% md:hidden",
          dark
            ? "from-background/95 via-background/70 to-background/10"
            : "from-background/85 via-background/45 to-transparent",
          "dark:from-background/95 dark:via-background/70 dark:to-background/20"
        )}
      />
      <div
        className={cn(
          "absolute inset-0 hidden bg-gradient-to-r via-45% md:block",
          dark
            ? "from-background/95 via-background/60 to-transparent"
            : "from-background/85 via-background/35 to-transparent",
          "dark:from-background/95 dark:via-background/60 dark:to-background/10"
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
