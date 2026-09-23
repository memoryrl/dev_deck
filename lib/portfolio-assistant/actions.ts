"use server"

import { buildPortfolioBrief } from "@/lib/portfolio-assistant/context"
import { clientIpFromHeaders } from "@/lib/comments/ip"
import { chatWithOllama, type OllamaChatMessage } from "@/lib/ollama/client"
import { checkRateLimitPersistent } from "@/lib/uploads/rate-limit"

const CONTENT_MAX = 1_000
const HISTORY_MAX = 12
// 두 모델 중 코드/프롬프트 관련 질문은 코딩 특화 모델로 보낸다.
const CODE_HINT = /```|코드|함수|버그|에러|타입스크립트|리액트|프롬프트.*(어떻게|뭐)|구현|리팩터/i

const GENERAL_MODEL = "exaone3.5:2.4b"
const CODE_MODEL = "qwen2.5-coder:3b"

export type AskPortfolioResult =
  | { ok: true; content: string; model: string }
  | { ok: false; error: string }

function systemPrompt(brief: string) {
  return [
    "당신은 개인 개발자 포트폴리오 사이트 'DevDeck'의 안내원 챗봇입니다. 당신은 사이트 주인(nckim) 본인이 아닙니다.",
    "규칙:",
    "1. 항상 3인칭으로 안내하세요. '저는/제가' 대신 'nckim님은/이분은'처럼 쓰세요.",
    "2. 아래 '자료'에 적힌 사실만 말하세요. 연차·기간·숫자를 포함해 자료에 없는 내용은 절대 지어내지 마세요.",
    "3. 자료에서 답을 찾을 수 없거나 해당 항목이 '(아직 공개된 항목이 없습니다.)'라고 되어 있으면, 절대 지어내지 말고 '자료에서 확인되지 않는 내용이에요'라고 솔직히 답하세요.",
    "4. 특정 항목을 언급하면, 그 항목 바로 뒤에 자료에 적힌 링크를 괄호에 그대로 옮겨 적으세요. 자료에 없는 링크는 절대 만들지 마세요.",
    "5. 2~4문장, 친절하고 간결한 한국어로 답하세요.",
    "",
    "예시:",
    "질문: 리액트 경험 몇 년이야?",
    "좋은 답변: 자료에 정확한 연차는 나와 있지 않지만, nckim님은 Next.js·React 기반 프로젝트를 여러 건 진행했어요.",
    "나쁜 답변(금지): 저는 3년 이상 리액트를 사용해왔습니다. (1인칭 금지, 없는 숫자 지어내기 금지)",
    "나쁜 답변(금지): 자료에 있는 링크가 아닌 링크를 예시처럼 만들어 적기 (자료에 적힌 링크만 그대로 옮겨 쓰세요)",
    "",
    "## 자료",
    brief,
  ].join("\n")
}

function pickModel(latestUserMessage: string) {
  return CODE_HINT.test(latestUserMessage) ? CODE_MODEL : GENERAL_MODEL
}

function publicOllamaErrorMessage(): string {
  return "지금은 로컬 AI 모델이 잠들어 있는 것 같아요. 잠시 후 다시 시도해 주시거나, 커리어로그/프롬프트 페이지를 직접 둘러봐 주세요."
}

const HALLUCINATION_FALLBACK =
  "죄송해요, 방금 답변이 확실한 자료 없이 나온 것 같아 다시 정리할게요. 이 질문은 자료에서 명확히 확인되지 않아요 — 커리어로그나 프롬프트 목록을 직접 살펴봐 주시면 더 정확해요."

// 작은 로컬 모델은 프롬프트로 지어내지 말라고 해도 종종 그럴듯한 링크를 만들어낸다.
// 그래서 모델이 뱉은 링크를 자료에 실제로 있던 링크 목록과 맞춰 보고, 하나라도 모르는
// 링크(당연히 이 사이트에 없는 https:// 외부 링크 포함)가 섞여 있으면 답 전체를 버린다 —
// 지어낸 링크가 있다는 건 그 옆 설명도 지어냈을 가능성이 높기 때문이다.
function containsHallucinatedLink(content: string, validLinks: string[]): boolean {
  if (/https?:\/\//i.test(content)) return true
  const mentioned = content.match(/\/(?:work|p)\/[\w-]+/g) ?? []
  return mentioned.some((link) => !validLinks.includes(link))
}

export async function askPortfolio(messages: OllamaChatMessage[]): Promise<AskPortfolioResult> {
  const ip = await clientIpFromHeaders()
  if (!(await checkRateLimitPersistent(`portfolio-ask:${ip}`, 10, 5 * 60 * 1000))) {
    return { ok: false, error: "질문을 너무 자주 보냈습니다. 잠시 후 다시 시도해주세요." }
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > HISTORY_MAX) {
    return { ok: false, error: "대화 내용이 올바르지 않습니다." }
  }
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, error: "대화 내용이 올바르지 않습니다." }
    }
    if (typeof m.content !== "string" || !m.content.trim() || m.content.length > CONTENT_MAX) {
      return { ok: false, error: `메시지는 ${CONTENT_MAX}자를 넘을 수 없습니다.` }
    }
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const model = pickModel(lastUser?.content ?? "")
  const brief = await buildPortfolioBrief()

  const result = await chatWithOllama(
    model,
    [{ role: "system", content: systemPrompt(brief.text) }, ...messages],
    { temperature: 0.2 }
  )
  if (!result.ok) return { ok: false, error: publicOllamaErrorMessage() }
  if (containsHallucinatedLink(result.data.content, brief.validLinks)) {
    return { ok: true, content: HALLUCINATION_FALLBACK, model }
  }
  return { ok: true, content: result.data.content, model }
}
