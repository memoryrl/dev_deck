import Link from "next/link"
import { PostList } from "@/components/board/post-list"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { getT } from "@/lib/i18n/dictionary"
import type { CareerPost } from "@/types/career"
import type { Prompt } from "@/types/prompt"

export function LatestColumns({
  prompts,
  posts,
}: {
  prompts: Prompt[]
  posts: CareerPost[]
}) {
  const { t } = getT()
  return (
    <section className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16 pt-8">
      <div className="grid gap-10 md:grid-cols-2">
        <ScrollReveal variant="left" duration={600}>
          <div id="prompts">
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">{t("mega.prompt.label")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("landing.latestPosts")}</p>
            {prompts.length === 0 ? (
              <EmptyPlaceholder className="mt-5">{t("landing.emptyPrompts")}</EmptyPlaceholder>
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
        </ScrollReveal>

        <ScrollReveal variant="right" delay={100} duration={600}>
          <div id="career">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold md:text-3xl">{t("landing.devWork")}</h2>
              <Link href="/work" className="text-sm font-semibold underline">
                {t("common.more")}
              </Link>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("landing.latestPosts")}</p>
            {posts.length === 0 ? (
              <EmptyPlaceholder className="mt-5">{t("landing.emptyPosts")}</EmptyPlaceholder>
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
        </ScrollReveal>
      </div>
    </section>
  )
}
