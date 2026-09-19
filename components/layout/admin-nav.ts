import {
  Briefcase,
  Gamepad2,
  History,
  LayoutDashboard,
  LayoutList,
  LayoutTemplate,
  Menu,
  MessageSquare,
  Monitor,
  Palette,
  Settings,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react"
import { menuLabel, type MenuLabelSource } from "@/lib/menus/label"
import type { AppLocale } from "@/lib/i18n/config"

export const ADMIN_NAV: { href: string; labelKey: string; label: string; icon: LucideIcon }[] = [
  { href: "/site/dashboard", labelKey: "nav.dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/promptkit", labelKey: "nav.promptkit", label: "PromptKit", icon: Sparkles },
  { href: "/career", labelKey: "nav.career", label: "CareerLog", icon: Briefcase },
  { href: "/steam", labelKey: "nav.steam", label: "Steam Tracker", icon: Gamepad2 },
  { href: "/site/boards", labelKey: "nav.boards", label: "게시판", icon: LayoutList },
  { href: "/site/comments", labelKey: "nav.comments", label: "댓글", icon: MessageSquare },
  { href: "/site/menus", labelKey: "nav.menus", label: "메뉴", icon: Menu },
  { href: "/site/uploads", labelKey: "nav.uploads", label: "업로드", icon: Upload },
  { href: "/site/members", labelKey: "nav.members", label: "회원", icon: Users },
  { href: "/site/login-history", labelKey: "nav.loginHistory", label: "접속 이력", icon: History },
  { href: "/site/settings", labelKey: "nav.settings", label: "설정", icon: Settings },
  { href: "/site/system", labelKey: "nav.system", label: "시스템", icon: Monitor },
  { href: "/site/design-system/common", labelKey: "nav.designSystemCommon", label: "공통영역", icon: Palette },
  { href: "/site/design-system/screens", labelKey: "nav.designSystemScreens", label: "화면영역", icon: LayoutTemplate },
]

export type AdminSidebarItem = {
  id: string
  label: string
  labelKey?: string | null
  labels?: MenuLabelSource["labels"]
  href: string
  iconName: string
}

export type AdminSidebarGroup = {
  id: string
  label: string
  labelKey?: string | null
  labels?: MenuLabelSource["labels"]
  iconName: string
  href: string | null
  items: AdminSidebarItem[]
}

export function isAdminNavActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
}

export function adminNavLabel(
  t: (key: string) => string,
  item: MenuLabelSource,
  locale?: AppLocale
) {
  return menuLabel(t, item, locale)
}
