"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronUp, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UppyFileUpload } from "@/components/upload/uppy-file-upload"

// 파일 관리 화면 상단의 "파일 업로드" 접이식 패널 — 업로드가 끝나면 서버 데이터를 다시 받아 트리에 바로 나타나게 한다.
export function UploadToggle() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <ChevronUp /> : <Upload />}
          {open ? "업로드 닫기" : "파일 업로드"}
        </Button>
      </div>
      {open ? (
        <Card>
          <UppyFileUpload onUploaded={() => router.refresh()} />
        </Card>
      ) : null}
    </div>
  )
}
