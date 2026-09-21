import Link from "next/link"
import { Eye } from "lucide-react"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { ListPager } from "@/components/layout/list-pager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/dictionary"
import { formatBoardDateTime } from "@/lib/i18n/format"
import type { PagedResult } from "@/lib/pagination"
import type { TermsDocument, TermsRevisionSummary, TermsSlug } from "@/types/terms"

export const TERMS_HISTORY_PATH = "/site/terms/history"

export async function TermsHistoryTable({
  result,
  currentVersions,
  filter,
}: {
  result: PagedResult<TermsRevisionSummary>
  currentVersions: Partial<Record<TermsSlug, Pick<TermsDocument, "version">>>
  filter: TermsSlug | null
}) {
  const { t, locale } = await getT()

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
              const current = currentVersions[row.slug]?.version === row.version
              return (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-semibold">{t(`terms.doc.${row.slug}`)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      v{row.version}
                      {current ? <Badge className="px-1.5 py-0 text-[10px]">{t("admin.terms.current")}</Badge> : null}
                    </span>
                  </td>
                  <td className="max-w-[16rem] px-3 py-3">
                    <span className="flex items-center gap-2">
                      <span className="truncate">{row.title}</span>
                      {row.has_en ? (
                        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]" title={row.title_en}>
                          EN
                        </Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="max-w-[18rem] truncate px-3 py-3 text-muted-foreground">{row.note ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {row.edited_by_email ?? t("admin.terms.systemEditor")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                    {formatBoardDateTime(row.created_at, locale)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`${TERMS_HISTORY_PATH}/${row.id}`}>
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
      <ListPager pathname={TERMS_HISTORY_PATH} result={result} extraParams={{ doc: filter ?? undefined }} />
    </div>
  )
}
