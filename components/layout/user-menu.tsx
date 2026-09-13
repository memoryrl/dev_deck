"use client"

import { signOut } from "@/app/(dashboard)/promptkit/actions"
import { Button } from "@/components/ui/button"

export function UserMenu({ name }: { name?: string | null }) {
  return (
    <form action={signOut}>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-semibold md:inline">{name ?? "Owner"}</span>
        <Button type="submit" variant="outline">
          로그아웃
        </Button>
      </div>
    </form>
  )
}
