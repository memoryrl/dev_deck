"use server"

import { requireOwner } from "@/lib/auth/owner"
import { chatWithOllama, type OllamaChatMessage } from "@/lib/ollama/client"

const MODEL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/
const CONTENT_MAX = 8_000
const HISTORY_MAX = 40

export type SendOllamaMessageResult =
  | { ok: true; content: string; durationMs: number }
  | { ok: false; error: string }

export async function sendOllamaMessage(
  model: string,
  messages: OllamaChatMessage[]
): Promise<SendOllamaMessageResult> {
  await requireOwner()

  if (!MODEL_PATTERN.test(model)) return { ok: false, error: "모델 이름이 올바르지 않습니다." }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > HISTORY_MAX) {
    return { ok: false, error: "대화 내용이 올바르지 않습니다." }
  }
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") {
      return { ok: false, error: "대화 내용이 올바르지 않습니다." }
    }
    if (typeof m.content !== "string" || !m.content.trim() || m.content.length > CONTENT_MAX) {
      return { ok: false, error: `메시지는 ${CONTENT_MAX}자를 넘을 수 없습니다.` }
    }
  }

  const result = await chatWithOllama(model, messages)
  if (!result.ok) {
    const message =
      result.error === "ollama_host_missing" || result.error === "ollama_loopback_blocked"
        ? "Vercel에서는 이 맥의 localhost Ollama에 닿을 수 없습니다. 사이트 설정에 살아있는 Cloudflare 터널 주소를 넣으세요."
        : result.error === "ollama_unreachable"
          ? "Ollama 서버에 연결할 수 없습니다. 사이트 설정의 Ollama 주소와 터널을 확인하세요."
          : result.error === "ollama_timeout"
            ? "응답이 너무 오래 걸려 중단했습니다."
            : result.error === "ollama_http_403" || result.error === "ollama_http_530"
              ? "Ollama가 터널 Host를 거부했습니다. cloudflared에 --http-host-header 127.0.0.1 을 붙여 다시 켜세요."
              : `Ollama 오류: ${result.error}`
    return { ok: false, error: message }
  }
  return { ok: true, content: result.data.content, durationMs: result.data.durationMs }
}
