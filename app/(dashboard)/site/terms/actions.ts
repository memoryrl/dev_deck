"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/auth/owner"
import { isBlankContent, sanitizeRichHtml } from "@/lib/content"
import { TERMS_CONSENT_PATH } from "@/lib/terms/consent"
import { isTermsSlug, saveTermsDocument } from "@/lib/terms/documents"

const TITLE_MAX = 120
const NOTE_MAX = 300
const CONTENT_HTML_MAX = 200_000

export type SaveTermsResult = { ok: true; version: number } | { ok: false; error: string }

export async function saveTerms(formData: FormData): Promise<SaveTermsResult> {
  await requireOwner()

  const slug = String(formData.get("slug") ?? "")
  if (!isTermsSlug(slug)) return { ok: false, error: "약관 종류가 올바르지 않습니다." }

  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { ok: false, error: "한국어 제목을 입력하세요." }
  if (title.length > TITLE_MAX) return { ok: false, error: `제목은 ${TITLE_MAX}자까지입니다.` }

  const content = sanitizeRichHtml(String(formData.get("content") ?? "")).trim()
  if (isBlankContent(content)) return { ok: false, error: "한국어 본문을 입력하세요." }
  if (content.length > CONTENT_HTML_MAX) return { ok: false, error: "본문이 너무 깁니다." }

  // 영문은 선택이다. 비워 두면 가입 화면(English)은 한국어 본문으로 대체한다.
  // 다만 제목·본문 중 하나만 채우면 반쪽 번역이 노출되므로 둘 다 있거나 둘 다 비어야 한다.
  const titleEn = String(formData.get("title_en") ?? "").trim()
  let contentEn = sanitizeRichHtml(String(formData.get("content_en") ?? "")).trim()
  if (isBlankContent(contentEn)) contentEn = ""
  if (titleEn.length > TITLE_MAX) return { ok: false, error: `English title은 ${TITLE_MAX}자까지입니다.` }
  if (contentEn.length > CONTENT_HTML_MAX) return { ok: false, error: "English 본문이 너무 깁니다." }
  if ((titleEn && !contentEn) || (!titleEn && contentEn)) {
    return { ok: false, error: "English 제목과 본문은 둘 다 입력하거나 둘 다 비워 두세요." }
  }

  const note = String(formData.get("note") ?? "").trim().slice(0, NOTE_MAX)

  const result = await saveTermsDocument({ slug, title, content, titleEn, contentEn, note })
  if (!result.ok) return result

  revalidatePath("/site/terms")
  revalidatePath("/site/terms/history")
  revalidatePath(TERMS_CONSENT_PATH)
  return { ok: true, version: result.version }
}
