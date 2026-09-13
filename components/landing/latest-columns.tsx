import Link from "next/link"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { CareerPost } from "@/types/career"
import type { Prompt } from "@/types/prompt"

function dateLabel(value: string) {
  return value.slice(0, 10).replaceAll("-", ".")
}

export function LatestColumns({
  prompts,
  posts,
}: {
  prompts: Prompt[]
  posts: CareerPost[]
}) {
  return (
    <section className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
      <div className="grid gap-10 md:grid-cols-2">
        <div id="prompts">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">AI Prompt</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">최신 게시물</p>
          {prompts.length === 0 ? (
            <EmptyPlaceholder className="mt-5">아직 공개된 프롬프트가 없습니다.</EmptyPlaceholder>
          ) : (
            <div className="mt-5 space-y-3">
              {prompts.map((prompt) => (
                <Link key={prompt.id} href={`/p/${prompt.id}`} className="block">
                  <Card className="transition hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-3">
                      <Badge>{prompt.category}</Badge>
                      <span className="text-xs text-muted-foreground">{dateLabel(prompt.created_at)}</span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{prompt.title}</h3>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div id="career">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">개발업무</h2>
            <Link href="/work" className="text-sm font-semibold underline">
              더 보기
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">최신 게시물</p>
          {posts.length === 0 ? (
            <EmptyPlaceholder className="mt-5">아직 공개된 글이 없습니다.</EmptyPlaceholder>
          ) : (
            <div className="mt-5 space-y-3">
              {posts.map((post) => (
                <Link key={post.id} href={`/work/${post.id}`} className="block">
                  <Card className="transition hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-3">
                      <Badge>{post.post_type}</Badge>
                      <span className="text-xs text-muted-foreground">{dateLabel(post.created_at)}</span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{post.title}</h3>
                    {post.excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                    ) : null}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
