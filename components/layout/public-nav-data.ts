import { Briefcase, Gamepad2, Sparkles, Users } from "lucide-react"

export type MegaId = "prompt" | "career" | "games" | "community"

export function megaIdFromLabelKey(key?: string | null): MegaId | undefined {
  if (!key) return undefined
  if (key.startsWith("mega.prompt")) return "prompt"
  if (key.startsWith("mega.career")) return "career"
  if (key.startsWith("mega.games")) return "games"
  if (key.startsWith("mega.community")) return "community"
}

export const MENU_ICON = {
  prompt: Sparkles,
  career: Briefcase,
  games: Gamepad2,
  community: Users,
} as const

export const SCENE_LINE: Record<MegaId, string> = {
  prompt: "h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--lux-champagne))] to-transparent",
  career: "h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--lux-cognac))] to-transparent",
  games: "h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--lux-espresso))] to-transparent",
  community: "h-0.5 bg-gradient-to-r from-transparent via-[hsl(214_30%_36%)] to-transparent",
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
      href: "/b/prompts",
      ctaKey: "mega.prompt.cta",
    },
    groups: [
      {
        titleKey: "mega.browse",
        links: [
          { href: "/b/prompts", labelKey: "mega.prompt.public" },
          { href: "/b/prompts/top", labelKey: "mega.prompt.top" },
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
          { href: "/b/skills", labelKey: "mega.career.skills" },
          { href: "/b/skills/top", labelKey: "mega.career.skillsTop" },
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
          { href: "/games/top", labelKey: "mega.games.featured" },
        ],
      },
      {
        titleKey: "mega.edit",
        links: [{ href: "__steam__", labelKey: "mega.games.manage", noteKey: "mega.adminOnly" }],
      },
    ],
  },
  {
    id: "community",
    labelKey: "mega.community.label",
    highlight: {
      title: "Community",
      bodyKey: "mega.community.body",
      href: "/b/notice",
      ctaKey: "mega.community.cta",
    },
    groups: [
      {
        titleKey: "mega.browse",
        links: [
          { href: "/b/notice", labelKey: "mega.community.notice" },
          { href: "/b/free", labelKey: "mega.community.free" },
        ],
      },
      {
        titleKey: "mega.edit",
        links: [{ href: "__boards__", labelKey: "mega.community.manage", noteKey: "mega.adminOnly" }],
      },
    ],
  },
]
