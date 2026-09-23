// AI 템플릿 생성 로직(서버 전용) — 프롬프트 구성과 모델 응답을 HTML로 조립한다.
// 카탈로그(고정 데이터)는 lib/boards/ai-templates.ts, 클라이언트도 그걸 그대로 쓴다.
import { escapeHtml } from "@/lib/content"
import type { BoardTemplateOption, BoardTemplateSection } from "@/lib/boards/ai-templates"

/** AI에게 보낼 프롬프트. 마크업은 시키지 않는다 — "섹션 제목: 내용"만 받아서
 *  HTML은 코드가 직접 만든다(모델이 태그를 깨뜨릴 걱정이 없다). */
export function buildTemplatePrompt(board: { name: string; description: string | null }, template: BoardTemplateOption) {
  return [
    `게시판: ${board.name}${board.description ? `(${board.description})` : ""}`,
    `문서 종류: ${template.label} — ${template.description}`,
    "사내 공지·업무 양식처럼 정중하고 구체적인 한국어 초안을 쓰세요. 칸마다 다른 정보를 넣고 같은 문장을 반복하지 마세요.",
    "추상적인 '안내드립니다'만 쓰지 말고, 대상·일정·조치·연락 채널을 문장에 넣으세요.",
    "실제 사건·고유명사·확정 날짜를 지어내지 마세요. 날짜는 'YYYY년 M월 D일 HH:MM', 이름은 '[담당자]', 수치는 '[N]'처럼 자리 표시로 두세요.",
    "형식은 반드시 '섹션 제목: 내용' — 인사말·맺음말·마크다운·이모지는 쓰지 마세요.",
    "lead/prose/note 는 2~4문장. field 는 표 칸에 들어갈 한두 문장. list 는 항목을 | 로 구분해 3~5개.",
    "",
    ...template.sections.map((section) => {
      const kind = section.kind ?? "prose"
      return `- ${section.heading} [${kind}]: ${section.hint}`
    }),
  ].join("\n")
}

const FALLBACK_SECTION_TEXT = "(직접 내용을 채워 주세요.)"
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/gu

function cleanModelText(text: string): string {
  return text
    .replace(EMOJI_RE, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^[-*#\s]+/, "")
    .replace(/[*#\s]+$/, "")
    .trim()
}

function matchSection(candidate: string, sections: BoardTemplateOption["sections"]) {
  const normalized = cleanModelText(candidate)
  if (!normalized || normalized.length > 30) return null
  return (
    sections.find((s) => s.heading === normalized) ??
    sections.find((s) => normalized.includes(s.heading) || s.heading.includes(normalized)) ??
    null
  )
}

function splitListItems(text: string): string[] {
  const cleaned = text.trim()
  if (!cleaned) return []
  const pipe = cleaned.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean)
  if (pipe.length >= 2) return pipe
  const numbered = cleaned
    .split(/(?:^|[;\n]|[ \t]+(?:[-–•]|\d+[.)]))\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
  if (numbered.length >= 2) return numbered
  return [cleaned]
}

function paragraphs(text: string): string[] {
  const parts = text
    .split(/(?<=[.?!。])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2 && parts.every((part) => part.length < 160)) return parts
  return [text]
}

function renderLead(text: string) {
  return paragraphs(text)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("")
}

function renderProse(heading: string, text: string) {
  return `<h3>${escapeHtml(heading)}</h3>${paragraphs(text)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("")}`
}

function renderList(heading: string, text: string) {
  const items = splitListItems(text)
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
  return `<h3>${escapeHtml(heading)}</h3><ul>${lis}</ul>`
}

function renderNote(heading: string, text: string) {
  return `<h3>${escapeHtml(heading)}</h3><blockquote><p>${escapeHtml(text)}</p></blockquote>`
}

function renderFieldTable(rows: { heading: string; text: string }[]) {
  const body = rows
    .map(
      (row) =>
        `<tr><th>${escapeHtml(row.heading)}</th><td>${escapeHtml(row.text)}</td></tr>`
    )
    .join("")
  return `<figure class="table"><table><tbody>${body}</tbody></table></figure>`
}

function sectionText(
  section: BoardTemplateSection,
  buffers: Map<string, string[]>
) {
  const parts = buffers.get(section.heading)
  return parts && parts.length ? parts.join(" ") : FALLBACK_SECTION_TEXT
}

/**
 * 모델 응답을 문서형 HTML로 조립한다. 모델이 "제목: 내용"을 한 줄에 안 쓰고 제목 줄과 내용
 * 줄을 나누는 경우가 흔해서, 알고 있는 섹션 제목이 나오면 다음 제목 전까지를 그 섹션으로 묶는다.
 */
export function composeTemplateHtml(template: BoardTemplateOption, modelOutput: string): string {
  const lines = modelOutput.split("\n").map((line) => line.trim())
  const buffers = new Map<string, string[]>()
  let current: string | null = null

  for (const line of lines) {
    if (!line) continue
    const headingLine = line.match(/^[-*#\s]*\*{0,2}(.{1,40}?)\*{0,2}\s*[:：]\s*(.*)$/)
    const matched = headingLine ? matchSection(headingLine[1], template.sections) : null

    if (matched) {
      current = matched.heading
      const inline = cleanModelText(headingLine![2])
      buffers.set(current, inline ? [inline] : [])
      continue
    }
    if (current) {
      const text = cleanModelText(line)
      if (text) buffers.get(current)!.push(text)
    }
  }

  const blocks: string[] = [`<h2>${escapeHtml(template.label)}</h2>`]
  const sections = template.sections
  let index = 0
  while (index < sections.length) {
    const section = sections[index]
    const kind = section.kind ?? "prose"
    const text = sectionText(section, buffers)

    if (kind === "field") {
      const rows = []
      while (index < sections.length && (sections[index].kind ?? "prose") === "field") {
        rows.push({ heading: sections[index].heading, text: sectionText(sections[index], buffers) })
        index += 1
      }
      blocks.push(renderFieldTable(rows))
      continue
    }

    if (kind === "lead") blocks.push(renderLead(text))
    else if (kind === "list") blocks.push(renderList(section.heading, text))
    else if (kind === "note") blocks.push(renderNote(section.heading, text))
    else blocks.push(renderProse(section.heading, text))
    index += 1
  }

  return blocks.join("")
}
