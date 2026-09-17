export type VisitAudienceKind = "local" | "vercel" | "bot" | "user"

export type VisitAudience = {
  kind: VisitAudienceKind
  label: string
  hint: string
}

function isPrivateIp(ip: string) {
  const value = ip.trim()
  if (!value || value === "127.0.0.1" || value === "::1" || value === "0.0.0.0" || value === "::") return true
  if (value.startsWith("10.") || value.startsWith("192.168.") || value.startsWith("127.")) return true
  const m = value.match(/^172\.(\d+)\./)
  if (m) {
    const n = Number(m[1])
    if (n >= 16 && n <= 31) return true
  }
  return false
}

const CRAWLER_UA =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegram|whatsapp|applebot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|crawler|spider|bot\b|curl\/|wget\/|python-requests|httpie|go-http-client/i

// 더 구체적인 경로를 앞에 둔다.
const SCREEN_ROUTES: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/$/, label: "홈" },
  { pattern: /^\/status\/\d{3}\/?$/, label: "오류 페이지" },
  { pattern: /^\/opensource\/?$/, label: "오픈소스 사용정보" },
  { pattern: /^\/login\/?$/, label: "로그인" },
  { pattern: /^\/account\/?$/, label: "계정" },
  { pattern: /^\/work\/?$/, label: "커리어 목록" },
  { pattern: /^\/work\/[^/]+\/?$/, label: "커리어 상세" },
  { pattern: /^\/games\/?$/, label: "게임 목록" },
  { pattern: /^\/games\/\d+\/?$/, label: "게임 상세" },
  { pattern: /^\/p\/[^/]+\/?$/, label: "프롬프트 상세" },
  { pattern: /^\/b\/prompts\/?$/, label: "프롬프트 목록" },
  { pattern: /^\/b\/notice\/[^/]+\/?$/, label: "공지 상세" },
  { pattern: /^\/b\/notice\/?$/, label: "공지사항" },
  { pattern: /^\/b\/free\/[^/]+\/?$/, label: "자유게시판 글" },
  { pattern: /^\/b\/free\/?$/, label: "자유게시판" },
  { pattern: /^\/b\/[^/]+\/[^/]+\/?$/, label: "게시글 상세" },
  { pattern: /^\/b\/[^/]+\/?$/, label: "게시판" },
  { pattern: /^\/promptkit\/[^/]+\/?$/, label: "프롬프트 수정" },
  { pattern: /^\/promptkit\/?$/, label: "PromptKit" },
  { pattern: /^\/career\/skills\/?$/, label: "스킬 관리" },
  { pattern: /^\/career\/[^/]+\/?$/, label: "커리어 글 수정" },
  { pattern: /^\/career\/?$/, label: "CareerLog" },
  { pattern: /^\/steam\/\d+\/?$/, label: "Steam 리뷰 관리" },
  { pattern: /^\/steam\/?$/, label: "Steam Tracker" },
  { pattern: /^\/site\/boards\/[^/]+\/[^/]+\/?$/, label: "게시글 수정" },
  { pattern: /^\/site\/boards\/[^/]+\/?$/, label: "게시판 설정" },
  { pattern: /^\/site\/boards\/?$/, label: "게시판 관리" },
  { pattern: /^\/site\/comments\/?$/, label: "댓글 관리" },
  { pattern: /^\/site\/menus\/?$/, label: "메뉴" },
  { pattern: /^\/site\/uploads\/?$/, label: "업로드" },
  { pattern: /^\/site\/login-history\/?$/, label: "접속 이력" },
]

export function screenLabelFromPath(rawPath: string) {
  const path = rawPath.split("?")[0]?.split("#")[0] || "/"
  const match = SCREEN_ROUTES.find((route) => route.pattern.test(path))
  return match?.label ?? "페이지"
}

export function classifyVisit(entry: {
  user_agent: string | null
  ip_address: string
  ip_region: string | null
}): VisitAudience {
  const ua = entry.user_agent ?? ""
  const region = entry.ip_region ?? ""

  if (isPrivateIp(entry.ip_address)) {
    return {
      kind: "local",
      label: "로컬",
      hint: "이 컴퓨터나 개발 서버에서 열린 접속입니다.",
    }
  }

  const headlessLinux = /headlesschrome/i.test(ua) && /linux/i.test(ua)
  const vercelNamed = /vercel/i.test(ua)
  const vercelRegion = /san jose/i.test(region) && /headlesschrome/i.test(ua)
  if (vercelNamed || headlessLinux || vercelRegion) {
    return {
      kind: "vercel",
      label: "Vercel 봇",
      hint: "배포·미리보기·모니터링 등 Vercel 쪽 자동 접속입니다. 실제 방문자가 아닙니다.",
    }
  }

  if (CRAWLER_UA.test(ua)) {
    return {
      kind: "bot",
      label: "크롤러",
      hint: "검색엔진·미리보기 봇 접속입니다. 실제 방문자가 아닙니다.",
    }
  }

  return {
    kind: "user",
    label: "외부 사용자",
    hint: "브라우저로 들어온 실제 방문으로 보입니다.",
  }
}
