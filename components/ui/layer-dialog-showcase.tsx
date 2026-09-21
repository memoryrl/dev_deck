"use client"

import { Button } from "@/components/ui/button"
import { showAlert, showConfirm } from "@/lib/ui/layer-dialog"

export function LayerDialogShowcase() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" className="rounded-full" onClick={() => showAlert("안내 메시지입니다.")}>
        Alert
      </Button>
      <Button
        type="button"
        className="rounded-full"
        onClick={() => showConfirm("이 작업을 계속할까요?", { title: "확인" })}
      >
        Confirm
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="rounded-full"
        onClick={() => showConfirm("이 항목을 삭제할까요?", { destructive: true })}
      >
        Destructive
      </Button>
    </div>
  )
}
