import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TERMS_HISTORY_PATH, TermsHistoryTable } from "@/app/(dashboard)/site/terms/history/history-table"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { parseListPage } from "@/lib/pagination"
import { getTermsDocuments, isTermsSlug, listTermsRevisions, TERMS_SLUGS } from "@/lib/terms/documents"
import { cn } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

export default async function TermsHistoryPage(
  props: {
    searchParams?: Promise<{ doc?: string; page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const { t } = await getT()
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

async function FilterTabs({ active }: { active: TermsSlug | null }) {
  const { t } = await getT()
  const items: { slug: TermsSlug | null; label: string }[] = [
    { slug: null, label: t("admin.terms.filterAll") },
    ...TERMS_SLUGS.map((slug) => ({ slug, label: t(`terms.doc.${slug}`) })),
  ]
  return (
    <nav aria-label={t("admin.terms.docTabs")} className="inline-flex rounded-full bg-muted p-0.5 text-sm font-semibold">
      {items.map((item) => (
        <Link
          key={item.slug ?? "all"}
          href={item.slug ? `${TERMS_HISTORY_PATH}?doc=${item.slug}` : TERMS_HISTORY_PATH}
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
  const [result, docs] = await Promise.all([listTermsRevisions({ slug: filter, page }), getTermsDocuments()])
  return <TermsHistoryTable result={result} currentVersions={docs} filter={filter} />
}
