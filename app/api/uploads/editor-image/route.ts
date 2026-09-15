import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { clientIpFromHeaders } from "@/lib/comments/ip"
import { createServiceClient } from "@/lib/supabase/service"
import { EDITOR_IMAGE_BUCKET, EDITOR_IMAGE_MAX_BYTES } from "@/lib/uploads/constants"
import { checkRateLimit } from "@/lib/uploads/rate-limit"
import { extensionForMime, sniffImageMime } from "@/lib/uploads/validate"

export const runtime = "nodejs"

// 07-uploads.md 4.2 참고. 비회원도 댓글/공개 게시판에 글을 쓸 수 있으므로 세션
// 인증으로는 막지 않는다 — 대신 매직바이트 검증 + 용량 캡 + IP 레이트리밋으로 방어한다.
export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders()
  if (!checkRateLimit(`editor-image:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "이미지 업로드가 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 })
  }

  if (file.size > EDITOR_IMAGE_MAX_BYTES) {
    const maxMb = Math.floor(EDITOR_IMAGE_MAX_BYTES / (1024 * 1024))
    return NextResponse.json({ error: `이미지는 ${maxMb}MB 이하만 업로드할 수 있습니다.` }, { status: 413 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = sniffImageMime(bytes)
  if (!mime) {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다. (jpg·png·webp·gif만 가능)" }, { status: 415 })
  }

  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
  const path = `editor/${yyyy}/${mm}/${randomUUID()}.${extensionForMime(mime)}`

  const supabase = createServiceClient()
  const { error } = await supabase.storage.from(EDITOR_IMAGE_BUCKET).upload(path, bytes, {
    contentType: mime,
    cacheControl: "31536000",
    upsert: false,
  })

  if (error) {
    console.error("[uploads/editor-image] storage upload failed", error)
    return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 })
  }

  const { data } = supabase.storage.from(EDITOR_IMAGE_BUCKET).getPublicUrl(path)

  // CKEditor5 UploadAdapter.upload()가 기대하는 공식 응답 형태: { default: url }
  return NextResponse.json({ default: data.publicUrl })
}
