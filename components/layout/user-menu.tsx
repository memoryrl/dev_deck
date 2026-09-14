"use client"

import { AccountMenu } from "@/components/layout/account-menu"
import type { AccountMenuUser } from "@/components/layout/account-menu"

export function UserMenu({
  user,
  showAdminNav = false,
  compact = false,
}: {
  user: AccountMenuUser
  showAdminNav?: boolean
  compact?: boolean
}) {
  return <AccountMenu user={user} showAdminNav={showAdminNav} compact={compact} />
}
