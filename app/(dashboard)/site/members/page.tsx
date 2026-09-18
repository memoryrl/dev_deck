import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { RefreshCw, User } from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListPager } from "@/components/layout/list-pager"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requireOwner } from "@/lib/auth/owner"
import { listMembers, type MemberListEntry } from "@/lib/site/members"
import { formatBoardDateTime } from "@/lib/i18n/format"
import type { AppLocale } from "@/lib/i18n/config"
import { getT } from "@/lib/i18n/dictionary"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"

export default function MembersPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string }
}) {
  const { t } = getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageTitleBanner
        title={t("admin.members.title")}
        breadcrumb={[
          { label: t("nav.dashboard"), href: "/site/dashboard" },
          { label: t("admin.members.title") },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        {t("admin.members.description")}
      </p>

      <form action="/site/members" className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("admin.members.searchPlaceholder")}
          className="h-10 min-w-[12rem] flex-1 rounded-full shadow-none"
          aria-label={t("common.searchPlaceholder")}
        />
        <Button type="submit" className="h-10 rounded-full px-5">
          {t("common.search")}
        </Button>
        <Button asChild variant="outline" size="icon" className="size-10 shrink-0 rounded-full">
          <Link href="/site/members" aria-label={t("common.searchReset")}>
            <RefreshCw />
          </Link>
        </Button>
      </form>

      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <MemberList page={page} q={q} />
      </Suspense>
    </div>
  )
}

async function MemberList({ page, q }: { page: number; q: string }) {
  await requireOwner()
  const { t, locale } = getT()
  const result = await listMembers({ page, q })
  const searched = Boolean(q)

  return (
    <div>
      <h2 className="font-display text-xl font-bold">
        {t("admin.members.total", { count: result.total })}
      </h2>
      {result.total === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          {searched ? t("list.emptySearch") : t("admin.members.empty")}
        </p>
      ) : (
        <>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {result.rows.map((member) => (
              <MemberCard key={member.id} member={member} locale={locale} />
            ))}
          </ul>
          <ListPager
            pathname="/site/members"
            result={result}
            extraParams={{ q: q || undefined }}
          />
        </>
      )}
    </div>
  )
}

function MemberCard({ member, locale }: { member: MemberListEntry; locale: AppLocale }) {
  const { t } = getT()
  const displayName = member.full_name || member.username || t("admin.members.noName")

  return (
    <li className="rounded-xl border bg-white p-5 dark:bg-card">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
          {member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt={displayName}
              width={48}
              height={48}
              className="size-12 rounded-full object-cover"
            />
          ) : (
            <User className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{displayName}</p>
          {member.username && member.full_name && (
            <p className="truncate text-sm text-muted-foreground">@{member.username}</p>
          )}
          {member.email && (
            <p className="truncate text-sm text-muted-foreground">{member.email}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {member.steam_id && (
              <Badge variant="outline" className="text-xs">
                {t("admin.members.steamLinked")}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {t("admin.members.commentCount", { count: member.commentCount })}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("admin.members.lastActivity")}: {formatBoardDateTime(member.updated_at, locale)}
          </p>
        </div>
      </div>
    </li>
  )
}
