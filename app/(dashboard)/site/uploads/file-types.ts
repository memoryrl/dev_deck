import { File, FileArchive, FileCode, FileText, Image as ImageIcon, type LucideIcon } from "lucide-react"

// 파일 관리 화면 공용: 업로드 행 모양과 형식 판별.
export type ManagedFile = {
  id: string
  name: string
  size: number | null
  mime: string | null
  createdAt: string
  url: string
  objectPath: string
}

export type FileKind = "image" | "markdown" | "text" | "pdf" | "archive" | "other"

const TEXT_EXT = new Set(["txt", "log", "csv", "json", "xml", "yml", "yaml", "ini", "js", "ts", "tsx", "jsx", "css", "html", "sql", "sh"])
const ARCHIVE_EXT = new Set(["zip", "tar", "gz", "7z", "rar"])

export const extOf = (name: string) => (name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "")

export function kindOf(file: Pick<ManagedFile, "name" | "mime">): FileKind {
  const ext = extOf(file.name)
  const mime = file.mime ?? ""
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return "image"
  if (ext === "md" || ext === "markdown" || mime === "text/markdown") return "markdown"
  if (mime === "application/pdf" || ext === "pdf") return "pdf"
  if (mime.startsWith("text/") || TEXT_EXT.has(ext) || mime === "application/json") return "text"
  if (ARCHIVE_EXT.has(ext) || mime.includes("zip")) return "archive"
  return "other"
}

export const KIND_META: Record<FileKind, { label: string; icon: LucideIcon }> = {
  image: { label: "이미지", icon: ImageIcon },
  markdown: { label: "마크다운", icon: FileText },
  text: { label: "텍스트", icon: FileCode },
  pdf: { label: "PDF 문서", icon: FileText },
  archive: { label: "압축 파일", icon: FileArchive },
  other: { label: "기타", icon: File },
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "-"
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/** 앱 안에서 바로 보여 줄 수 있는 형식(이미지·텍스트·마크다운). PDF·기타는 새 탭/다운로드로 연다. */
export const isPreviewable = (kind: FileKind) => kind === "image" || kind === "markdown" || kind === "text"
