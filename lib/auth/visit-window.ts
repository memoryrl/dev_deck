export const VISIT_LOG_COOKIE = "dd_visit_logged"
// login_history.id를 세션 식별자로 재사용해 이 쿠키에 담아둔다 — page_views가
// 어느 세션에 속하는지는 새 테이블/개념 없이 이 값 하나로 잇는다(docs/10-login-history.md).
export const VISIT_ID_COOKIE = "dd_visit_id"
export const VISIT_WINDOW_SECONDS = 60 * 30
export const VISIT_WINDOW_MS = VISIT_WINDOW_SECONDS * 1000

export function visitLogCookieOptions() {
  // httpOnly로 막아 JS(=문서에 삽입된 어떤 스크립트든)가 document.cookie로 값을
  // 읽거나 바꾸지 못하게 한다 — 서버가 이 값을 그대로 DB insert에 쓰기 때문에
  // 방어 심화 차원에서 필요하다(components/layout/visit-tracker.tsx는 이제 이
  // 쿠키를 클라이언트에서 직접 읽지 않고, 매 네비게이션마다 그냥 보내면 서버가
  // 쿠키 유무를 스스로 확인해 없으면 조용히 무시한다).
  return { maxAge: VISIT_WINDOW_SECONDS, path: "/", sameSite: "lax" as const, httpOnly: true }
}
