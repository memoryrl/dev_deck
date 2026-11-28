// 포트폴리오 안내원이 쓸 AI 제공자를 고른다. actions.ts 는 이 함수 하나만 부르면 된다.
//
//  PORTFOLIO_AI_PROVIDER=gemini  → Gemini 무료 등급 (GEMINI_API_KEY 필요)
//  PORTFOLIO_AI_PROVIDER=ollama  → 기존 맥미니 Ollama
//  (비워 두면 GEMINI_API_KEY 가 있을 때 gemini, 없으면 ollama)
//
// Gemini 가 실패하면(무료 한도 소진 포함) 맥미니 Ollama 로 넘긴다(아래 generatePortfolioAnswer).
import { chatWithGemini, isGeminiConfigured, publicGeminiErrorMessage } from "@/lib/gemini/client"
import { chatWithOllama, type OllamaChatMessage } from "@/lib/ollama/client"

export type PortfolioAnswer =
  | { ok: true; content: string; model: string; durationMs: number }
  | { ok: false; error: string }

const GENERAL_MODEL = "exaone3.5:2.4b"
const CODE_MODEL = "qwen2.5-coder:3b"
// 두 모델 중 코드/프롬프트 관련 질문은 코딩 특화 모델로 보낸다. (Ollama 전용)
const CODE_HINT = /```|코드|함수|버그|에러|타입스크립트|리액트|프롬프트.*(어떻게|뭐)|구현|리팩터/i

function shouldUseGemini(): boolean {
  const provider = process.env.PORTFOLIO_AI_PROVIDER?.trim().toLowerCase()
  if (provider === "gemini") return true
  if (provider === "ollama") return false
  return isGeminiConfigured()
}

function publicOllamaErrorMessage(): string {
  return "지금은 로컬 AI 모델이 잠들어 있는 것 같아요. 잠시 후 다시 시도해 주시거나, 커리어로그/프롬프트 페이지를 직접 둘러봐 주세요."
}

export async function generatePortfolioAnswer(
  systemPrompt: string,
  messages: OllamaChatMessage[],
  latestUserMessage: string
): Promise<PortfolioAnswer> {
  const full: OllamaChatMessage[] = [{ role: "system", content: systemPrompt }, ...messages]

  // Gemini 가 실패하면(무료 한도 소진 포함) 맥미니 Ollama 로 한 번 더 시도한다.
  // Ollama 도 실패하면 Gemini 쪽 안내(언제 다시 열리는지)를 보여 준다.
  let geminiError: string | null = null
  if (shouldUseGemini()) {
    const gemini = await chatWithGemini(full, { temperature: 0.2 })
    if (gemini.ok) return { ok: true, ...gemini.data }
    geminiError = publicGeminiErrorMessage(gemini.error)
  }

  const model = CODE_HINT.test(latestUserMessage) ? CODE_MODEL : GENERAL_MODEL
  const result = await chatWithOllama(model, full, { temperature: 0.2 })
  if (!result.ok) return { ok: false, error: geminiError ?? publicOllamaErrorMessage() }
  return { ok: true, content: result.data.content, model, durationMs: result.data.durationMs }
}
