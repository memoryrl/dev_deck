// 07-uploads.md 7장 참고. 인스턴스 메모리 기반 best-effort 레이트리밋이다.
// 서버리스 함수가 재시작/스케일아웃되면 카운터가 리셋된다 — 완전한 방어가 아니라
// 익명 업로드 엔드포인트에 대한 최소한의 어뷰징 억제용. 트래픽이 늘면 Upstash 등
// 영속 저장소로 교체할 것 (docs/07-uploads.md 9장).

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/**
 * key(보통 클라이언트 IP)가 windowMs 동안 limit회를 넘겨 호출했는지 확인한다.
 * 넘지 않았으면 카운트를 올리고 true(허용)를 반환한다.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false

  bucket.count += 1
  return true
}

/**
 * 서버리스 인스턴스가 바뀌어도 유지되는 레이트리밋. DB 함수(rate_limit_hit)가 원자적으로 세므로
 * 여러 인스턴스·동시 요청에도 한도를 넘지 않는다. patch-security-hardening.sql 이 필요하다.
 *
 * DB 호출이 실패하면(패치 미적용, 일시 장애) 인스턴스 메모리 방식으로 대신한다 — 레이트리밋이
 * 죽었다고 정상 요청까지 막아 버리지 않기 위해서다.
 */
export async function checkRateLimitPersistent(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service")
    const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    })
    if (error) throw new Error(error.message)
    return data === true
  } catch {
    return checkRateLimit(key, limit, windowMs)
  }
}
