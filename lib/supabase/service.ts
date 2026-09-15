import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * 서비스 롤 키로 만든 서버 전용 클라이언트. RLS를 우회하므로 신뢰된 서버 코드
 * (Route Handler)에서만 쓰고, 쿠키 세션이 필요한 일반 요청에는 lib/supabase/server.ts를 쓴다.
 *
 * 07-uploads.md 4.1 참고 — editor-images 버킷은 이 클라이언트로만 쓰기가 가능하도록
 * RLS를 잠가둔다.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase service role client is not configured")
  }

  return createSupabaseClient(url, key, {
    db: { schema: "devdeck" },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
