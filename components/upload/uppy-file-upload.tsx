"use client"

import { useEffect, useRef } from "react"
import { Uppy } from "@uppy/core"
import Dashboard from "@uppy/dashboard"
import Tus from "@uppy/tus"
import ko_KR from "@uppy/locales/lib/ko_KR"
import { createClient } from "@/lib/supabase/client"
import {
  ATTACHMENTS_BUCKET,
  ATTACHMENT_ALLOWED_FILE_TYPES,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_FILES,
} from "@/lib/uploads/constants"
import "@uppy/core/css/style.css"
import "@uppy/dashboard/css/style.css"

export type UppyUploadedFile = { url: string; objectPath: string; name: string; size: number }

type UppyFileUploadProps = {
  onUploaded?: (file: UppyUploadedFile) => void
  allowedFileTypes?: string[]
  maxFileSize?: number
  maxNumberOfFiles?: number
}

// 07-uploads.md 5.2 참고. 설치된 @uppy/react 6.x는 <Dashboard uppy={uppy} /> 같은
// 완성형 컴포넌트를 더 이상 내보내지 않는다(headless 훅 위주로 개편됨) — 대신
// @uppy/dashboard의 Dashboard 플러그인을 컨테이너 DOM에 직접 mount하는 방식으로 이식했다.
export function UppyFileUpload({
  onUploaded,
  allowedFileTypes = ATTACHMENT_ALLOWED_FILE_TYPES,
  maxFileSize = ATTACHMENT_MAX_BYTES,
  maxNumberOfFiles = ATTACHMENT_MAX_FILES,
}: UppyFileUploadProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onUploadedRef = useRef(onUploaded)
  onUploadedRef.current = onUploaded

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let uppy: Uppy | null = null

    async function setup() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled || !session) return

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const uid = session.user.id

      uppy = new Uppy({
        locale: ko_KR,
        restrictions: { allowedFileTypes, maxFileSize, maxNumberOfFiles },
      })
        .use(Dashboard, {
          inline: true,
          target: container!,
          height: 320,
          proudlyDisplayPoweredByUppy: false,
        })
        .use(Tus, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          chunkSize: 6 * 1024 * 1024,
          allowedMetaFields: ["bucketName", "objectName", "contentType", "cacheControl"],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            apikey: anonKey,
          },
        })

      uppy.on("file-added", (file) => {
        const objectName = `${uid}/${crypto.randomUUID()}-${file.name}`
        uppy?.setFileMeta(file.id, {
          bucketName: ATTACHMENTS_BUCKET,
          objectName,
          contentType: file.type,
        })
      })

      uppy.on("upload-success", async (file) => {
        if (!file) return
        const objectPath = file.meta.objectName as string
        try {
          const response = await fetch("/api/uploads/attachments/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              objectPath,
              originalName: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
            }),
          })
          if (!response.ok) return
          const data = (await response.json()) as { id: string; url: string }
          onUploadedRef.current?.({ url: data.url, objectPath, name: file.name ?? "", size: file.size ?? 0 })
        } catch (error) {
          console.error("[uppy-file-upload] finalize failed", error)
        }
      })
    }

    void setup()

    return () => {
      cancelled = true
      uppy?.destroy()
    }
  }, [allowedFileTypes, maxFileSize, maxNumberOfFiles])

  return <div ref={containerRef} />
}
