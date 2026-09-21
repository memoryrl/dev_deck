import { Suspense } from "react"
import Link from "next/link"
import { History } from "lucide-react"
import { TermsEditorForm } from "@/app/(dashboard)/site/terms/terms-editor-form"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { EditorFormSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { getTermsDocuments, parseTermsSlug, TERMS_SLUGS } from "@/lib/terms/documents"
import { cn } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

export default async function SiteTermsPage(props: { searchParams?: Promise<{ doc?: string }> }) {
  const searchParams = await props.searchParams;
  const { t } = await getT()
  const slug = parseTermsSlug(searchParams?.doc)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={t("admin.terms.title")}
        description={t("admin.terms.description")}
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/terms/history">
              <History />
              {t("admin.terms.history")}
            </Link>
          </Button>
        }
      />

      <DocTabs active={slug} />

      <Suspense key={slug} fallback={<EditorFormSkeleton />}>
        <TermsEditor slug={slug} />
      </Suspense>
    </div>
  )
}

async function DocTabs({ active }: { active: TermsSlug }) {
  const { t } = await getT()
  return (
    <nav aria-label={t("admin.terms.docTabs")} className="inline-flex rounded-full bg-muted p-0.5 text-sm font-semibold">
      {TERMS_SLUGS.map((slug) => (
        <Link
          key={slug}
          href={slug === "terms" ? "/site/terms" : `/site/terms?doc=${slug}`}
          aria-current={active === slug ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-1.5 transition-colors",
            active === slug ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t(`terms.doc.${slug}`)}
        </Link>
      ))}
    </nav>
  )
}

async function TermsEditor({ slug }: { slug: TermsSlug }) {
  await requireOwner()
  const docs = await getTermsDocuments()
  return <TermsEditorForm document={docs[slug]} />
}
