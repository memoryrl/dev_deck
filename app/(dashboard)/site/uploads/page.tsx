import { Suspense } from "react"
import { UploadsPanel, type UploadRow } from "@/app/(dashboard)/site/uploads/uploads-panel"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { ATTACHMENTS_BUCKET } from "@/lib/uploads/constants"
import { createClient, ensureProfile } from "@/lib/supabase/server"

export default function SiteUploadsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageTitleBanner title="업로드" />
      <p className="text-sm text-muted-foreground">
        Uppy 범용 첨부 업로드를 확인하는 데모 페이지입니다. 에디터 이미지 업로드는 PromptKit·CareerLog 등
        본문 편집 화면에서 바로 확인할 수 있습니다.
      </p>
      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <UploadsPanelBody />
      </Suspense>
    </div>
  )
}

async function UploadsPanelBody() {
  const user = await ensureProfile()
  const supabase = createClient()
  const initialUploads: UploadRow[] = []
  if (user) {
    const { data } = await supabase
      .from("uploads")
      .select("id, object_path, original_name, size_bytes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    for (const row of data ?? []) {
      const { data: publicUrl } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(row.object_path)
      initialUploads.push({
        id: row.id,
        url: publicUrl.publicUrl,
        name: row.original_name,
        size: row.size_bytes,
        createdAt: row.created_at,
      })
    }
  }

  return <UploadsPanel initialUploads={initialUploads} />
}
