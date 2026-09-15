import type { FileLoader, UploadAdapter, UploadResponse } from "ckeditor5"
import { prepareImageForUpload } from "@/lib/editor/compress-image"

const UPLOAD_ENDPOINT = "/api/uploads/editor-image"

/**
 * CKEditor5 커스텀 UploadAdapter. 07-uploads.md 5.4 참고.
 * 참고 프로젝트(glow_platform)의 MyUploadAdapter.js를 이식하되:
 * - 압축본 하나만 전송한다 (원본을 같은 필드명으로 중복 append하지 않음)
 * - resolve 값을 CKEditor5 공식 계약인 { default: url }로 맞춘다
 */
export class EditorImageUploadAdapter implements UploadAdapter {
  private controller: AbortController | null = null

  constructor(private loader: FileLoader) {}

  async upload(): Promise<UploadResponse> {
    const file = await this.loader.file
    if (!file) throw "업로드할 파일을 찾을 수 없습니다."

    let prepared: File
    try {
      prepared = await prepareImageForUpload(file)
    } catch {
      // 압축 실패 시에도 업로드 자체는 원본으로 계속 시도한다.
      prepared = file
    }

    this.controller = new AbortController()

    const formData = new FormData()
    formData.append("file", prepared, file.name)

    let response: Response
    try {
      response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData,
        signal: this.controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw "업로드가 취소되었습니다."
      throw "이미지를 업로드하지 못했습니다. 네트워크를 확인해주세요."
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw (body?.error as string | undefined) ?? "이미지를 업로드하지 못했습니다."
    }

    const data = (await response.json()) as { default: string }
    return { default: data.default }
  }

  abort() {
    this.controller?.abort()
  }
}
