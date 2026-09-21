"use client"

import { useCallback, useState } from "react"
import { Share2 } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ShareTargetType } from "@/types/share"
import { ShareDialog } from "./share-dialog"

/**
 * 게시물·프롬프트·커리어 글·게임 리뷰의 "공유하기" 버튼.
 * 공개 화면과 관리자 화면 어디에서나 같은 컴포넌트를 쓴다 — 누를 수 있는 사람(작성자·관리자)
 * 판단은 호출하는 쪽에서 하고, 서버 액션이 한 번 더 확인한다.
 */
export function ShareButton({
  targetType,
  targetId,
  className,
}: {
  targetType: ShareTargetType
  targetId: string
  className?: string
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("rounded-full", className)}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Share2 />
        {t("share.button")}
      </Button>
      {open ? <ShareDialog targetType={targetType} targetId={targetId} onClose={close} /> : null}
    </>
  )
}
