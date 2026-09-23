// 게시판별 AI 템플릿 카탈로그(고정 데이터, 클라이언트에서도 그대로 씀). 추천 목록은
// 즉시·안정적으로 여기서 보여주고, AI는 고른 템플릿의 섹션별 본문만 채운다 — 실제 생성
// 로직(HTML 조립 등)은 lib/boards/ai-template-generate.ts 에 있다(서버 전용 의존성 분리).

export type BoardTemplateSectionKind = "lead" | "field" | "list" | "prose" | "note"

export type BoardTemplateSection = {
  /** 본문에 들어갈 섹션 제목(표 머리·소제목). */
  heading: string
  /** AI에게 이 섹션에 뭘 채울지 알려주는 한 줄 힌트. */
  hint: string
  /** HTML 조립 방식. 없으면 prose. */
  kind?: BoardTemplateSectionKind
}

export type BoardTemplateOption = {
  id: string
  label: string
  description: string
  sections: BoardTemplateSection[]
}

const NOTICE_TEMPLATES: BoardTemplateOption[] = [
  {
    id: "maintenance",
    label: "정기 점검 안내",
    description: "점검 일시와 영향 범위를 안내합니다.",
    sections: [
      {
        heading: "안내 개요",
        kind: "lead",
        hint: "서비스 안정화 점검을 알리는 도입 2~3문장. 일정·범위는 아래 칸에서 고친다고 안내",
      },
      {
        heading: "점검 일시",
        kind: "field",
        hint: "YYYY년 M월 D일 HH:MM ~ HH:MM 형식의 자리 표시. 실제 날짜를 지어내지 말 것",
      },
      {
        heading: "대상 서비스",
        kind: "field",
        hint: "점검 대상 서비스/화면을 한 줄로 (예: 웹·앱 로그인 및 결제)",
      },
      { heading: "점검 사유", kind: "field", hint: "인프라/보안/기능 배포 등 점검 목적을 정중하게 한두 문장" },
      {
        heading: "영향 범위",
        kind: "list",
        hint: "이용 불가 항목 3~4개를 | 로 구분 (로그인, 결제, 알림 등 자리 표시)",
      },
      { heading: "문의", kind: "note", hint: "담당 채널과 응대 시간을 자리 표시로 (예: 사이트 하단 메일)" },
    ],
  },
  {
    id: "update",
    label: "업데이트 소식",
    description: "새로 바뀐 기능이나 개선 사항을 알립니다.",
    sections: [
      { heading: "이번 업데이트", kind: "lead", hint: "무엇이 바뀌었는지 한 줄 요약 + 이용자에게 미치는 영향 한 문장" },
      {
        heading: "주요 변경 사항",
        kind: "list",
        hint: "기능/개선/수정 항목 4개를 | 로 구분. 각 항목은 '무엇 → 어떻게 달라짐' 형식",
      },
      { heading: "이용 방법", kind: "prose", hint: "어디서 확인하고 어떻게 쓰면 되는지 2~3문장. 메뉴 경로는 자리 표시" },
      { heading: "참고", kind: "note", hint: "구버전 호환, 재로그인 필요 여부 등 한두 문장" },
    ],
  },
  {
    id: "event",
    label: "이벤트 공지",
    description: "이벤트나 행사 소식을 안내합니다.",
    sections: [
      { heading: "이벤트 소개", kind: "lead", hint: "행사 취지와 대상을 2~3문장으로. 실명·실제 경품을 지어내지 말 것" },
      { heading: "진행 기간", kind: "field", hint: "YYYY년 M월 D일 ~ M월 D일 형식의 자리 표시" },
      { heading: "참여 대상", kind: "field", hint: "회원/방문자 등 대상 조건을 한 줄로" },
      { heading: "참여 방법", kind: "list", hint: "단계 3~4개를 | 로 구분 (신청 → 참여 → 확인)" },
      { heading: "유의사항", kind: "note", hint: "중복 참여, 일정 변경 가능성을 한두 문장" },
    ],
  },
]

const FREE_TEMPLATES: BoardTemplateOption[] = [
  {
    id: "review",
    label: "후기 공유",
    description: "써본 것에 대한 후기 글 뼈대를 만듭니다.",
    sections: [
      { heading: "한줄 소개", kind: "lead", hint: "후기 대상과 사용 맥락을 2문장으로. 제품명·점수는 자리 표시" },
      { heading: "무엇을 써봤나요", kind: "prose", hint: "사용 환경(기기/기간/목적)을 적을 자리 2~3문장" },
      { heading: "좋았던 점", kind: "list", hint: "장점 3~4개를 | 로. 각 항목은 한 문장" },
      { heading: "아쉬웠던 점", kind: "list", hint: "단점 3개를 | 로. 감정보다 구체 상황" },
      { heading: "총평", kind: "prose", hint: "누구에게 추천하는지 포함해 2문장" },
    ],
  },
  {
    id: "question",
    label: "질문",
    description: "궁금한 점을 물어보는 글 뼈대를 만듭니다.",
    sections: [
      { heading: "상황", kind: "lead", hint: "지금 막힌 맥락을 2~3문장. 스택/환경은 자리 표시" },
      { heading: "궁금한 점", kind: "list", hint: "질문 2~3개를 | 로. 각 항목은 한 문장 질문" },
      { heading: "시도해 본 것", kind: "list", hint: "이미 해본 조치 2~3개를 | 로" },
      { heading: "기대하는 답", kind: "note", hint: "어떤 형태의 답을 원하는지 한 문장" },
    ],
  },
  {
    id: "tip",
    label: "팁 공유",
    description: "알게 된 유용한 정보를 정리합니다.",
    sections: [
      { heading: "핵심 요약", kind: "lead", hint: "한 줄 결론 + 왜 유용한지 한 문장" },
      { heading: "적용 절차", kind: "list", hint: "따라 할 단계 4개를 | 로" },
      { heading: "자세한 내용", kind: "prose", hint: "원리나 배경을 2~3문장" },
      { heading: "주의", kind: "note", hint: "환경 차이, 부작용을 한두 문장" },
    ],
  },
]

const SKILLS_TEMPLATES: BoardTemplateOption[] = [
  {
    id: "skill-summary",
    label: "기술 정리",
    description: "보유 기술 하나를 소개하는 글 뼈대를 만듭니다.",
    sections: [
      { heading: "개요", kind: "lead", hint: "기술명(자리 표시)과 다루는 이유를 2문장" },
      { heading: "숙련 범위", kind: "field", hint: "사용 기간·역할 수준을 자리 표시로 한 줄" },
      { heading: "경험", kind: "list", hint: "프로젝트에서 한 일 3개를 | 로. 성과 숫자는 자리 표시" },
      { heading: "배운 점", kind: "prose", hint: "다음 프로젝트에 남길 교훈 2문장" },
    ],
  },
]

const DEFAULT_TEMPLATES: BoardTemplateOption[] = [
  {
    id: "intro",
    label: "소개 글",
    description: "이 주제를 처음 소개하는 글 뼈대를 만듭니다.",
    sections: [
      { heading: "소개", kind: "lead", hint: "무엇에 대한 글인지 2문장" },
      { heading: "핵심 내용", kind: "list", hint: "전달할 포인트 3개를 | 로" },
      { heading: "자세한 내용", kind: "prose", hint: "각 포인트를 풀어 쓸 자리 2~3문장" },
      { heading: "마무리", kind: "note", hint: "다음에 할 일이나 연락 한 문장" },
    ],
  },
  {
    id: "notice-generic",
    label: "안내문",
    description: "공지성 안내 글 뼈대를 만듭니다.",
    sections: [
      { heading: "안내 내용", kind: "lead", hint: "무엇을 왜 안내하는지 2문장" },
      { heading: "적용 일시", kind: "field", hint: "YYYY년 M월 D일 형식의 자리 표시" },
      { heading: "대상", kind: "field", hint: "누구에게 해당하는지 한 줄" },
      { heading: "조치 사항", kind: "list", hint: "이용자가 할 일 3개를 | 로" },
      { heading: "문의", kind: "note", hint: "연락 채널 자리 표시" },
    ],
  },
]

const CATALOG: Record<string, BoardTemplateOption[]> = {
  notice: NOTICE_TEMPLATES,
  free: FREE_TEMPLATES,
  skills: SKILLS_TEMPLATES,
}

export function templatesForBoard(slug: string): BoardTemplateOption[] {
  return CATALOG[slug] ?? DEFAULT_TEMPLATES
}

export function findBoardTemplate(slug: string, templateId: string): BoardTemplateOption | null {
  return templatesForBoard(slug).find((option) => option.id === templateId) ?? null
}
