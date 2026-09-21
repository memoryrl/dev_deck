import type { Metadata } from "next"
import { NoticePopupWindowChrome } from "@/components/layout/notice-popup-window-actions"
import { RichContent } from "@/components/editor/rich-content"
import { getNoticePopupPost } from "@/lib/boards/community"
import { getT } from "@/lib/i18n/dictionary"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  const post = await getNoticePopupPost()
  return {
    title: post?.title ?? t("mega.community.notice"),
    robots: { index: false, follow: false },
  }
}

export default async function NoticePopupPage() {
  const { t } = await getT()
  const post = await getNoticePopupPost()

  if (!post) {
    return (
      <main className="flex min-h-0 flex-1 flex-col p-5">
        <EmptyPlaceholder className="flex-1">{t("landing.emptyCommunity")}</EmptyPlaceholder>
      </main>
    )
  }

  return (
    <NoticePopupWindowChrome postId={post.id} href={post.href} label={t("mega.community.notice")}>
      <h1 className="mt-1.5 font-display text-lg font-bold leading-snug">{post.title}</h1>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto text-sm">
        {post.content ? (
          <RichContent content={post.content} />
        ) : post.excerpt ? (
          <p className="leading-relaxed text-muted-foreground">{post.excerpt}</p>
        ) : null}
      </div>
    </NoticePopupWindowChrome>
  )
}
