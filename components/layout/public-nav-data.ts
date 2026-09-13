import { Briefcase, Gamepad2, Sparkles } from "lucide-react"

export type MegaId = "prompt" | "career" | "games"

export const MENU_ICON = {
  prompt: Sparkles,
  career: Briefcase,
  games: Gamepad2,
} as const

export const SCENE_LINE: Record<MegaId, string> = {
  prompt: "h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--lux-champagne))] to-transparent",
  career: "h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--lux-cognac))] to-transparent",
  games: "h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--lux-espresso))] to-transparent",
}

export const publicMenus: {
  id: MegaId
  label: string
  highlight: { title: string; body: string; href: string; cta: string }
  groups: { title: string; links: { href: string; label: string; note?: string }[] }[]
}[] = [
  {
    id: "prompt",
    label: "AI Prompt",
    highlight: {
      title: "PromptKit",
      body: "바이브 코딩 프롬프트를 저장하고, 한 번에 복사해 재사용합니다.",
      href: "/#prompts",
      cta: "최근 프롬프트",
    },
    groups: [
      {
        title: "둘러보기",
        links: [
          { href: "/#prompts", label: "공개 프롬프트", note: "랜딩 최근 목록" },
          { href: "/", label: "허브 홈" },
        ],
      },
      {
        title: "편집",
        links: [{ href: "__prompt__", label: "프롬프트 관리", note: "관리자 전용" }],
      },
    ],
  },
  {
    id: "career",
    label: "커리어로그",
    highlight: {
      title: "CareerLog",
      body: "참여 프로젝트와 스킬을 게시판·블로그로 정리합니다.",
      href: "/work",
      cta: "커리어 게시판",
    },
    groups: [
      {
        title: "둘러보기",
        links: [
          { href: "/work", label: "전체 글" },
          { href: "/#career", label: "최근 커리어" },
          { href: "/#skills", label: "스킬" },
        ],
      },
      {
        title: "편집",
        links: [{ href: "__career__", label: "글·스킬 관리", note: "관리자 전용" }],
      },
    ],
  },
  {
    id: "games",
    label: "게임리뷰",
    highlight: {
      title: "Steam Tracker",
      body: "보유 게임과 한줄 리뷰를 공개 포트폴리오로 보여 줍니다.",
      href: "/games",
      cta: "라이브러리",
    },
    groups: [
      {
        title: "둘러보기",
        links: [
          { href: "/games", label: "게임 목록" },
          { href: "/#games", label: "추천 게임" },
        ],
      },
      {
        title: "편집",
        links: [{ href: "__steam__", label: "리뷰 관리", note: "관리자 전용" }],
      },
    ],
  },
]
