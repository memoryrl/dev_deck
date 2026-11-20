import Link from "next/link"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { getT } from "@/lib/i18n/dictionary"
import { formatBoardDate } from "@/lib/i18n/format"
import { PUBLIC_MENU_LABEL_KEYS } from "@/lib/menus/label"
import type { CommunityLatestPost } from "@/lib/boards/community"

function boardTag(post: CommunityLatestPost, t: (key: string) => string) {
  if (post.boardSlug === "notice") return t("mega.community.notice")
  if (post.boardSlug === "free") return t("mega.community.free")
  const key = PUBLIC_MENU_LABEL_KEYS[post.boardName]
  return key ? t(key) : post.boardName
}

export async function CommunityLatest({ posts }: { posts: CommunityLatestPost[] }) {
  const { t } = await getT()
  return (
    <section className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-4 pt-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">{t("landing.communityLatest")}</h2>
                  </div>
        <Link href="/b/notice" className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
          {t("common.more")}
        </Link>
      </div>
      {posts.length === 0 ? (
        <EmptyPlaceholder className="mt-5">{t("landing.emptyCommunity")}</EmptyPlaceholder>
      ) : (
        <ul className="mt-5 divide-y border-y border-foreground/10">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={post.href}
                className="group flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <span className="inline-flex w-[5.75rem] shrink-0 items-center justify-center truncate rounded-md bg-foreground/[0.06] px-2 py-1 text-xs font-medium text-muted-foreground">
                  {boardTag(post, t)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium decoration-[hsl(var(--lux-cognac)/0.45)] underline-offset-4 group-hover:underline">
                  {post.title}
                </span>
                <time
                  className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                  dateTime={post.createdAt}
                >
                  {formatBoardDate(post.createdAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
