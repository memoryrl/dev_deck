import { Clock, Share2 } from "lucide-react"
import { RichContent } from "@/components/editor/rich-content"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PromptBodyToggle } from "@/components/prompts/prompt-body-toggle"
import { ResultPreview } from "@/components/prompts/result-preview"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { resolveResultEmbed } from "@/lib/embeds/result-preview"
import { formatBoardDateTime, formatPeriod } from "@/lib/i18n/format"
import { getT } from "@/lib/i18n/dictionary"
import type { SharedTarget } from "@/lib/share/targets"

/** 공유 링크로 열린 자료를 읽기 전용으로 보여 준다. 편집·댓글·이전/다음 글 같은 사이트 기능은 붙이지 않는다. */
export async function SharedContent({
  target,
  expiresAt,
  inviteName,
}: {
  target: SharedTarget
  expiresAt: string | null
  inviteName: string | null
}) {
  const { t, locale } = getT()

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
          <Share2 className="size-3.5" aria-hidden />
          {inviteName ? t("share.view.banner.invited", { name: inviteName }) : t("share.view.banner.shared")}
        </span>
        {expiresAt ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {t("share.view.banner.expires", { date: formatBoardDateTime(expiresAt, locale) })}
          </span>
        ) : null}
      </div>

      <PageTitleBanner
        title={target.title}
        breadcrumb={[{ label: t("share.view.crumb") }]}
        description={formatBoardDateTime(target.createdAt, locale)}
      />

      <div className="mt-8">
        <Body target={target} />
      </div>
    </>
  )
}

async function Body({ target }: { target: SharedTarget }) {
  const { t } = getT()

  switch (target.kind) {
    case "board_post":
      return <RichContent content={target.content} />

    case "prompt": {
      const embed = target.resultHtml.trim() ? await resolveResultEmbed(target.resultHtml) : null
      return (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge>{target.category}</Badge>
            {target.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          {target.resultHtml.trim() ? (
            <section className="mt-8">
              <p className="text-sm font-semibold text-muted-foreground">{t("share.view.promptResult")}</p>
              <ResultPreview html={target.resultHtml} embed={embed} />
            </section>
          ) : null}
          <PromptBodyToggle content={target.content} />
        </>
      )
    }

    case "career": {
      const meta = [target.company, target.role, formatPeriod(target.periodStart, target.periodEnd, t("date.present"))]
        .filter(Boolean)
        .join(" · ")
      return (
        <>
          {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{target.postType}</Badge>
            {[...target.skills, ...target.tags].map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
          <div className="mt-8">
            <RichContent content={target.content} />
          </div>
        </>
      )
    }

    case "game":
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Steam CDN 헤더 이미지, 공유 화면 전용 */}
          <img
            src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${target.appId}/header.jpg`}
            alt=""
            className="w-full max-w-xl rounded-2xl border"
          />
          <div className="mt-5">
            <StarRating readOnly defaultValue={target.rating} />
          </div>
          {target.reviewText.trim() ? (
            <div className="mt-6">
              <RichContent content={target.reviewText} />
            </div>
          ) : null}
        </>
      )
  }
}
