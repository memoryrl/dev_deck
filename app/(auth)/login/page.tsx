import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Card } from "@/components/ui/card"
import { LoginButtons } from "./login-buttons"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-20">
        <Card className="space-y-6 p-8">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">DevDeck</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">로그인</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              로그인은 글·리뷰를 편집할 때만 필요합니다. 게임 목록은 로그인 없이 볼 수 있습니다.
            </p>
          </div>
          {searchParams.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {searchParams.error}
            </p>
          ) : null}
          <LoginButtons />
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}
