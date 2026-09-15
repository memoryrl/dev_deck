// 07-uploads.md 3장 참고. 버킷/경로/용량 상수를 한곳에 모아 route handler와
// 프론트 컴포넌트가 같은 값을 쓰게 한다.

export const EDITOR_IMAGE_BUCKET = "editor-images"
export const ATTACHMENTS_BUCKET = "uploads"

/** 서버 하드 캡. 클라이언트 압축을 우회해도 이 이상은 절대 받지 않는다. */
export const EDITOR_IMAGE_MAX_BYTES = 8 * 1024 * 1024

export const EDITOR_IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024
export const ATTACHMENT_MAX_FILES = 5

export const ATTACHMENT_ALLOWED_FILE_TYPES = [
  "image/*",
  "application/pdf",
  "application/zip",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".hwp",
  ".hwpx",
  ".txt",
]
