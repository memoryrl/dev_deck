import Link from "next/link"
import { PostList } from "@/components/board/post-list"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import type { CareerPost } from "@/types/career"
import type { Prompt } from "@/types/prompt"

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
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">AI Prompt</h2>
          <p className="mt-1 text-sm text-muted-foreground">최신 게시물</p>
          {prompts.length === 0 ? (
            <EmptyPlaceholder className="mt-5">아직 공개된 프롬프트가 없습니다.</EmptyPlaceholder>
          ) : (
            <PostList
              className="mt-5"
              items={prompts.map((prompt) => ({
                href: `/p/${prompt.id}`,
                title: prompt.title,
                createdAt: prompt.created_at,
                meta: prompt.category,
              }))}
            />
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
            <PostList
              className="mt-5"
              items={posts.map((post) => ({
                href: `/work/${post.id}`,
                title: post.title,
                createdAt: post.created_at,
                author: post.company,
                meta: post.post_type,
              }))}
            />
          )}
        </div>
      </div>
    </section>
  )
}
