import Link from "next/link"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { listPublicCareerPosts } from "@/lib/career/public"
import { formatPeriod } from "@/lib/utils"

export default async function WorkBoardPage() {
  const posts = await listPublicCareerPosts()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <h1 className="font-display text-4xl font-extrabold">커리어</h1>
        <p className="mt-2 text-muted-foreground">참여 프로젝트와 스킬 정리</p>
        {posts.length === 0 ? (
          <p className="mt-10 text-sm">아직 공개된 글이 없습니다.</p>
        ) : (
          <div className="mt-8 space-y-4">
            {posts.map((post) => (
              <Link key={post.id} href={`/work/${post.id}`}>
                <Card>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{post.post_type}</Badge>
                    {post.company ? <Badge>{post.company}</Badge> : null}
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-bold">{post.title}</h2>
                  {post.excerpt ? (
                    <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatPeriod(post.period_start, post.period_end)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
