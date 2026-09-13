import type { AccessRole } from "@/lib/access"

export type MenuLocation = "header" | "footer"

export type MenuItem = {
  id: string
  parent_id: string | null
  board_id: string | null
  label: string
  href: string | null
  location: MenuLocation
  view_role: AccessRole
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  boards?: { slug: string; name: string; is_active: boolean } | null
}

export type NavChild = {
  id: string
  label: string
  href: string
  note?: string
}

export type NavNode = {
  id: string
  label: string
  href: string | null
  children: NavChild[]
}
