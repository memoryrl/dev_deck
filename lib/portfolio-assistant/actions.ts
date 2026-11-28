"use server"

import { recordPortfolioAsk } from "@/lib/portfolio-assistant/admin"
import { buildPortfolioBrief } from "@/lib/portfolio-assistant/context"
import {
  INITIAL_ASK_CYCLES,
  MORE_ASK_CYCLES,
  isAskHistoryCursor,
  listMyPortfolioAskCycles,
  type AskHistoryCursor,
  type PortfolioAskCycle,
} from "@/lib/portfolio-assistant/history"
import { type OllamaChatMessage } from "@/lib/ollama/client"
import { generatePortfolioAnswer } from "@/lib/portfolio-assistant/llm"
import { isOwnerUser } from "@/lib/auth/roles"
import { clientIpFromHeaders } from "@/lib/comments/ip"
import { getAuthUser } from "@/lib/supabase/server"
import { checkRateLimitPersistent } from "@/lib/uploads/rate-limit"

const CONTENT_MAX = 1_000
const GUEST_DAILY_LIMIT = 3
const GUEST_POOL_DAILY_LIMIT = 300
const MEMBER_DAILY_LIMIT = 20
const HISTORY_MAX = 12

export type AskPortfolioResult =
  | { ok: true; content: string; model: string; durationMs: number }
  | { ok: false; error: string; loginRequired?: boolean }

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
  const user = await getAuthUser()
  if (user && !isOwnerUser(user) && !(await checkRateLimitPersistent(`portfolio-ask:${user.id}`, 10, 5 * 60 * 1000))) {
    return { ok: false, error: "질문을 너무 자주 보냈습니다. 잠시 후 다시 시도해주세요." }
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 48) {
    return { ok: false, error: "대화 내용이 올바르지 않습니다." }
  }
  messages = messages.slice(-HISTORY_MAX)
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, error: "대화 내용이 올바르지 않습니다." }
    }
    const max = m.role === "assistant" ? 4_000 : CONTENT_MAX
    if (typeof m.content !== "string" || !m.content.trim() || m.content.length > max) {
      return { ok: false, error: `메시지는 ${CONTENT_MAX}자를 넘을 수 없습니다.` }
    }
  }

  // 하루(KST) 한도. 입력 검증을 통과한 질문만 센다. 관리자는 제한 없음.
  //  - 회원: 한 명당 하루 MEMBER_DAILY_LIMIT번 (한 명이 Gemini 무료 한도를 다 쓰지 못하게)
  //  - 비회원: IP당 GUEST_DAILY_LIMIT번 + 비회원 전체가 함께 GUEST_POOL_DAILY_LIMIT번
  //    (비회원이 몰려도 나머지 무료 한도는 회원 몫으로 남긴다)
  // ponytail: 같은 IP를 쓰는 사무실·통신사 NAT 사용자는 3번을 나눠 쓴다. 더 정확히 막으려면 쿠키를 함께 키로 쓴다.
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
  if (user && !isOwnerUser(user)) {
    if (!(await checkRateLimitPersistent(`portfolio-ask-day:${user.id}:${today}`, MEMBER_DAILY_LIMIT, 86_400_000))) {
      return { ok: false, error: `회원은 하루 ${MEMBER_DAILY_LIMIT}번까지 질문할 수 있어요. 내일 다시 이용해 주세요.` }
    }
  }
  if (!user) {
    const ip = await clientIpFromHeaders()
    if (!(await checkRateLimitPersistent(`portfolio-ask-guest:${ip}:${today}`, GUEST_DAILY_LIMIT, 86_400_000))) {
      return {
        ok: false,
        error: `비회원은 하루 ${GUEST_DAILY_LIMIT}번까지 질문할 수 있어요. 로그인하면 계속 질문할 수 있어요.`,
        loginRequired: true,
      }
    }
    // IP 한도를 통과한 질문만 공동 한도에서 차감한다.
    if (!(await checkRateLimitPersistent(`portfolio-ask-guest-all:${today}`, GUEST_POOL_DAILY_LIMIT, 86_400_000))) {
      return {
        ok: false,
        error: "오늘 비회원 질문이 모두 마감됐어요. 로그인하면 계속 질문할 수 있어요.",
        loginRequired: true,
      }
    }
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const brief = await buildPortfolioBrief()

  const result = await generatePortfolioAnswer(systemPrompt(brief.text), messages, lastUser?.content ?? "")
  if (!result.ok) return { ok: false, error: result.error }
  const model = result.model
  const content = containsHallucinatedLink(result.content, brief.validLinks)
    ? HALLUCINATION_FALLBACK
    : result.content
  if (user) {
    void recordPortfolioAsk({
      userId: user.id,
      question: lastUser?.content ?? "",
      answer: content,
      model,
    })
  }
  return { ok: true, content, model, durationMs: result.durationMs }
}

export type LoadPortfolioAskHistoryResult =
  | { ok: true; cycles: PortfolioAskCycle[]; hasMore: boolean; nextCursor: AskHistoryCursor | null }
  | { ok: false; error: string; loginRequired?: boolean }

/** 회원 본인 대화. 첫 화면은 최근 2사이클, 더보기는 4사이클. */
export async function loadPortfolioAskHistory(
  cursor?: AskHistoryCursor | null,
  limit?: number
): Promise<LoadPortfolioAskHistoryResult> {
  const user = await getAuthUser()
  if (!user) {
    return { ok: false, error: "로그인한 회원만 대화를 볼 수 있습니다.", loginRequired: true }
  }
  if (!(await checkRateLimitPersistent(`portfolio-ask-history:${user.id}`, 30, 60 * 1000))) {
    return { ok: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }
  }

  const size = limit === MORE_ASK_CYCLES ? MORE_ASK_CYCLES : INITIAL_ASK_CYCLES
  const safeCursor = isAskHistoryCursor(cursor) ? cursor : null
  const page = await listMyPortfolioAskCycles({ userId: user.id, limit: size, cursor: safeCursor })
  return { ok: true, ...page }
}
