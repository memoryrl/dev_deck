import {
  Briefcase,
  FileText,
  Gamepad2,
  History,
  Layers,
  LayoutDashboard,
  LayoutList,
  LayoutTemplate,
  Menu,
  MessageSquare,
  Monitor,
  Palette,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react"

export const ADMIN_NAV_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Sparkles,
  Briefcase,
  Gamepad2,
  LayoutList,
  MessageSquare,
  Menu,
  Upload,
  Users,
  History,
  Settings,
  Share2,
  FileText,
  Monitor,
  Palette,
  Layers,
  Shield,
  LayoutTemplate,
}

export function getAdminNavIcon(name: string): LucideIcon {
  return ADMIN_NAV_ICON_MAP[name] ?? LayoutDashboard
}
