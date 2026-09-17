export const VISIT_LOG_COOKIE = "dd_visit_logged"
// login_history.id를 세션 식별자로 재사용해 이 쿠키에 담아둔다 — page_views가
// 어느 세션에 속하는지는 새 테이블/개념 없이 이 값 하나로 잇는다(docs/10-login-history.md).
export const VISIT_ID_COOKIE = "dd_visit_id"
export const VISIT_WINDOW_SECONDS = 60 * 30
export const VISIT_WINDOW_MS = VISIT_WINDOW_SECONDS * 1000

export function visitLogCookieOptions() {
  return { maxAge: VISIT_WINDOW_SECONDS, path: "/", sameSite: "lax" as const }
}
