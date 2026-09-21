"use server"

import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { isOwnerUser } from "@/lib/auth/roles"
import { clientIpFromHeaders } from "@/lib/comments/ip"
import {
  isPasswordCookieValid,
  SHARE_PASSWORD_COOKIE_MS,
  SHARE_VISIT_COOKIE_MS,
  sharePasswordCookieName,
  shareVisitCookieName,
  signPasswordCookie,
  verifySharePassword,
} from "@/lib/share/password"
import {
  getShareState,
  listAccessLog,
  recordVisit,
  removeInvite,
  removeLinkAsAdmin,
  removeShareFor,
  resolveShareKey,
  saveInviteLink,
  savePublicLink,
  ShareInputError,
  type InviteInput,
  type PublicLinkInput,
} from "@/lib/share/service"
import { loadTarget, type SharedTarget } from "@/lib/share/targets"
import { ensureProfile } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/uploads/rate-limit"
import { isSupabaseConfigured } from "@/lib/utils"
import type { ShareAccessEntry, ShareActionResult, ShareTargetType } from "@/types/share"
import { SHARE_TARGET_TYPES } from "@/types/share"

const production = process.env.NODE_ENV === "production"

type Actor = { userId: string; isOwner: boolean; target: SharedTarget }

// 공유 링크는 "그 글을 만든 사람 또는 관리자"만 만들 수 있다.
async function actorFor(type: ShareTargetType, targetId: string): Promise<Actor | { error: string }> {
  if (!isSupabaseConfigured()) return { error: "notConfigured" }
  if (!SHARE_TARGET_TYPES.includes(type) || !targetId) return { error: "invalidTarget" }
  const user = await ensureProfile()
  if (!user) return { error: "loginRequired" }
  const target = await loadTarget(type, targetId)
  if (!target) return { error: "targetMissing" }
  const isOwner = isOwnerUser(user)
  if (!isOwner && target.authorId !== user.id) return { error: "forbidden" }
  return { userId: user.id, isOwner, target }
}

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ShareInputError) return { ok: false, error: error.message }
  return { ok: false, error: "failed" }
}

async function withActor(
  type: ShareTargetType,
  targetId: string,
  run: (actor: Actor) => Promise<ShareActionResult>
): Promise<ShareActionResult> {
  const actor = await actorFor(type, targetId)
  if ("error" in actor) return { ok: false, error: actor.error }
  try {
    return await run(actor)
  } catch (error) {
    return failure(error)
  }
}

export async function loadShareState(type: ShareTargetType, targetId: string): Promise<ShareActionResult> {
  return withActor(type, targetId, async ({ userId, target }) => ({
    ok: true,
    state: await getShareState(userId, type, target),
  }))
}

export async function savePublicShare(
  type: ShareTargetType,
  targetId: string,
  input: PublicLinkInput
): Promise<ShareActionResult> {
  return withActor(type, targetId, async ({ userId, target }) => {
    const key = await savePublicLink(userId, type, target, input)
    revalidatePath("/site/shares")
    return { ok: true, state: await getShareState(userId, type, target), created: { key } }
  })
}

export async function saveInviteShare(
  type: ShareTargetType,
  targetId: string,
  input: { periodLimited: boolean; expiresAt: string | null; invite: InviteInput | null }
): Promise<ShareActionResult> {
  return withActor(type, targetId, async ({ userId, target }) => {
    const key = await saveInviteLink(userId, type, target, input)
    revalidatePath("/site/shares")
    return { ok: true, state: await getShareState(userId, type, target), created: key ? { key } : undefined }
  })
}

/** "공유 안 함" — 이 글에 대해 내가 만든 공유 링크·초대를 모두 삭제한다. */
export async function stopSharing(type: ShareTargetType, targetId: string): Promise<ShareActionResult> {
  return withActor(type, targetId, async ({ userId, target }) => {
    await removeShareFor(userId, type, target.id)
    revalidatePath("/site/shares")
    return { ok: true, state: await getShareState(userId, type, target) }
  })
}

export async function removeShareInvite(
  type: ShareTargetType,
  targetId: string,
  inviteId: string
): Promise<ShareActionResult> {
  return withActor(type, targetId, async ({ userId, isOwner, target }) => {
    const removed = await removeInvite(userId, isOwner, inviteId)
    if (!removed) return { ok: false, error: "forbidden" }
    revalidatePath("/site/shares")
    return { ok: true, state: await getShareState(userId, type, target) }
  })
}

// ---------------------------------------------------------------------------
// 공유 링크로 들어온 방문자
// ---------------------------------------------------------------------------

export async function verifySharePasswordAction(
  key: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: "invalid" | "tooMany" | "unavailable" }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unavailable" }
  // 무차별 대입을 막는다 — 같은 IP가 같은 링크에 10분에 8번까지.
  if (!checkRateLimit(`share-pw:${clientIpFromHeaders()}:${key}`, 8, 10 * 60 * 1000)) {
    return { ok: false, error: "tooMany" }
  }

  const resolved = await resolveShareKey(key, { alreadyVisited: cookies().has(shareVisitCookieName(key)) })
  if (resolved.status !== "ok" || !resolved.link.password_hash) return { ok: false, error: "unavailable" }
  if (!verifySharePassword(password, resolved.link.password_hash)) return { ok: false, error: "invalid" }

  const expiresAt = Date.now() + SHARE_PASSWORD_COOKIE_MS
  cookies().set(sharePasswordCookieName(key), signPasswordCookie(key, resolved.link.password_hash, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: "/",
    maxAge: SHARE_PASSWORD_COOKIE_MS / 1000,
  })
  return { ok: true }
}

/**
 * 공유 화면이 실제로 열렸을 때 한 번 부른다. 접속 이력과 방문 수를 남기고, 같은 사람의
 * 새로고침이 방문으로 다시 세어지지 않도록 30분짜리 쿠키를 심는다.
 */
export async function recordShareVisit(key: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const jar = cookies()
  const seenName = shareVisitCookieName(key)
  if (jar.has(seenName)) return

  const resolved = await resolveShareKey(key, { alreadyVisited: false })
  if (resolved.status !== "ok") return
  const { link, invite } = resolved
  if (link.password_hash && !isPasswordCookieValid(key, link.password_hash, jar.get(sharePasswordCookieName(key))?.value)) {
    return
  }

  const counted = await recordVisit(link, invite, clientIpFromHeaders(), headers().get("user-agent"))
  if (!counted) return
  jar.set(seenName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: "/",
    maxAge: SHARE_VISIT_COOKIE_MS / 1000,
  })
}

// ---------------------------------------------------------------------------
// 관리자
// ---------------------------------------------------------------------------

async function requireOwnerUser() {
  const user = await ensureProfile()
  return user && isOwnerUser(user) ? user : null
}

export async function adminRemoveShareLink(linkId: string): Promise<{ ok: boolean }> {
  if (!(await requireOwnerUser())) return { ok: false }
  try {
    const removed = await removeLinkAsAdmin(linkId)
    revalidatePath("/site/shares")
    return { ok: removed }
  } catch {
    return { ok: false }
  }
}

export async function adminLoadAccessLog(linkId: string): Promise<{ ok: true; entries: ShareAccessEntry[] } | { ok: false }> {
  if (!(await requireOwnerUser())) return { ok: false }
  try {
    return { ok: true, entries: await listAccessLog(linkId) }
  } catch {
    return { ok: false }
  }
}

