import type { Board, BoardKind, SystemBoardKind } from "@/types/board"

export const SYSTEM_BOARD_KINDS: SystemBoardKind[] = ["prompts", "career", "steam"]

export const RESERVED_BOARD_SLUGS: Record<SystemBoardKind, string> = {
  prompts: "prompts",
  career: "career",
  steam: "steam",
}

export const SYSTEM_BOARD_SEEDS: {
  slug: string
  name: string
  description: string
  kind: SystemBoardKind
  sort_order: number
}[] = [
  { slug: "prompts", name: "AI Prompt", description: "PromptKit 공개 프롬프트", kind: "prompts", sort_order: 10 },
  { slug: "career", name: "개발업무", description: "CareerLog 공개 글", kind: "career", sort_order: 20 },
  { slug: "steam", name: "Steam 리뷰", description: "Steam Tracker 공개 리뷰", kind: "steam", sort_order: 30 },
]

export function isSystemBoardKind(kind: string | null | undefined): kind is SystemBoardKind {
  return SYSTEM_BOARD_KINDS.includes(kind as SystemBoardKind)
}

export function isSystemBoard<T extends Pick<Board, "kind">>(
  board: T
): board is T & { kind: SystemBoardKind } {
  return isSystemBoardKind(board.kind)
}

/** 공개 목록(/b/slug)에서 인라인 글쓰기를 여는 게시판. Steam은 게임 단위 작성이라 제외. */
export function canComposeOnPublicList(board: Pick<Board, "kind">) {
  return !isSystemBoard(board) || board.kind === "prompts" || board.kind === "career"
}

export function kindLabel(kind: BoardKind) {
  if (kind === "prompts") return "PromptKit"
  if (kind === "career") return "CareerLog"
  if (kind === "steam") return "Steam"
  return "범용"
}

export function systemDashboardHref(kind: SystemBoardKind) {
  if (kind === "prompts") return "/promptkit"
  if (kind === "career") return "/career"
  return "/steam"
}

export function systemEntryHref(kind: SystemBoardKind, id: string, appId?: number) {
  if (kind === "prompts") return `/promptkit/${id}`
  if (kind === "career") return `/career/${id}`
  return `/steam/${appId ?? id}`
}

export function systemPublicHref(kind: SystemBoardKind, id: string, appId?: number) {
  if (kind === "prompts") return `/p/${id}`
  if (kind === "career") return `/work/${id}`
  return `/games/${appId ?? id}`
}
