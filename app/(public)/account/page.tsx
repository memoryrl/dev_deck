import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AtSign, Calendar, Gamepad2, KeyRound, ShieldCheck, User } from "lucide-react"
import type { User as AuthUser } from "@supabase/supabase-js"
import { WithdrawButton } from "@/app/(public)/account/withdraw-button"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { isOwnerUser } from "@/lib/auth/roles"
import { sessionUserView, usernameFromAuth } from "@/lib/auth/session-user"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { getT } from "@/lib/i18n/dictionary"
import { createClient, getAuthUser } from "@/lib/supabase/server"
import { termsGatePath } from "@/lib/terms/consent"
import { isSupabaseConfigured } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return {
    title: `${t("account.title")} · DevDeck`,
    description: t("account.description"),
  }
}

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/login")

  const user = await getAuthUser()
  if (!user) redirect("/login")

  // 약관을 아직 확인하지 않은 회원은 마이페이지 대신 약관 확인 화면으로 보낸다.
  const gate = await termsGatePath(user)
  if (gate) redirect(gate)

  const { t, locale } = await getT()
  const account = sessionUserView(user)
  const owner = isOwnerUser(user)
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, steam_id")
    .eq("id", user.id)
    .maybeSingle()

  const displayName =
    (profile?.full_name as string | null | undefined)?.trim() ||
    account.name
  const username =
    (profile?.username as string | null | undefined)?.trim() || usernameFromAuth(user)
  const steamId =
    (profile?.steam_id as string | null | undefined)?.trim() ||
    (owner ? process.env.STEAM_ID?.trim() || null : null)
  const provider = providerLabel(authProvider(user), t)

  const fields: { label: string; value: string; icon: typeof User; href?: string }[] = [
    { label: t("account.username"), value: username ? `@${username}` : t("common.none"), icon: AtSign },
    { label: t("account.provider"), value: provider, icon: KeyRound },
    { label: t("account.joinedAt"), value: formatBoardDateTime(user.created_at, locale), icon: Calendar },
    {
      label: t("account.steamId"),
      value: steamId ?? t("common.none"),
      icon: Gamepad2,
      href: steamId ? `https://steamcommunity.com/profiles/${steamId}` : undefined,
    },
  ]

  return (
    <PublicContainer>
      <PageTitleBanner title={t("account.title")} description={t("account.description")} />

      <Card className="mt-8 overflow-hidden p-0">
        <div className="relative overflow-hidden border-b bg-gradient-to-br from-[hsl(var(--lux-champagne)/0.16)] to-card px-6 py-7 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-[radial-gradient(circle,hsl(var(--lux-champagne)/0.3),transparent_68%)] blur-2xl"
          />
          <div className="relative flex items-center gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-5">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted ring-4 ring-background">
                {account.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- OAuth 아바타 호스트가 다양하다
                  <img
                    src={account.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold sm:text-2xl">{displayName}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{account.email}</p>
              </div>
            </div>
            <Badge variant={owner ? "default" : "secondary"} className="shrink-0 gap-1">
              <ShieldCheck className="size-3" />
              {t(`role.${account.role}`)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2 sm:px-8 sm:py-7">
          {fields.map((field) => {
            const Icon = field.icon
            const body = (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 ring-1 ring-foreground/5">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </span>
                  <span className="block truncate text-sm font-semibold">{field.value}</span>
                </span>
              </>
            )
            return field.href ? (
              <a
                key={field.label}
                href={field.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
              >
                {body}
              </a>
            ) : (
              <div key={field.label} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
                {body}
              </div>
            )
          })}
        </div>
      </Card>

      <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-6">
        {owner ? (
          <p className="text-sm text-muted-foreground">{t("account.withdrawOwner")}</p>
        ) : (
          <WithdrawButton />
        )}
      </div>
    </PublicContainer>
  )
}

function authProvider(user: AuthUser) {
  const identities = user.identities ?? []
  const oauth = identities.find((identity) => identity.provider && identity.provider !== "email")
  return oauth?.provider || user.app_metadata?.provider || identities[0]?.provider
}

function providerLabel(provider: string | undefined, t: (key: string) => string) {
  if (!provider) return t("common.none")
  if (provider === "google") return "Google"
  if (provider === "email") return t("account.providerEmail")
  return provider
}
