"use client"

import { AccountMenu } from "@/components/layout/account-menu"
import type { AccountMenuUser } from "@/components/layout/account-menu"

export function UserMenu({
  user,
  showAdminNav = false,
}: {
  user: AccountMenuUser
  showAdminNav?: boolean
}) {
  return <AccountMenu user={user} showAdminNav={showAdminNav} />
}
