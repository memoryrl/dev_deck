import { RichContent } from "@/components/editor/rich-content"
import type { ResultEmbed } from "@/lib/embeds/result-preview"

export function ResultPreview({ html, embed }: { html: string; embed: ResultEmbed | null }) {
  if (embed) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
        <iframe
          src={embed.src}
          title="예상 결과물 미리보기"
          className="h-[32rem] w-full bg-[#e8e8e8] md:h-[40rem]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; pointer-lock; xr-spatial-tracking"
          // 21st.dev/spline.design은 사용자가 골라 넣는 외부 임베드다 — 호스트는
          // 화이트리스트지만 그 콘텐츠 자체는 우리가 통제할 수 없는 제3자
          // 사용자생성물이라 부모 페이지 상단 탐색 탈취·다운로드는 막아둔다.
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-pointer-lock"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          <a href={embed.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            원본 열기
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border bg-card p-4 md:p-6">
      <RichContent content={html} />
    </div>
  )
}
