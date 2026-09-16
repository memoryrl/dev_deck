import { Card } from "@/components/ui/card"
import { getT } from "@/lib/i18n/dictionary"
import { LoginButtons } from "./login-buttons"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const { t } = getT()
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-20">
      <Card className="mx-auto w-full max-w-md space-y-6 p-8">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">DevDeck</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{t("auth.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.lede")}
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
  )
}
