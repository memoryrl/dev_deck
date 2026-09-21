import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft, Eye } from "lucide-react"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { ListPager } from "@/components/layout/list-pager"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { parseListPage } from "@/lib/pagination"
import { getTermsDocuments, isTermsSlug, listTermsRevisions, TERMS_SLUGS } from "@/lib/terms/documents"
import { cn } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

const HISTORY_PATH = "/site/terms/history"

export default function TermsHistoryPage({
  searchParams,
}: {
  searchParams?: { doc?: string; page?: string }
}) {
  const { t } = getT()
  const docParam = searchParams?.doc
  const filter: TermsSlug | null = isTermsSlug(docParam) ? docParam : null
  const page = parseListPage(searchParams?.page)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={t("admin.terms.historyTitle")}
        description={t("admin.terms.historyDescription")}
        breadcrumb={[{ label: t("admin.terms.history") }]}
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/terms">
              <ArrowLeft />
              {t("admin.terms.backToEditor")}
            </Link>
          </Button>
        }
      />

      <FilterTabs active={filter} />

      <Suspense key={`${filter ?? "all"}-${page}`} fallback={<ListSkeleton withSearch={false} />}>
        <HistoryList filter={filter} page={page} />
      </Suspense>
    </div>
  )
}

function FilterTabs({ active }: { active: TermsSlug | null }) {
  const { t } = getT()
  const items: { slug: TermsSlug | null; label: string }[] = [
    { slug: null, label: t("admin.terms.filterAll") },
    ...TERMS_SLUGS.map((slug) => ({ slug, label: t(`terms.doc.${slug}`) })),
  ]
  return (
    <nav aria-label={t("admin.terms.docTabs")} className="inline-flex rounded-full bg-muted p-0.5 text-sm font-semibold">
      {items.map((item) => (
        <Link
          key={item.slug ?? "all"}
          href={item.slug ? `${HISTORY_PATH}?doc=${item.slug}` : HISTORY_PATH}
          aria-current={active === item.slug ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-1.5 transition-colors",
            active === item.slug ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

async function HistoryList({ filter, page }: { filter: TermsSlug | null; page: number }) {
  await requireOwner()
  const { t, locale } = getT()
  const [result, docs] = await Promise.all([listTermsRevisions({ slug: filter, page }), getTermsDocuments()])

  if (result.total === 0) {
    return <EmptyPlaceholder>{t("admin.terms.historyEmpty")}</EmptyPlaceholder>
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">{t("common.totalCount", { count: result.total })}</h2>
      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-card">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/60 text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-3 font-semibold">{t("admin.terms.col.document")}</th>
              <th className="px-3 py-3 font-semibold">{t("admin.terms.col.version")}</th>
              <th className="px-3 py-3 font-semibold">{t("common.title")}</th>
              <th className="px-3 py-3 font-semibold">{t("admin.terms.col.note")}</th>
              <th className="px-3 py-3 font-semibold">{t("admin.terms.col.editor")}</th>
              <th className="px-3 py-3 font-semibold">{t("admin.terms.col.editedAt")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("admin.terms.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => {
              const current = docs[row.slug]?.version === row.version
              return (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-semibold">{t(`terms.doc.${row.slug}`)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      v{row.version}
                      {current ? <Badge className="px-1.5 py-0 text-[10px]">{t("admin.terms.current")}</Badge> : null}
                    </span>
                  </td>
                  <td className="max-w-[16rem] truncate px-3 py-3">{row.title}</td>
                  <td className="max-w-[18rem] truncate px-3 py-3 text-muted-foreground">
                    {row.note ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{row.edited_by_email ?? t("admin.terms.systemEditor")}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                    {formatBoardDateTime(row.created_at, locale)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`${HISTORY_PATH}/${row.id}`}>
                        <Eye />
                        {t("admin.terms.view")}
                      </Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ListPager pathname={HISTORY_PATH} result={result} extraParams={{ doc: filter ?? undefined }} />
    </div>
  )
}
