"use client"

import { AccountMenu } from "@/components/layout/account-menu"
import type { AccountMenuUser } from "@/components/layout/account-menu"
import type { AdminSidebarGroup } from "@/components/layout/admin-nav"

export function UserMenu({
  user,
  showAdminNav = false,
  compact = false,
  adminMenus = [],
}: {
  user: AccountMenuUser
  showAdminNav?: boolean
  compact?: boolean
  adminMenus?: AdminSidebarGroup[]
}) {
  return <AccountMenu user={user} showAdminNav={showAdminNav} compact={compact} adminMenus={adminMenus} />
}
