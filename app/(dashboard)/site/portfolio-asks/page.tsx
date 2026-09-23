import { Suspense } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { ListPager } from "@/components/layout/list-pager"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { listPortfolioAsks } from "@/lib/portfolio-assistant/admin"
import { formatBoardDateTime } from "@/lib/utils"

export default async function PortfolioAsksPage(props: {
  searchParams?: Promise<{ page?: string; q?: string }>
}) {
  const searchParams = await props.searchParams
  const { t } = await getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="포트폴리오 질문"
        description="회원이 안내 챗에 묻고 로컬 모델이 답한 내용을 시간순으로 봅니다. 방문객 질문은 받지 않습니다."
      />

      <form action="/site/portfolio-asks" className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="질문·답변·회원 이름"
          className="h-10 min-w-[12rem] flex-1 rounded-full shadow-none"
          aria-label={t("common.searchPlaceholder")}
        />
        <Button type="submit" className="h-10 rounded-full px-5">
          {t("common.search")}
        </Button>
        <Button asChild variant="outline" size="icon" className="size-10 shrink-0 rounded-full">
          <Link href="/site/portfolio-asks" aria-label={t("common.searchReset")}>
            <RefreshCw />
          </Link>
        </Button>
      </form>

      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <AskList page={page} q={q} />
      </Suspense>
    </div>
  )
}

async function AskList({ page, q }: { page: number; q: string }) {
  await requireOwner()
  const result = await listPortfolioAsks({ page, q })

  return (
    <div>
      <h2 className="font-display text-xl font-bold">총 {result.total}건</h2>
      {result.total === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          {q ? "검색 결과가 없습니다." : "아직 기록된 질문이 없습니다."}
        </p>
      ) : (
        <>
          <ul className="mt-5 divide-y rounded-2xl border bg-card">
            {result.rows.map((row) => (
              <li key={row.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {row.displayName}
                    {row.email ? (
                      <span className="ml-2 font-normal text-muted-foreground">{row.email}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBoardDateTime(row.createdAt)}
                    {row.model ? ` · ${row.model}` : ""}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      질문
                    </span>
                    {row.question}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      답변
                    </span>
                    {row.answer}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <ListPager pathname="/site/portfolio-asks" result={result} extraParams={{ q: q || undefined }} />
        </>
      )}
    </div>
  )
}
