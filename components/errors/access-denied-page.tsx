import type { AccessRole } from "@/lib/access"
import { HttpErrorPage } from "@/components/errors/http-error-page"

/** 로그인 전 권한 부족은 401, 로그인 후 권한 부족은 403. */
export function AccessDeniedPage({ role }: { role: AccessRole }) {
  return <HttpErrorPage status={role === "visitor" ? 401 : 403} />
}
