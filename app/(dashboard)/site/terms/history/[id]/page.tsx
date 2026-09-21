import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil } from "lucide-react"
import { RichContent } from "@/components/editor/rich-content"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { getAdjacentTermsRevisions, getTermsDocuments, getTermsRevision } from "@/lib/terms/documents"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TermsRevisionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requireOwner()
  if (!UUID_RE.test(params.id)) notFound()

  const revision = await getTermsRevision(params.id)
  if (!revision) notFound()

  const { t, locale } = await getT()
  const [docs, adjacent] = await Promise.all([
    getTermsDocuments(),
    getAdjacentTermsRevisions(revision.slug, revision.version),
  ])
  const isCurrent = docs[revision.slug]?.version === revision.version
  const docLabel = t(`terms.doc.${revision.slug}`)
  const editorHref = revision.slug === "terms" ? "/site/terms" : `/site/terms?doc=${revision.slug}`

  const meta: { label: string; value: string }[] = [
    { label: t("admin.terms.col.document"), value: docLabel },
    { label: t("admin.terms.col.version"), value: `v${revision.version}` },
    { label: t("admin.terms.col.editor"), value: revision.edited_by_email ?? t("admin.terms.systemEditor") },
    { label: t("admin.terms.col.editedAt"), value: formatBoardDateTime(revision.created_at, locale) },
  ]

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={`${docLabel} v${revision.version}`}
        description={revision.note ?? t("admin.terms.noNote")}
        seed={`terms-revision-${revision.slug}`}
        breadcrumb={[
          { label: t("admin.terms.history"), href: `/site/terms/history?doc=${revision.slug}` },
          { label: `v${revision.version}` },
        ]}
        actions={
          <>
            <Button asChild variant="outline" className="rounded-full">
              <Link href={`/site/terms/history?doc=${revision.slug}`}>
                <ArrowLeft />
                {t("common.backToList")}
              </Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href={editorHref}>
                <Pencil />
                {t("admin.terms.editCurrent")}
              </Link>
            </Button>
          </>
        }
      />

      <section className="rounded-xl border bg-white p-6 dark:bg-card">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold">{revision.title}</h2>
          {isCurrent ? <Badge>{t("admin.terms.current")}</Badge> : <Badge variant="secondary">{t("admin.terms.past")}</Badge>}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {meta.map((item) => (
            <div key={item.label} className="rounded-2xl border bg-card px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 truncate text-sm font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <article className="min-w-0 rounded-xl border bg-white p-6 dark:bg-card sm:p-8">
          <div className="mb-5 flex items-center gap-2 border-b pb-4">
            <h3 className="font-display text-base font-bold">{t("admin.terms.lang.ko")}</h3>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">KO</Badge>
          </div>
          <RichContent content={revision.content} />
        </article>

        <article className="min-w-0 rounded-xl border bg-white p-6 dark:bg-card sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 border-b pb-4">
            <h3 className="font-display text-base font-bold">
              {revision.title_en.trim() || t("admin.terms.lang.en")}
            </h3>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">EN</Badge>
          </div>
          {revision.content_en.trim() ? (
            <RichContent content={revision.content_en} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("admin.terms.lang.enMissingRevision")}</p>
          )}
        </article>
      </div>

      <nav aria-label={t("admin.terms.versionNav")} className="flex items-center justify-between gap-3">
        {adjacent.prev ? (
          <Button asChild variant="outline">
            <Link href={`/site/terms/history/${adjacent.prev.id}`}>
              <ChevronLeft />
              {t("admin.terms.prevVersion", { version: adjacent.prev.version })}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {adjacent.next ? (
          <Button asChild variant="outline">
            <Link href={`/site/terms/history/${adjacent.next.id}`}>
              {t("admin.terms.nextVersion", { version: adjacent.next.version })}
              <ChevronRight />
            </Link>
          </Button>
        ) : null}
      </nav>
    </div>
  )
}
