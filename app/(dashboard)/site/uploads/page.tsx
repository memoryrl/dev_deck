import { Suspense } from "react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { requireOwner } from "@/lib/auth/owner"
import { createClient } from "@/lib/supabase/server"
import { ATTACHMENTS_BUCKET } from "@/lib/uploads/constants"
import { isSupabaseConfigured } from "@/lib/utils"
import { FileWorkspace } from "./file-workspace"
import type { ManagedFile } from "./file-types"
import { UploadToggle } from "./upload-toggle"

// 트리에 한 번에 싣는 상한 — 이 이상이면 폴더(연·월)별 지연 로딩으로 바꿔야 한다.
const FILE_LIMIT = 1000

export default async function SiteFilesPage({ searchParams }: { searchParams?: Promise<{ fileId?: string }> }) {
  const fileId = (await searchParams)?.fileId ?? null
  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="파일 관리"
        description="업로드한 파일을 연·월 폴더 트리로 탐색하고, 이미지·텍스트·마크다운은 바로 미리 봅니다. 파일 정보 확인과 원본 다운로드, 업로드도 여기서 합니다."
      />
      <UploadToggle />
      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <Files fileId={fileId} />
      </Suspense>
    </div>
  )
}

async function Files({ fileId }: { fileId: string | null }) {
  const user = await requireOwner()
  const files: ManagedFile[] = []
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("uploads")
      .select("id, object_path, original_name, size_bytes, mime_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(FILE_LIMIT)
    for (const row of data ?? []) {
      files.push({
        id: row.id,
        name: row.original_name,
        size: row.size_bytes,
        mime: row.mime_type,
        createdAt: row.created_at,
        objectPath: row.object_path,
        url: supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(row.object_path).data.publicUrl,
      })
    }
  }
  return <FileWorkspace files={files} initialId={fileId} />
}
