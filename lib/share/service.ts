import { generateShareKey, isInviteKey, isValidShareKey } from "@/lib/share/keys"
import { hashSharePassword } from "@/lib/share/password"
import { targetSubPath, type SharedTarget } from "@/lib/share/targets"
import { createServiceClient } from "@/lib/supabase/service"
import type {
  AdminShareRow,
  InviteMethod,
  ShareAccessEntry,
  ShareInviteView,
  ShareState,
  ShareTargetType,
} from "@/types/share"
import { INVITE_METHODS } from "@/types/share"

export type LinkRow = {
  id: string
  key: string
  link_type: "public" | "invite"
  target_type: ShareTargetType
  target_id: string
  title: string
  sub_path: string | null
  created_by: string
  period_limited: boolean
  expires_at: string | null
  password_hash: string | null
  visit_limited: boolean
  max_visits: number | null
  visit_count: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type InviteRow = {
  id: string
  link_id: string
  key: string
  recipient_name: string
  method: InviteMethod
  recipient_email: string | null
  recipient_phone: string | null
  title: string | null
  message: string | null
  read_at: string | null
  access_count: number
  last_access_at: string | null
  deleted_at: string | null
  created_at: string
}

export class ShareInputError extends Error {}

const MAX_VISITS_LIMIT = 100_000

// ---------------------------------------------------------------------------
// 공유하기 화면 상태
// ---------------------------------------------------------------------------

function toInviteView(row: InviteRow): ShareInviteView {
  return {
    id: row.id,
    key: row.key,
    name: row.recipient_name,
    method: row.method,
    email: row.recipient_email,
    phone: row.recipient_phone,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    accessCount: row.access_count,
    lastAccessAt: row.last_access_at,
    createdAt: row.created_at,
  }
}

async function activeLinks(userId: string, type: ShareTargetType, targetId: string) {
  const db = createServiceClient()
  const { data, error } = await db
    .from("share_links")
    .select("*")
    .eq("created_by", userId)
    .eq("target_type", type)
    .eq("target_id", targetId)
    .is("deleted_at", null)
  if (error) throw new Error(error.message)
  return (data ?? []) as LinkRow[]
}

export async function getShareState(userId: string, type: ShareTargetType, target: SharedTarget): Promise<ShareState> {
  const links = await activeLinks(userId, type, target.id)
  const pub = links.find((link) => link.link_type === "public") ?? null
  const inv = links.find((link) => link.link_type === "invite") ?? null

  let invites: ShareInviteView[] = []
  if (inv) {
    const db = createServiceClient()
    const { data, error } = await db
      .from("share_invites")
      .select("*")
      .eq("link_id", inv.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    invites = ((data ?? []) as InviteRow[]).map(toInviteView)
  }

  return {
    target: { title: target.title, subPath: targetSubPath(target) },
    mode: pub ? "public" : inv ? "invite" : "none",
    publicLink: pub
      ? {
          key: pub.key,
          periodLimited: pub.period_limited,
          expiresAt: pub.expires_at,
          hasPassword: Boolean(pub.password_hash),
          visitLimited: pub.visit_limited,
          maxVisits: pub.max_visits,
          visitCount: pub.visit_count,
        }
      : null,
    invite: inv ? { periodLimited: inv.period_limited, expiresAt: inv.expires_at, invites } : null,
  }
}

// ---------------------------------------------------------------------------
// 생성·수정·삭제
// ---------------------------------------------------------------------------

function parseExpiry(periodLimited: boolean, expiresAt: string | null) {
  if (!periodLimited) return null
  const time = expiresAt ? Date.parse(expiresAt) : NaN
  if (!Number.isFinite(time)) throw new ShareInputError("expiryRequired")
  if (time <= Date.now()) throw new ShareInputError("expiryPast")
  return new Date(time).toISOString()
}

async function softDeleteLinks(links: LinkRow[]) {
  if (links.length === 0) return
  const db = createServiceClient()
  const ids = links.map((link) => link.id)
  const now = new Date().toISOString()
  await db.from("share_invites").update({ deleted_at: now }).in("link_id", ids).is("deleted_at", null)
  const { error } = await db.from("share_links").update({ deleted_at: now }).in("id", ids)
  if (error) throw new Error(error.message)
}

async function insertLink(row: Record<string, unknown>, kind: "public" | "invite") {
  const db = createServiceClient()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from("share_links")
      .insert({ ...row, key: generateShareKey(kind) })
      .select("*")
      .single()
    if (!error) return data as LinkRow
    // 키 충돌(23505)이면 새 키로 다시 시도, 그 외 오류는 그대로 올린다.
    if (error.code !== "23505" || !/key/.test(error.message)) throw new Error(error.message)
  }
  throw new Error("share_key_generation_failed")
}

export type PublicLinkInput = {
  periodLimited: boolean
  expiresAt: string | null
  /** undefined: 기존 비밀번호 유지, null: 비밀번호 해제, string: 새 비밀번호 */
  password: string | null | undefined
  visitLimited: boolean
  maxVisits: number | null
}

export async function savePublicLink(
  userId: string,
  type: ShareTargetType,
  target: SharedTarget,
  input: PublicLinkInput
) {
  const expiresAt = parseExpiry(input.periodLimited, input.expiresAt)

  let maxVisits: number | null = null
  if (input.visitLimited) {
    maxVisits = Number(input.maxVisits)
    if (!Number.isInteger(maxVisits) || maxVisits < 1 || maxVisits > MAX_VISITS_LIMIT) {
      throw new ShareInputError("maxVisitsInvalid")
    }
  }

  let passwordHash: string | null | undefined
  if (input.password === undefined) {
    passwordHash = undefined
  } else if (input.password === null || input.password === "") {
    passwordHash = null
  } else {
    if (input.password.length < 4 || input.password.length > 64) throw new ShareInputError("passwordInvalid")
    passwordHash = hashSharePassword(input.password)
  }

  const links = await activeLinks(userId, type, target.id)
  // 공유 방식을 바꾸면 이전 방식(초대)의 공유 정보는 함께 삭제한다.
  await softDeleteLinks(links.filter((link) => link.link_type === "invite"))

  const fields = {
    title: target.title,
    sub_path: targetSubPath(target),
    period_limited: input.periodLimited,
    expires_at: expiresAt,
    visit_limited: input.visitLimited,
    max_visits: maxVisits,
    updated_at: new Date().toISOString(),
    ...(passwordHash !== undefined ? { password_hash: passwordHash } : {}),
  }

  const existing = links.find((link) => link.link_type === "public")
  if (existing) {
    const db = createServiceClient()
    const { error } = await db.from("share_links").update(fields).eq("id", existing.id)
    if (error) throw new Error(error.message)
    return existing.key
  }

  const created = await insertLink(
    { ...fields, link_type: "public", target_type: type, target_id: target.id, created_by: userId, password_hash: passwordHash ?? null },
    "public"
  )
  return created.key
}

export type InviteInput = {
  name: string
  method: InviteMethod
  email: string | null
  phone: string | null
  title: string | null
  message: string | null
}

function cleanInvite(input: InviteInput) {
  const name = input.name.trim()
  if (!name || name.length > 40) throw new ShareInputError("inviteNameInvalid")
  if (!INVITE_METHODS.includes(input.method)) throw new ShareInputError("inviteMethodInvalid")

  const email = input.email?.trim() || null
  const phone = input.phone?.replace(/[^0-9+]/g, "") || null
  if (input.method === "EMAIL" && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new ShareInputError("inviteEmailInvalid")
  }
  if (input.method === "SMS" && (!phone || phone.replace(/\D/g, "").length < 8)) {
    throw new ShareInputError("invitePhoneInvalid")
  }

  const title = input.title?.trim() || null
  const message = input.message?.trim() || null
  if ((title?.length ?? 0) > 100 || (message?.length ?? 0) > 1000) throw new ShareInputError("inviteTextTooLong")

  return {
    recipient_name: name,
    method: input.method,
    recipient_email: input.method === "EMAIL" ? email : null,
    recipient_phone: input.method === "SMS" ? phone : null,
    title,
    message,
  }
}

export async function saveInviteLink(
  userId: string,
  type: ShareTargetType,
  target: SharedTarget,
  input: { periodLimited: boolean; expiresAt: string | null; invite: InviteInput | null }
) {
  const expiresAt = parseExpiry(input.periodLimited, input.expiresAt)
  const invite = input.invite ? cleanInvite(input.invite) : null

  const links = await activeLinks(userId, type, target.id)
  // 공유 방식을 바꾸면 이전 방식(누구나)의 링크는 함께 삭제한다.
  await softDeleteLinks(links.filter((link) => link.link_type === "public"))

  const fields = {
    title: target.title,
    sub_path: targetSubPath(target),
    period_limited: input.periodLimited,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }

  const db = createServiceClient()
  let parent = links.find((link) => link.link_type === "invite") ?? null
  if (parent) {
    const { error } = await db.from("share_links").update(fields).eq("id", parent.id)
    if (error) throw new Error(error.message)
  } else {
    parent = await insertLink(
      { ...fields, link_type: "invite", target_type: type, target_id: target.id, created_by: userId },
      "invite"
    )
  }

  if (!invite) return null

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from("share_invites")
      .insert({ ...invite, link_id: parent.id, key: generateShareKey("invite") })
      .select("key")
      .single()
    if (!error) return (data as { key: string }).key
    if (error.code !== "23505" || !/key/.test(error.message)) throw new Error(error.message)
  }
  throw new Error("share_key_generation_failed")
}

export async function removeShareFor(userId: string, type: ShareTargetType, targetId: string) {
  await softDeleteLinks(await activeLinks(userId, type, targetId))
}

/** 초대 1건 삭제. 만든 사람 본인이거나 관리자만 가능하다. */
export async function removeInvite(userId: string, isOwner: boolean, inviteId: string) {
  const db = createServiceClient()
  const { data } = await db
    .from("share_invites")
    .select("id, share_links(created_by)")
    .eq("id", inviteId)
    .is("deleted_at", null)
    .maybeSingle()
  if (!data) return false
  const parent = (Array.isArray(data.share_links) ? data.share_links[0] : data.share_links) as { created_by: string } | null
  if (!parent || (!isOwner && parent.created_by !== userId)) return false
  const { error } = await db.from("share_invites").update({ deleted_at: new Date().toISOString() }).eq("id", inviteId)
  if (error) throw new Error(error.message)
  return true
}

export async function removeLinkAsAdmin(linkId: string) {
  const db = createServiceClient()
  const { data } = await db.from("share_links").select("*").eq("id", linkId).is("deleted_at", null).maybeSingle()
  if (!data) return false
  await softDeleteLinks([data as LinkRow])
  return true
}

// ---------------------------------------------------------------------------
// 공유 키로 들어온 방문자 검증
// ---------------------------------------------------------------------------

export type ShareFailure = "forbidden" | "expired" | "limited" | "deleted_public" | "deleted_invite"

export type ShareResolution =
  | { status: "ok"; link: LinkRow; invite: InviteRow | null }
  | { status: ShareFailure }

export async function resolveShareKey(key: string, opts: { alreadyVisited: boolean }): Promise<ShareResolution> {
  if (!isValidShareKey(key)) return { status: "forbidden" }
  const db = createServiceClient()

  let invite: InviteRow | null = null
  let link: LinkRow | null = null

  if (isInviteKey(key)) {
    const { data } = await db.from("share_invites").select("*").eq("key", key).maybeSingle()
    invite = (data as InviteRow | null) ?? null
    if (!invite) return { status: "forbidden" }
    if (invite.deleted_at) return { status: "deleted_invite" }
    const { data: parent } = await db.from("share_links").select("*").eq("id", invite.link_id).maybeSingle()
    link = (parent as LinkRow | null) ?? null
    if (!link) return { status: "forbidden" }
    if (link.deleted_at) return { status: "deleted_invite" }
  } else {
    const { data } = await db.from("share_links").select("*").eq("key", key).maybeSingle()
    link = (data as LinkRow | null) ?? null
    if (!link || link.link_type !== "public") return { status: "forbidden" }
    if (link.deleted_at) return { status: "deleted_public" }
  }

  if (link.period_limited && link.expires_at && Date.now() > Date.parse(link.expires_at)) {
    return { status: "expired" }
  }
  // 이미 이번 방문에서 한 번 세어진 사람(쿠키)은 새로고침해도 횟수 제한에 막히지 않는다.
  if (
    link.link_type === "public" &&
    link.visit_limited &&
    !opts.alreadyVisited &&
    link.max_visits !== null &&
    link.visit_count >= link.max_visits
  ) {
    return { status: "limited" }
  }

  return { status: "ok", link, invite }
}

export async function recordVisit(link: LinkRow, invite: InviteRow | null, ip: string, userAgent: string | null) {
  const db = createServiceClient()
  const { data, error } = await db.rpc("share_record_visit", {
    p_link: link.id,
    p_invite: invite?.id ?? null,
    p_ip: ip,
    p_user_agent: userAgent,
  })
  if (error) throw new Error(error.message)
  return data === true
}

// ---------------------------------------------------------------------------
// 관리자 목록
// ---------------------------------------------------------------------------

export async function listShareLinksForAdmin(limit = 200): Promise<AdminShareRow[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from("share_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  const links = (data ?? []) as LinkRow[]
  if (links.length === 0) return []

  const creatorIds = Array.from(new Set(links.map((link) => link.created_by)))
  const inviteLinkIds = links.filter((link) => link.link_type === "invite").map((link) => link.id)

  const [profiles, invites] = await Promise.all([
    db.from("profiles").select("id, full_name, username").in("id", creatorIds),
    inviteLinkIds.length > 0
      ? db.from("share_invites").select("link_id, read_at").in("link_id", inviteLinkIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as { link_id: string; read_at: string | null }[] }),
  ])

  const names = new Map<string, string>()
  for (const row of (profiles.data ?? []) as { id: string; full_name: string | null; username: string | null }[]) {
    names.set(row.id, row.full_name || row.username || "회원")
  }
  const inviteCounts = new Map<string, { total: number; read: number }>()
  for (const row of (invites.data ?? []) as { link_id: string; read_at: string | null }[]) {
    const count = inviteCounts.get(row.link_id) ?? { total: 0, read: 0 }
    count.total += 1
    if (row.read_at) count.read += 1
    inviteCounts.set(row.link_id, count)
  }

  return links.map((link) => ({
    id: link.id,
    linkType: link.link_type,
    targetType: link.target_type,
    targetId: link.target_id,
    title: link.title,
    subPath: link.sub_path,
    key: link.key,
    creatorName: names.get(link.created_by) ?? "회원",
    periodLimited: link.period_limited,
    expiresAt: link.expires_at,
    hasPassword: Boolean(link.password_hash),
    visitLimited: link.visit_limited,
    maxVisits: link.max_visits,
    visitCount: link.visit_count,
    inviteTotal: inviteCounts.get(link.id)?.total ?? 0,
    inviteRead: inviteCounts.get(link.id)?.read ?? 0,
    createdAt: link.created_at,
    deletedAt: link.deleted_at,
  }))
}

export async function listAccessLog(linkId: string, limit = 100): Promise<ShareAccessEntry[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from("share_access_log")
    .select("id, accessed_at, ip_address, user_agent, share_invites(recipient_name)")
    .eq("link_id", linkId)
    .order("accessed_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as {
    id: string
    accessed_at: string
    ip_address: string | null
    user_agent: string | null
    share_invites: { recipient_name: string } | { recipient_name: string }[] | null
  }[]).map((row) => {
    const invite = Array.isArray(row.share_invites) ? row.share_invites[0] : row.share_invites
    return {
      id: row.id,
      accessedAt: row.accessed_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      inviteName: invite?.recipient_name ?? null,
    }
  })
}
