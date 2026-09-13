import { PublicHeaderNav } from "@/components/layout/public-header-nav"
import { isOwnerUser } from "@/lib/auth/roles"
import { listNavMenus } from "@/lib/menus/public"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export async function PublicHeader() {
  let signedIn = false
  let accountHref = "/login"
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      signedIn = true
      accountHref = isOwnerUser(user) ? "/promptkit" : "/account"
    }
  }

  const navNodes = await listNavMenus("header")

  return (
    <header className="sticky top-0 z-30 overflow-visible">
      <PublicHeaderNav signedIn={signedIn} accountHref={accountHref} navNodes={navNodes} />
    </header>
  )
}
