import { Briefcase, Gamepad2, LayoutList, Menu, MessageSquare, Sparkles, type LucideIcon } from "lucide-react"

export const ADMIN_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/promptkit", label: "PromptKit", icon: Sparkles },
  { href: "/career", label: "CareerLog", icon: Briefcase },
  { href: "/steam", label: "Steam Tracker", icon: Gamepad2 },
  { href: "/site/boards", label: "게시판", icon: LayoutList },
  { href: "/site/comments", label: "댓글", icon: MessageSquare },
  { href: "/site/menus", label: "메뉴", icon: Menu },
]
