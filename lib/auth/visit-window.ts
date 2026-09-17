export const VISIT_LOG_COOKIE = "dd_visit_logged"
export const VISIT_WINDOW_SECONDS = 60 * 30
export const VISIT_WINDOW_MS = VISIT_WINDOW_SECONDS * 1000

export function visitLogCookieOptions() {
  return { maxAge: VISIT_WINDOW_SECONDS, path: "/", sameSite: "lax" as const }
}
