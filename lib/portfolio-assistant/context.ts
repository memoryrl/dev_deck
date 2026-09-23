// "포트폴리오에게 물어보기"에 근거 자료로 넣을 요약본. 공개된 커리어·스킬·프롬프트를
// 통째로 압축해서 매 요청 컨텍스트에 넣는다 — 개인 포트폴리오 콘텐츠 규모(수십 건)면
// 검색 없이 전량을 넣는 쪽이 놓치는 항목 없이 더 단순하고 정확하다.
// ponytail: 항목이 수백 건 넘게 늘어나면 이 방식은 컨텍스트 길이에 부딪힌다 —
// 그때는 listCareerPostsPage 의 ilikeContains 검색으로 질문 연관 항목만 추리도록 바꿀 것.
import { listPublicCareerPosts, listPublicCareerSkills } from "@/lib/career/public"
import { listPublicPrompts } from "@/lib/prompts/public"
import { MEMORY_TTL, withMemoryCache } from "@/lib/cache/memory"
import { formatPeriod } from "@/lib/utils"

const MAX_ITEMS = 60
const EXCERPT_MAX = 160

function trim(text: string | null | undefined, max: number) {
  const clean = (text ?? "").trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export type PortfolioBrief = {
  text: string
  /** 자료에 실제로 등장하는 링크 — 모델이 답변에 이 목록에 없는 링크를 지어내면 걸러낸다. */
  validLinks: string[]
}

// 작은 로컬 모델은 섹션이 통째로 빠져 있으면(왜 비었는지 모르니) 그럴듯한 내용을 지어내는
// 경향이 있다 — "자료 없음"을 명시적으로 적어서, 비어 있다는 사실 자체를 근거로 준다.
function section(title: string, lines: string[]) {
  return `## ${title}\n${lines.length ? lines.join("\n") : "(아직 공개된 항목이 없습니다.)"}`
}

export async function buildPortfolioBrief(): Promise<PortfolioBrief> {
  return withMemoryCache("portfolio-assistant:brief", MEMORY_TTL.publicList, async () => {
    const [posts, skills, prompts] = await Promise.all([
      listPublicCareerPosts(MAX_ITEMS),
      listPublicCareerSkills(MAX_ITEMS),
      listPublicPrompts(MAX_ITEMS),
    ])

    const validLinks = [...posts.map((post) => `/work/${post.id}`), ...prompts.map((prompt) => `/p/${prompt.id}`)]

    const careerLines = posts.map((post) => {
      const period = formatPeriod(post.period_start, post.period_end)
      const bits = [post.company, post.role, period].filter(Boolean).join(" · ")
      const tags = [...(post.skills ?? []), ...(post.tags ?? [])].join(", ")
      return `- [${post.post_type}] ${post.title}${bits ? ` (${bits})` : ""} — ${trim(post.excerpt, EXCERPT_MAX)}${tags ? ` [태그: ${tags}]` : ""} (링크: /work/${post.id})`
    })

    const skillLines = skills.map((skill) => {
      const bits = [skill.category, skill.proficiency, skill.years ? `${skill.years}년` : null].filter(Boolean).join(" · ")
      return `- ${skill.name}${bits ? ` (${bits})` : ""}${skill.summary ? ` — ${trim(skill.summary, EXCERPT_MAX)}` : ""}`
    })

    const promptLines = prompts.map((prompt) => {
      const tags = (prompt.tags ?? []).join(", ")
      return `- ${prompt.title} (${prompt.category})${tags ? ` [태그: ${tags}]` : ""} (링크: /p/${prompt.id})`
    })

    const text = [
      section("커리어·프로젝트", careerLines),
      section("스킬", skillLines),
      section("공개 AI 프롬프트", promptLines),
    ].join("\n\n")

    return { text, validLinks }
  })
}
