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
  labelKey: string
  highlight: { title: string; bodyKey: string; href: string; ctaKey: string }
  groups: { titleKey: string; links: { href: string; labelKey: string; noteKey?: string }[] }[]
}[] = [
  {
    id: "prompt",
    labelKey: "mega.prompt.label",
    highlight: {
      title: "PromptKit",
      bodyKey: "mega.prompt.body",
      href: "/#prompts",
      ctaKey: "mega.prompt.cta",
    },
    groups: [
      {
        titleKey: "mega.browse",
        links: [
          { href: "/#prompts", labelKey: "mega.prompt.public", noteKey: "mega.prompt.publicNote" },
          { href: "/", labelKey: "mega.prompt.home" },
        ],
      },
      {
        titleKey: "mega.edit",
        links: [{ href: "__prompt__", labelKey: "mega.prompt.manage", noteKey: "mega.adminOnly" }],
      },
    ],
  },
  {
    id: "career",
    labelKey: "mega.career.label",
    highlight: {
      title: "CareerLog",
      bodyKey: "mega.career.body",
      href: "/work",
      ctaKey: "mega.career.cta",
    },
    groups: [
      {
        titleKey: "mega.browse",
        links: [
          { href: "/work", labelKey: "mega.career.all" },
          { href: "/#career", labelKey: "mega.career.recent" },
          { href: "/#skills", labelKey: "mega.career.skills" },
        ],
      },
      {
        titleKey: "mega.edit",
        links: [{ href: "__career__", labelKey: "mega.career.manage", noteKey: "mega.adminOnly" }],
      },
    ],
  },
  {
    id: "games",
    labelKey: "mega.games.label",
    highlight: {
      title: "Steam Tracker",
      bodyKey: "mega.games.body",
      href: "/games",
      ctaKey: "mega.games.cta",
    },
    groups: [
      {
        titleKey: "mega.browse",
        links: [
          { href: "/games", labelKey: "mega.games.list" },
          { href: "/#games", labelKey: "mega.games.featured" },
        ],
      },
      {
        titleKey: "mega.edit",
        links: [{ href: "__steam__", labelKey: "mega.games.manage", noteKey: "mega.adminOnly" }],
      },
    ],
  },
]
