import { redirect } from "next/navigation"
import { UserMenu } from "@/components/layout/user-menu"
import { Card } from "@/components/ui/card"
import { isOwnerUser } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/login")

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (isOwnerUser(user)) redirect("/promptkit")

  const name =
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    user.email

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-20">
      <Card className="mx-auto w-full max-w-md space-y-4 p-8">
        <p className="text-sm font-semibold text-muted-foreground">회원</p>
        <h1 className="font-display text-3xl font-extrabold">로그인되었습니다</h1>
        <p className="text-sm text-muted-foreground">
          지금은 회원 권한입니다. 프롬프트·커리어·리뷰 편집은 관리자만 할 수 있습니다.
        </p>
        <UserMenu name={name} />
      </Card>
    </main>
  )
}
