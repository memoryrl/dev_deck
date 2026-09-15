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
