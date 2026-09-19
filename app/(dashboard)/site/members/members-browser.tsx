"use client"

import { useState } from "react"
import { ChevronLeft, User } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatBoardDateTime } from "@/lib/i18n/format"
import type { MemberListEntry } from "@/lib/site/members"
import { cn } from "@/lib/utils"

function Avatar({ member, className }: { member: MemberListEntry; className: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted", className)}>
      {member.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- OAuth 아바타 호스트가 다양해서 next/image 허용 목록에 묶지 않는다
        <img
          src={member.avatar_url}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full rounded-full object-cover"
        />
      ) : (
        <User className="size-1/2 text-muted-foreground" />
      )}
    </div>
  )
}

export function MembersBrowser({ members }: { members: MemberListEntry[] }) {
  const { t, locale } = useI18n()
  const [selectedId, setSelectedId] = useState(members[0]?.id ?? null)
  // 좁은 화면에서는 목록과 상세를 번갈아 보여 준다.
  const [showDetail, setShowDetail] = useState(false)

  const selected = members.find((m) => m.id === selectedId) ?? members[0] ?? null
  const nameOf = (m: MemberListEntry) => m.full_name || m.username || t("admin.members.noName")

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start">
      <ul
        className={cn(
          "divide-y overflow-hidden rounded-xl border bg-white dark:bg-card",
          showDetail && "hidden lg:block"
        )}
        aria-label={t("admin.members.listTitle")}
      >
        {members.map((member) => {
          const active = member.id === selected?.id
          return (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(member.id)
                  setShowDetail(true)
                }}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                  active && "bg-muted lg:border-l-2 lg:border-l-foreground"
                )}
              >
                <Avatar member={member} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{nameOf(member)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.email ?? (member.username ? `@${member.username}` : "-")}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {selected ? (
        <section
          className={cn(
            "min-w-0 rounded-xl border bg-white p-5 dark:bg-card sm:p-6 lg:sticky lg:top-20",
            !showDetail && "hidden lg:block"
          )}
          aria-label={t("admin.members.detailTitle")}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-3 lg:hidden"
            onClick={() => setShowDetail(false)}
          >
            <ChevronLeft />
            {t("admin.members.backToList")}
          </Button>

          <div className="flex items-center gap-4">
            <Avatar member={selected} className="size-16" />
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-bold">{nameOf(selected)}</h3>
              {selected.username && selected.full_name ? (
                <p className="truncate text-sm text-muted-foreground">@{selected.username}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.steam_id ? (
                  <Badge variant="outline" className="text-xs">
                    {t("admin.members.steamLinked")}
                  </Badge>
                ) : null}
                <Badge variant="secondary" className="text-xs">
                  {t("admin.members.commentCount", { count: selected.commentCount })}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-x-6 gap-y-4 border-t pt-5 text-sm sm:grid-cols-2">
            <Field label={t("admin.members.fieldName")} value={selected.full_name} />
            <Field label={t("admin.members.fieldUsername")} value={selected.username && `@${selected.username}`} />
            <Field label={t("admin.members.fieldEmail")} value={selected.email} />
            <Field
              label={t("admin.members.fieldSteam")}
              value={selected.steam_id ? t("admin.members.steamLinked") : t("admin.members.steamNotLinked")}
            />
            {selected.steam_id ? (
              <Field label={t("admin.members.fieldSteamId")} value={selected.steam_id} mono />
            ) : null}
            <Field
              label={t("admin.members.fieldComments")}
              value={t("admin.members.commentCount", { count: selected.commentCount })}
            />
            <Field
              label={t("admin.members.lastActivity")}
              value={formatBoardDateTime(selected.updated_at, locale)}
            />
            <Field label={t("admin.members.fieldMemberId")} value={selected.id} mono className="sm:col-span-2" />
          </dl>
        </section>
      ) : null}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 break-all", mono && "font-mono text-xs")}>{value || "-"}</dd>
    </div>
  )
}
