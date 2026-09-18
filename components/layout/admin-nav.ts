import {
  Briefcase,
  Gamepad2,
  History,
  LayoutList,
  Menu,
  MessageSquare,
  Palette,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react"

export const ADMIN_NAV: { href: string; labelKey: string; label: string; icon: LucideIcon }[] = [
  { href: "/promptkit", labelKey: "nav.promptkit", label: "PromptKit", icon: Sparkles },
  { href: "/career", labelKey: "nav.career", label: "CareerLog", icon: Briefcase },
  { href: "/steam", labelKey: "nav.steam", label: "Steam Tracker", icon: Gamepad2 },
  { href: "/site/boards", labelKey: "nav.boards", label: "게시판", icon: LayoutList },
  { href: "/site/comments", labelKey: "nav.comments", label: "댓글", icon: MessageSquare },
  { href: "/site/menus", labelKey: "nav.menus", label: "메뉴", icon: Menu },
  { href: "/site/uploads", labelKey: "nav.uploads", label: "업로드", icon: Upload },
  { href: "/site/login-history", labelKey: "nav.loginHistory", label: "접속 이력", icon: History },
  { href: "/site/design-system/common", labelKey: "nav.designSystem", label: "디자인 시스템", icon: Palette },
]
