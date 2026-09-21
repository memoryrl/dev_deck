import { NextResponse, type NextRequest } from "next/server"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { ATTACHMENTS_BUCKET } from "@/lib/uploads/constants"

export const runtime = "nodejs"

type FinalizeBody = {
  objectPath?: string
  originalName?: string
  mimeType?: string | null
  sizeBytes?: number | null
}

// 07-uploads.md 4.3 참고. Uppy가 TUS로 Supabase Storage에 직접 올린 뒤,
// 업로드 완료 메타만 devdeck.uploads에 기록한다 — 바이트 전송에는 관여하지 않는다.
export async function POST(request: NextRequest) {
  const user = await ensureProfile()
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  let body: FinalizeBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }

  const { objectPath, originalName } = body
  if (!objectPath || !originalName) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 })
  }

  // 본인 폴더(uid/...) 밖의 경로는 기록하지 않는다 — Storage RLS와 동일한 경계.
  if (!objectPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "허용되지 않은 경로입니다." }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("uploads")
    .insert({
      user_id: user.id,
      bucket: ATTACHMENTS_BUCKET,
      object_path: objectPath,
      original_name: originalName,
      mime_type: body.mimeType ?? null,
      size_bytes: body.sizeBytes ?? null,
    })
    .select("id, object_path")
    .single()

  if (error) {
    console.error("[uploads/attachments/finalize] insert failed", error)
    return NextResponse.json({ error: "업로드 기록에 실패했습니다." }, { status: 500 })
  }

  const { data: publicUrl } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(objectPath)

  return NextResponse.json({ id: data.id, url: publicUrl.publicUrl })
}
