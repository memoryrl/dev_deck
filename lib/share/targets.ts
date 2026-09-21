import { createServiceClient } from "@/lib/supabase/service"
import type { ShareTargetType } from "@/types/share"

// 공유 대상(게시물·프롬프트·커리어 글·게임 리뷰)을 서비스 롤로 읽는다.
// 비공개 글도 만든 사람은 공유할 수 있어야 하고, 공유 링크로 들어온 방문자에게는
// (검증을 통과한 뒤) 그 글을 보여 줘야 하므로 RLS를 우회한다 — 호출하는 쪽이 권한을 먼저 확인해야 한다.

export type SharedTarget =
  | {
      kind: "board_post"
      id: string
      title: string
      content: string
      boardName: string
      boardSlug: string
      authorId: string
      createdAt: string
    }
  | {
      kind: "prompt"
      id: string
      title: string
      content: string
      resultHtml: string
      category: string
      tags: string[]
      authorId: string
      createdAt: string
    }
  | {
      kind: "career"
      id: string
      title: string
      content: string
      postType: string
      company: string | null
      role: string | null
      periodStart: string | null
      periodEnd: string | null
      skills: string[]
      tags: string[]
      authorId: string
      createdAt: string
    }
  | {
      kind: "game"
      id: string
      appId: number
      title: string
      reviewText: string
      rating: number
      authorId: string
      createdAt: string
    }

export function targetSubPath(target: SharedTarget) {
  switch (target.kind) {
    case "board_post":
      return `${target.boardName} > ${target.title}`
    case "prompt":
      return `AI Prompt > ${target.title}`
    case "career":
      return `커리어로그 > ${target.title}`
    case "game":
      return `게임리뷰 > ${target.title}`
  }
}

export async function loadTarget(type: ShareTargetType, id: string): Promise<SharedTarget | null> {
  const db = createServiceClient()

  if (type === "board_post") {
    const { data } = await db
      .from("board_posts")
      .select("id, title, content, user_id, created_at, boards(name, slug)")
      .eq("id", id)
      .maybeSingle()
    if (!data) return null
    const board = (Array.isArray(data.boards) ? data.boards[0] : data.boards) as { name: string; slug: string } | null
    return {
      kind: "board_post",
      id: data.id,
      title: data.title,
      content: data.content,
      boardName: board?.name ?? "게시판",
      boardSlug: board?.slug ?? "",
      authorId: data.user_id,
      createdAt: data.created_at,
    }
  }

  if (type === "prompt") {
    const { data } = await db
      .from("prompts")
      .select("id, title, content, result_html, category, tags, user_id, created_at")
      .eq("id", id)
      .maybeSingle()
    if (!data) return null
    return {
      kind: "prompt",
      id: data.id,
      title: data.title,
      content: data.content,
      resultHtml: data.result_html ?? "",
      category: data.category ?? "General",
      tags: data.tags ?? [],
      authorId: data.user_id,
      createdAt: data.created_at,
    }
  }

  if (type === "career") {
    const { data } = await db
      .from("career_posts")
      .select("id, title, content, post_type, company, role, period_start, period_end, skills, tags, user_id, created_at")
      .eq("id", id)
      .maybeSingle()
    if (!data) return null
    return {
      kind: "career",
      id: data.id,
      title: data.title,
      content: data.content,
      postType: data.post_type,
      company: data.company,
      role: data.role,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      skills: data.skills ?? [],
      tags: data.tags ?? [],
      authorId: data.user_id,
      createdAt: data.created_at,
    }
  }

  const appId = Number(id)
  if (!Number.isInteger(appId)) return null
  const { data } = await db
    .from("game_reviews")
    .select("app_id, game_title, review_text, rating, user_id, created_at")
    .eq("app_id", appId)
    .maybeSingle()
  if (!data) return null
  return {
    kind: "game",
    id: String(data.app_id),
    appId: data.app_id,
    title: data.game_title,
    reviewText: data.review_text ?? "",
    rating: Number(data.rating ?? 0),
    authorId: data.user_id,
    createdAt: data.created_at,
  }
}
