import { cache } from "react"
import { headers } from "next/headers"
import { adminNavLabel } from "@/components/layout/admin-nav"
import { accessRoleOf } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { getT } from "@/lib/i18n/dictionary"
import { listAdminMenus } from "@/lib/menus/admin"
import { menuLabel } from "@/lib/menus/label"
import { listNavMenus } from "@/lib/menus/public"

// 제목 배너 스타일 3(로봇 회의실)이 쓰는 "팀" — 현재 화면이 속한 루트 메뉴 = 팀장 로봇,
// 그 아래 하위 메뉴 = 팀원 로봇. 로봇 피부색은 루트 메뉴 순서로 정해서 홈 토폴로지의 책상 로봇과 같다.
/** tag: 로봇 발밑에 늘 보이는 이름표(팀장은 "OO 팀장", 팀원은 메뉴명) */
export type BannerRobot = { label: string; skin: number; speech: string; tag: string }
export type BannerTeam = { leader: BannerRobot; members: BannerRobot[] }

const MAX_MEMBERS = 4

function normalizePath(path: string) {
  const value = path.split("?")[0]?.split("#")[0] || "/"
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value
}
function pathMatches(path: string, href: string | null | undefined) {
  if (!href || href === "/") return false
  const current = normalizePath(path)
  const target = normalizePath(href)
  return current === target || current.startsWith(`${target}/`)
}
const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 0)

type Raw = { label: string; href: string | null }
type Group = { label: string; items: Raw[]; href: string | null }

export const bannerTeamForRequest = cache(async (title: string): Promise<BannerTeam> => {
  const { t, locale } = await getT()
  const path = (await headers()).get("x-pathname")?.trim() ?? "/"
  const viewer = await currentViewer()
  const dashboard = /^\/(site|promptkit|career|steam)(\/|$)/.test(path)

  let groups: Group[]
  if (dashboard) {
    groups = (await listAdminMenus()).map((g) => ({
      label: adminNavLabel(t, g, locale),
      href: g.href,
      items: g.items.map((i) => ({ label: adminNavLabel(t, i, locale), href: i.href })),
    }))
  } else {
    groups = (await listNavMenus("header", accessRoleOf(viewer.user))).map((n) => ({
      label: menuLabel(t, n, locale),
      href: n.href,
      items: n.children.map((c) => ({ label: menuLabel(t, c, locale), href: c.href })),
    }))
  }

  // 가장 깊게(긴 경로로) 일치하는 그룹을 고른다.
  let best = -1
  let bestLen = -1
  groups.forEach((g, i) => {
    const lens = [g.href, ...g.items.map((it) => it.href)].filter((h) => pathMatches(path, h)).map((h) => h!.length)
    const len = lens.length ? Math.max(...lens) : -1
    if (len > bestLen) {
      best = i
      bestLen = len
    }
  })

  const group = best >= 0 ? groups[best] : null
  const leaderLabel = group?.label ?? title
  const leaderSkin = group ? best : hash(title)
  // 지금 보고 있는 하위 메뉴가 첫 발언자가 되도록 앞으로 당긴다.
  const items = [...(group?.items ?? [])].sort((a, b) => Number(pathMatches(path, b.href)) - Number(pathMatches(path, a.href)))
  const generic = [t("bannerMeeting.meetingGeneric1"), t("bannerMeeting.meetingGeneric2"), t("bannerMeeting.meetingGeneric3")]
  const members: BannerRobot[] = (items.length ? items : generic.map((g) => ({ label: "", href: null, g }))).slice(0, MAX_MEMBERS).map((item, i) => ({
    label: item.label,
    skin: leaderSkin + 1 + i,
    speech: "g" in item ? (item as { g: string }).g : t("bannerMeeting.meetingMember", { name: item.label }),
    tag: item.label,
  }))

  return { leader: { label: leaderLabel, skin: leaderSkin, speech: t("bannerMeeting.meetingLead", { name: leaderLabel }), tag: t("bannerMeeting.leaderTag", { name: leaderLabel }) }, members }
})
