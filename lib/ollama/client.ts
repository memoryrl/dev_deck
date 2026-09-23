import { APP_ENV_KEYS, getAppEnv, parseHttpOriginUrl } from "@/lib/site/app-env"

const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434"
const REQUEST_TIMEOUT_MS = 120_000

export type OllamaChatMessage = { role: "user" | "assistant" | "system"; content: string }

type OllamaResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function resolveOllamaHost(): Promise<string> {
  const fromDb = parseHttpOriginUrl(await getAppEnv(APP_ENV_KEYS.ollamaBaseUrl))
  if (fromDb) return fromDb
  const fromEnv = parseHttpOriginUrl(process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_HOST ?? "")
  if (fromEnv) return fromEnv
  return DEFAULT_OLLAMA_HOST
}

async function ollamaFetch(path: string, init?: RequestInit): Promise<OllamaResult<Response>> {
  const host = await resolveOllamaHost()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${host}${path}`, { ...init, signal: controller.signal })
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

/** 대화 한 턴을 보내고 전체 응답을 기다린다(stream:false) — 3B급 모델이라 왕복 몇 초면 충분하다. */
export async function chatWithOllama(
  model: string,
  messages: OllamaChatMessage[]
): Promise<OllamaResult<{ content: string; durationMs: number }>> {
  const started = Date.now()
  const res = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
  })
  if (!res.ok) return res
  const body = (await res.data.json()) as { message?: { content?: string } }
  const content = body.message?.content?.trim()
  if (!content) return { ok: false, error: "ollama_empty_response" }
  return { ok: true, data: { content, durationMs: Date.now() - started } }
}
