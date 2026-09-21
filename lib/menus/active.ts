// 헤더·푸터 메뉴에서 "지금 열려 있는 화면"에 해당하는 링크를 고른다.

function pathOf(href: string) {
  return href.split(/[?#]/)[0] || "/"
}

function matches(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * 후보 href 중 현재 경로와 가장 길게 일치하는 것을 돌려준다.
 * `/b/prompts`와 `/b/prompts/top`이 함께 있어도 상세 화면에서는 더 구체적인 쪽만 활성이 된다.
 * `/#prompts`처럼 해시가 붙은 앵커 링크나 외부 링크는 화면을 대표하지 못하므로 제외한다.
 */
export function pickActiveHref(pathname: string, hrefs: readonly (string | null | undefined)[]) {
  let best: string | null = null
  for (const raw of hrefs) {
    if (!raw || raw.startsWith("http") || raw.includes("#")) continue
    const href = pathOf(raw)
    if (!matches(pathname, href)) continue
    if (best === null || href.length > best.length) best = href
  }
  return best
}

export function isActiveHref(active: string | null, href: string | null | undefined) {
  return Boolean(active && href && !href.includes("#") && pathOf(href) === active)
}
