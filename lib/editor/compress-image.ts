import Compressor from "compressorjs"

/** 이미 이 정도로 작으면 압축을 건너뛴다 (재인코딩 비용 대비 이득이 없음). */
const SKIP_COMPRESSION_BELOW_BYTES = 400 * 1024

/**
 * CKEditor 이미지 업로드 직전에 호출한다. 07-uploads.md 5.5 참고.
 * - GIF(움짤일 수 있음)는 정적 이미지로 재인코딩되지 않도록 그대로 둔다.
 * - 이미 작은 파일은 그대로 둔다.
 * - 그 외에는 리사이즈(최대 1920px) + 품질 0.8로 압축하고, 1MB가 넘는 PNG는
 *   스크린샷 특성상 손실이 적으니 JPEG로 자동 전환해 용량을 더 줄인다.
 */
export function prepareImageForUpload(file: File): Promise<File> {
  if (file.type === "image/gif") return Promise.resolve(file)
  if (file.size <= SKIP_COMPRESSION_BELOW_BYTES) return Promise.resolve(file)

  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      convertTypes: ["image/png"],
      convertSize: 1_000_000,
      success(result) {
        resolve(new File([result], file.name, { type: result.type || file.type }))
      },
      error(err) {
        reject(err)
      },
    })
  })
}
