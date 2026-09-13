import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Badge } from "@/components/ui/badge"
import { RichContent } from "@/components/editor/rich-content"
import { getPublicCareerPostById } from "@/lib/career/public"
import { formatPeriod } from "@/lib/utils"

export default async function PublicCareerPage({
  params,
}: {
  params: { id: string }
}) {
  const post = await getPublicCareerPostById(params.id)
  if (!post) notFound()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <article className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <Badge>{post.post_type}</Badge>
        <h1 className="mt-4 font-display text-4xl font-extrabold">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {[post.company, post.role, formatPeriod(post.period_start, post.period_end)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[...(post.skills ?? []), ...(post.tags ?? [])].map((item) => (
            <Badge key={item}>{item}</Badge>
          ))}
        </div>
        <div className="mt-8">
          <RichContent content={post.content} />
        </div>
        <p className="mt-10 text-sm">
          <Link href="/work" className="font-semibold underline">
            게시판으로
          </Link>
        </p>
      </article>
      <PublicFooter />
    </div>
  )
}
