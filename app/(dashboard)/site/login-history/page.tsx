import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { ListPager } from "@/components/layout/list-pager"
import { Button } from "@/components/ui/button"
import { CustomSelect } from "@/components/ui/custom-select"
import { Input } from "@/components/ui/input"
import { listLoginHistory, type LoginHistorySearchField } from "@/lib/auth/login-history"
import { getT } from "@/lib/i18n/dictionary"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { ensureProfile } from "@/lib/supabase/server"
import { cn, formatBoardDateTime } from "@/lib/utils"
import type { LoginHistoryEventType } from "@/types/login-history"

const TYPE_OPTIONS: { value: LoginHistoryEventType | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "login", label: "로그인" },
  { value: "visit", label: "접속" },
]

const FIELD_OPTIONS: { value: LoginHistorySearchField; label: string }[] = [
  { value: "email", label: "이메일" },
  { value: "ip", label: "IP" },
  { value: "region", label: "지역" },
]

function isEventType(value: string | undefined): value is LoginHistoryEventType {
  return value === "login" || value === "visit"
}

function isSearchField(value: string | undefined): value is LoginHistorySearchField {
  return value === "email" || value === "ip" || value === "region"
}

export default async function LoginHistoryPage({
  searchParams,
}: {
  searchParams?: { page?: string; type?: string; q?: string; field?: string }
}) {
  await ensureProfile()
  const { t } = getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)
  const activeType = isEventType(searchParams?.type) ? searchParams.type : undefined
  const field = isSearchField(searchParams?.field) ? searchParams.field : "email"
  const history = await listLoginHistory({ page, eventType: activeType, q, field })
  const extra = { type: activeType, field: field === "email" ? undefined : field }
  const searched = Boolean(q)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">로그인 · 접속 이력</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          구글 로그인 성공 시점과, 회원·비회원 구분 없이 사이트에 접속한 시점을 함께 기록합니다. 접속 IP와
          지역 정보를 확인할 수 있습니다.
        </p>
      </div>

      <form action="/site/login-history" className="flex flex-wrap items-center gap-2">
        <CustomSelect
          name="type"
          defaultValue={activeType ?? "all"}
          options={TYPE_OPTIONS}
          aria-label="구분"
          className="shrink-0"
          triggerClassName="h-10 rounded-full bg-background pl-4 pr-3 font-medium"
        />
        <CustomSelect
          name="field"
          defaultValue={field}
          options={FIELD_OPTIONS}
          aria-label={t("common.searchField")}
          className="shrink-0"
          triggerClassName="h-10 rounded-full bg-background pl-4 pr-3 font-medium"
        />
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("common.searchPlaceholder")}
          className="h-10 min-w-[12rem] flex-1 rounded-full shadow-none"
          aria-label={t("common.searchPlaceholder")}
        />
        <Button type="submit" className="h-10 rounded-full px-5">
          {t("common.search")}
        </Button>
        <Button asChild variant="outline" size="icon" className="size-10 shrink-0 rounded-full">
          <Link href="/site/login-history" aria-label={t("common.searchReset")}>
            <RefreshCw />
          </Link>
        </Button>
      </form>

      <div>
        <h2 className="font-display text-xl font-bold">총 {history.total}건</h2>
        {history.total === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            {searched ? t("list.emptySearch") : "아직 기록이 없습니다."}
          </p>
        ) : (
          <>
            <ul className="mt-2 divide-y border-y bg-white dark:bg-card">
              {history.rows.map((entry, index) => {
                const number = history.total - ((history.page - 1) * history.pageSize + index)
                const isMember = Boolean(entry.user_id)
                return (
                  <li key={entry.id} className="flex flex-col gap-1.5 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-1.5 md:flex-row md:items-baseline md:justify-between md:gap-4">
                      <p className="min-w-0 text-[15px] leading-snug">
                        <span className="text-muted-foreground">No. {number}</span>
                        <span className="mx-2 text-foreground/20">|</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            entry.event_type === "login"
                              ? "bg-foreground/10 text-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {entry.event_type === "login" ? "로그인" : "접속"}
                        </span>
                        <span className="mx-2 text-foreground/20">|</span>
                        <span className="font-semibold text-foreground">
                          {isMember ? (entry.email ?? "(이메일 없음)") : "비회원"}
                        </span>
                        {entry.provider ? (
                          <>
                            <span className="mx-2 text-foreground/20">|</span>
                            <span>{entry.provider}</span>
                          </>
                        ) : null}
                      </p>
                      <p className="shrink-0 text-xs text-muted-foreground md:text-right">
                        IP {entry.ip_address || "-"}
                        {entry.ip_region ? (
                          <>
                            <span className="mx-1.5 text-foreground/20">|</span>
                            {entry.ip_region}
                          </>
                        ) : null}
                        <span className="mx-1.5 text-foreground/20">|</span>
                        {formatBoardDateTime(entry.created_at)}
                      </p>
                    </div>
                    {entry.user_agent ? (
                      <p className="truncate text-xs text-muted-foreground/70">{entry.user_agent}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            <ListPager
              pathname="/site/login-history"
              result={history}
              extraParams={{ ...extra, q: q || undefined }}
            />
          </>
        )}
      </div>
    </div>
  )
}
