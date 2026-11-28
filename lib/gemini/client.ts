// 서버 전용 파일이다(API 키를 읽는다). "use server" 액션이나 서버 컴포넌트에서만 import 할 것.
import { checkRateLimitPersistent } from "@/lib/uploads/rate-limit"

/**
 * Gemini API (Google AI Studio) 무료 등급 전용 클라이언트.
 *
 * "무조건 무료"는 두 겹으로 지킨다.
 *  1) Google 쪽: API 키가 속한 프로젝트에 결제(Billing)를 연결하지 않는다. 무료 등급 프로젝트는
 *     한도를 넘으면 과금 대신 429 RESOURCE_EXHAUSTED 로 거절된다. (이게 진짜 안전장치)
 *  2) 앱 쪽: 아래 예산 카운터로 Google 한도에 닿기 전에 먼저 멈춘다. 429를 받으면
 *     그날(태평양 시간) 자정까지 호출 자체를 끊는다.
 *
 * 2026-11-29 AI Studio "비율 제한" 화면 기준 무료 한도:
 *  - gemini-3.5-flash-lite : 15 RPM / 250K TPM / 500 RPD
 *  - gemini-3.1-flash-lite : 15 RPM / 250K TPM / 500 RPD
 *  (3.6/3.8 Flash, 4 Hydrogen 은 하루 20회뿐이라 챗봇용으로 부족하다)
 * 한도는 Google이 예고 없이 바꿀 수 있으니 aistudio.google.com/rate-limit 에서 가끔 확인할 것.
 */

/** 무료 등급이 있는 모델만 허용한다. 실수로 유료 전용 모델을 넣어도 여기서 막힌다. */
const FREE_TIER_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const
type FreeTierModel = (typeof FREE_TIER_MODELS)[number]
const DEFAULT_MODEL: FreeTierModel = "gemini-3.5-flash-lite"

/** Google 무료 한도(500 RPD, 15 RPM)보다 조금 낮게 잡아 여유를 둔다. 환경변수로 더 낮출 수만 있다. */
const FREE_RPD = 500
const FREE_RPM = 15
const DAILY_BUDGET_MAX = 450
const MINUTE_BUDGET_MAX = 12

const API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const REQUEST_TIMEOUT_MS = 30_000
const MAX_OUTPUT_TOKENS = 700

export type GeminiChatMessage = { role: "user" | "assistant" | "system"; content: string }

export type GeminiErrorCode =
  | "gemini_key_missing"
  | "gemini_daily_budget_exhausted" // 앱 예산(하루) 소진 또는 Google 일일 한도 429
  | "gemini_minute_budget_exhausted" // 분당 한도
  | "gemini_timeout"
  | "gemini_unreachable"
  | "gemini_blocked" // 안전 필터 등으로 답이 비었음
  | `gemini_http_${number}`

type GeminiResult<T> = { ok: true; data: T } | { ok: false; error: GeminiErrorCode }

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim())
}

export function getGeminiModel(): FreeTierModel {
  const fromEnv = process.env.GEMINI_MODEL?.trim()
  return (FREE_TIER_MODELS as readonly string[]).includes(fromEnv ?? "") ? (fromEnv as FreeTierModel) : DEFAULT_MODEL
}

function clampInt(raw: string | undefined, fallback: number, max: number): number {
  const n = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

function dailyBudget() {
  return clampInt(process.env.GEMINI_DAILY_BUDGET, DAILY_BUDGET_MAX, FREE_RPD - 20)
}

function minuteBudget() {
  return clampInt(process.env.GEMINI_MINUTE_BUDGET, MINUTE_BUDGET_MAX, FREE_RPM - 2)
}

/** Gemini 일일 한도(RPD)는 태평양 시간 자정에 초기화된다. 앱 예산도 같은 날짜 기준으로 센다. */
function pacificDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** 다음 태평양 시간 자정(=한국 시간 오후 4시(서머타임) 또는 5시)의 epoch ms. */
function nextPacificMidnight(now = Date.now()): number {
  const today = pacificDateKey(new Date(now))
  // 1시간씩 앞으로 가며 날짜가 바뀌는 첫 시각을 찾는다(서머타임 경계도 안전).
  let t = now - (now % 3_600_000) + 3_600_000
  while (pacificDateKey(new Date(t)) === today) t += 3_600_000
  return t
}

// 429를 받은 뒤 같은 인스턴스가 Google을 계속 두드리지 않게 하는 차단기.
// 인스턴스 메모리라 서버리스 인스턴스마다 따로지만, 위 DB 카운터가 전역 예산을 지킨다.
let blockedUntil = 0
let blockedReason: GeminiErrorCode = "gemini_daily_budget_exhausted"

/** 남은 무료 예산을 1회 차감한다. 이미 썼으면 false. (호출 직전에만 부른다) */
async function reserveQuota(): Promise<GeminiResult<null>> {
  if (Date.now() < blockedUntil) return { ok: false, error: blockedReason }
  if (!(await checkRateLimitPersistent("gemini:rpm", minuteBudget(), 60_000))) {
    return { ok: false, error: "gemini_minute_budget_exhausted" }
  }
  // 키에 태평양 날짜가 들어가므로 날짜가 바뀌면 새 카운터가 된다. 창은 넉넉히 25시간.
  if (!(await checkRateLimitPersistent(`gemini:rpd:${pacificDateKey()}`, dailyBudget(), 25 * 3_600_000))) {
    blockedUntil = nextPacificMidnight()
    blockedReason = "gemini_daily_budget_exhausted"
    return { ok: false, error: "gemini_daily_budget_exhausted" }
  }
  return { ok: true, data: null }
}

type GeminiErrorBody = {
  error?: { code?: number; status?: string; message?: string; details?: { violations?: { quotaId?: string }[] }[] }
}

/** 429가 "하루 한도"인지 "분당 한도"인지 구분한다. 모르면 하루 한도로 보고 보수적으로 막는다. */
function classify429(body: GeminiErrorBody): "daily" | "minute" {
  const text = JSON.stringify(body).toLowerCase()
  if (/perminute|per_minute|per minute/.test(text) && !/perday|per_day|per day/.test(text)) return "minute"
  return "daily"
}

/**
 * 대화 한 턴을 보내고 전체 응답을 받는다. 무료 예산을 먼저 차감하고, 실패해도 차감은 되돌리지 않는다
 * (Google도 실패한 요청을 한도에 센다).
 */
export async function chatWithGemini(
  messages: GeminiChatMessage[],
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<GeminiResult<{ content: string; model: string; durationMs: number }>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: "gemini_key_missing" }

  const quota = await reserveQuota()
  if (!quota.ok) return quota

  const model = getGeminiModel()
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))

  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
          temperature: options?.temperature ?? 0.2,
          maxOutputTokens: Math.min(options?.maxOutputTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    })

    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as GeminiErrorBody
      if (classify429(body) === "minute") {
        blockedUntil = Date.now() + 60_000
        blockedReason = "gemini_minute_budget_exhausted"
        return { ok: false, error: "gemini_minute_budget_exhausted" }
      }
      blockedUntil = nextPacificMidnight()
      blockedReason = "gemini_daily_budget_exhausted"
      console.warn("[gemini] free-tier daily quota exhausted; blocked until", new Date(blockedUntil).toISOString())
      return { ok: false, error: "gemini_daily_budget_exhausted" }
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      // 키나 요청 내용은 남기지 않는다. 상태와 Google 메시지 앞부분만.
      console.error(`[gemini] HTTP ${res.status}`, body.slice(0, 300))
      return { ok: false, error: `gemini_http_${res.status}` }
    }

    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
    }
    const content = (body.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim()
    if (!content) return { ok: false, error: "gemini_blocked" }
    return { ok: true, data: { content, model, durationMs: Date.now() - started } }
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError"
    return { ok: false, error: aborted ? "gemini_timeout" : "gemini_unreachable" }
  } finally {
    clearTimeout(timer)
  }
}

/** 화면에 보여 줄 문구. 한도 소진은 언제 다시 열리는지까지 알려 준다. */
export function publicGeminiErrorMessage(error: GeminiErrorCode): string {
  if (error === "gemini_daily_budget_exhausted") {
    const reopen = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      hour: "numeric",
    }).format(new Date(nextPacificMidnight()))
    return `오늘 준비된 무료 AI 답변을 모두 사용했어요. ${reopen}에 다시 열려요. 그동안 커리어로그/프롬프트 페이지를 직접 둘러봐 주세요.`
  }
  if (error === "gemini_minute_budget_exhausted") {
    return "지금 질문이 몰려 있어요. 1분쯤 뒤에 다시 시도해 주세요."
  }
  return "AI 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주시거나, 커리어로그/프롬프트 페이지를 직접 둘러봐 주세요."
}
