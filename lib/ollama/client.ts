import { APP_ENV_KEYS, getAppEnv, parseHttpOriginUrl } from "@/lib/site/app-env"

const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434"
const REQUEST_TIMEOUT_MS = 120_000

export type OllamaChatMessage = { role: "user" | "assistant" | "system"; content: string }

export type OllamaConnection = {
  host: string | null
  source: "db" | "env" | "local-default" | "none"
  loopbackBlocked: boolean
}

type OllamaResult<T> = { ok: true; data: T } | { ok: false; error: string }

function isVercelRuntime() {
  return process.env.VERCEL === "1"
}

function isLoopbackOrigin(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]" || hostname === "::1"
  } catch {
    return false
  }
}

export async function getOllamaConnection(): Promise<OllamaConnection> {
  // localhost:3000 은 이 맥의 Ollama에 바로 붙인다. 터널은 Vercel 전용이다.
  // (터널 Host 를 Ollama가 기본값으로 403 한다 — OLLAMA_ORIGINS=* 가 필요)
  if (!isVercelRuntime()) {
    return { host: DEFAULT_OLLAMA_HOST, source: "local-default", loopbackBlocked: false }
  }

  const fromDb = parseHttpOriginUrl(await getAppEnv(APP_ENV_KEYS.ollamaBaseUrl))
  if (fromDb) {
    if (isLoopbackOrigin(fromDb)) return { host: null, source: "none", loopbackBlocked: true }
    return { host: fromDb, source: "db", loopbackBlocked: false }
  }
  const fromEnv = parseHttpOriginUrl(process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_HOST ?? "")
  if (fromEnv) {
    if (isLoopbackOrigin(fromEnv)) return { host: null, source: "none", loopbackBlocked: true }
    return { host: fromEnv, source: "env", loopbackBlocked: false }
  }
  return { host: null, source: "none", loopbackBlocked: false }
}

async function ollamaFetch(path: string, init?: RequestInit): Promise<OllamaResult<Response>> {
  const { host, loopbackBlocked } = await getOllamaConnection()
  if (!host) {
    return { ok: false, error: loopbackBlocked ? "ollama_loopback_blocked" : "ollama_host_missing" }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const headers = new Headers(init?.headers)
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", "DevDeck-Ollama/1.0")
    }
    if (!headers.has("Accept")) headers.set("Accept", "application/json")
    const res = await fetch(`${host}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) return { ok: false, error: `ollama_http_${res.status}` }
    return { ok: true, data: res }
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError"
    return { ok: false, error: aborted ? "ollama_timeout" : "ollama_unreachable" }
  } finally {
    clearTimeout(timer)
  }
}

/** 설치된 모델 목록(GET /api/tags). Ollama가 꺼져 있으면 error를 돌려준다 — 화면에서 안내만 하고 죽지 않는다. */
export async function listOllamaModels(): Promise<OllamaResult<string[]>> {
  const res = await ollamaFetch("/api/tags")
  if (!res.ok) return res
  const body = (await res.data.json()) as { models?: { name: string }[] }
  return { ok: true, data: (body.models ?? []).map((m) => m.name) }
}

/** 대화 한 턴을 보내고 전체 응답을 기다린다(stream:false) — 3B급 모델이라 왕복 몇 초면 충분하다.
 *  options 는 Ollama의 모델 파라미터(temperature 등)를 그대로 전달한다 — 사실 근거 답변이
 *  필요한 호출(포트폴리오 안내원)은 temperature를 낮춰 호출한다. */
export async function chatWithOllama(
  model: string,
  messages: OllamaChatMessage[],
  options?: Record<string, unknown>
): Promise<OllamaResult<{ content: string; durationMs: number }>> {
  const started = Date.now()
  const res = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, ...(options ? { options } : {}) }),
  })
  if (!res.ok) return res
  const body = (await res.data.json()) as { message?: { content?: string } }
  const content = body.message?.content?.trim()
  if (!content) return { ok: false, error: "ollama_empty_response" }
  return { ok: true, data: { content, durationMs: Date.now() - started } }
}
