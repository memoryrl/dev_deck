"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { UppyFileUpload, type UppyUploadedFile } from "@/components/upload/uppy-file-upload"

export type UploadRow = {
  id: string
  url: string
  name: string
  size: number | null
  createdAt: string
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "-"
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function UploadsPanel({ initialUploads }: { initialUploads: UploadRow[] }) {
  const [uploads, setUploads] = useState(initialUploads)

  function handleUploaded(file: UppyUploadedFile) {
    setUploads((prev) => [
      { id: file.objectPath, url: file.url, name: file.name, size: file.size, createdAt: new Date().toISOString() },
      ...prev,
    ])
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">파일 업로드</h2>
        <UppyFileUpload onUploaded={handleUploaded} />
      </Card>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">업로드 기록</h2>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 업로드한 파일이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {uploads.map((upload) => (
              <li key={upload.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <a
                  href={upload.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-primary hover:underline"
                >
                  {upload.name}
                </a>
                <div className="flex shrink-0 gap-3 text-muted-foreground">
                  <span>{formatBytes(upload.size)}</span>
                  <span>{new Date(upload.createdAt).toLocaleString("ko-KR")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
