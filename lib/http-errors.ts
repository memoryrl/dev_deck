import type { AppLocale } from "@/lib/i18n/config"

export type HttpErrorCopy = {
  reason: string
  title: Record<AppLocale, string>
  lede: Record<AppLocale, string>
}

const HTTP_ERRORS: Record<number, HttpErrorCopy> = {
  400: {
    reason: "Bad Request",
    title: { ko: "잘못된 요청입니다", en: "Bad request" },
    lede: {
      ko: "요청 형식이 올바르지 않아 처리할 수 없습니다. 주소를 확인한 뒤 다시 시도해 주세요.",
      en: "The request could not be understood. Check the address and try again.",
    },
  },
  401: {
    reason: "Unauthorized",
    title: { ko: "로그인이 필요합니다", en: "Sign in required" },
    lede: {
      ko: "이 페이지는 로그인한 회원만 볼 수 있습니다. 로그인 후 다시 와 주세요.",
      en: "This page is for signed-in members. Sign in and try again.",
    },
  },
  403: {
    reason: "Forbidden",
    title: { ko: "접근 권한이 없습니다", en: "Access denied" },
    lede: {
      ko: "계정은 확인되었지만 이 페이지를 볼 권한이 없습니다.",
      en: "You are signed in, but you do not have permission to view this page.",
    },
  },
  404: {
    reason: "Not Found",
    title: { ko: "페이지를 찾을 수 없습니다", en: "Page not found" },
    lede: {
      ko: "주소가 바뀌었거나 글이 없거나 비공개입니다. 홈에서 다시 찾아 주세요.",
      en: "The address may have changed, or the page is missing or private.",
    },
  },
  405: {
    reason: "Method Not Allowed",
    title: { ko: "허용되지 않은 요청 방법입니다", en: "Method not allowed" },
    lede: {
      ko: "이 주소는 지금 쓰신 방식(GET/POST 등)을 받지 않습니다.",
      en: "This address does not accept the HTTP method you used.",
    },
  },
  406: {
    reason: "Not Acceptable",
    title: { ko: "요청한 형식으로 응답할 수 없습니다", en: "Not acceptable" },
    lede: {
      ko: "서버가 클라이언트가 받을 수 있는 형식으로 응답을 만들 수 없습니다.",
      en: "The server cannot produce a response in a format the client accepts.",
    },
  },
  408: {
    reason: "Request Timeout",
    title: { ko: "요청 시간이 초과되었습니다", en: "Request timed out" },
    lede: {
      ko: "요청이 너무 오래 걸려 중단되었습니다. 잠시 후 다시 시도해 주세요.",
      en: "The request took too long. Wait a moment and try again.",
    },
  },
  409: {
    reason: "Conflict",
    title: { ko: "요청이 충돌했습니다", en: "Conflict" },
    lede: {
      ko: "현재 상태와 맞지 않아 요청을 반영할 수 없습니다. 새로고침 후 다시 시도해 주세요.",
      en: "The request conflicts with the current state. Refresh and try again.",
    },
  },
  410: {
    reason: "Gone",
    title: { ko: "더 이상 없는 페이지입니다", en: "This page is gone" },
    lede: {
      ko: "요청한 자원은 의도적으로 제거되었으며 돌아오지 않습니다.",
      en: "This resource was removed on purpose and will not return.",
    },
  },
  411: {
    reason: "Length Required",
    title: { ko: "길이 정보가 필요합니다", en: "Length required" },
    lede: {
      ko: "요청 본문 길이를 알 수 없어 처리를 거부했습니다.",
      en: "The request was refused because its content length was missing.",
    },
  },
  412: {
    reason: "Precondition Failed",
    title: { ko: "사전 조건을 충족하지 못했습니다", en: "Precondition failed" },
    lede: {
      ko: "요청에 붙인 조건이 서버 상태와 맞지 않습니다.",
      en: "A condition on the request did not match the server state.",
    },
  },
  413: {
    reason: "Content Too Large",
    title: { ko: "요청이 너무 큽니다", en: "Request too large" },
    lede: {
      ko: "보내신 파일이나 데이터가 허용 용량을 넘었습니다.",
      en: "The file or payload exceeds the size this server allows.",
    },
  },
  414: {
    reason: "URI Too Long",
    title: { ko: "주소가 너무 깁니다", en: "Address too long" },
    lede: {
      ko: "요청 주소가 너무 길어 처리할 수 없습니다.",
      en: "The request URL is longer than the server can handle.",
    },
  },
  415: {
    reason: "Unsupported Media Type",
    title: { ko: "지원하지 않는 형식입니다", en: "Unsupported media type" },
    lede: {
      ko: "이 형식의 파일이나 본문은 받을 수 없습니다.",
      en: "This file or body type is not supported.",
    },
  },
  416: {
    reason: "Range Not Satisfiable",
    title: { ko: "요청 범위를 맞출 수 없습니다", en: "Range not satisfiable" },
    lede: {
      ko: "요청한 구간이 실제 자원 범위를 벗어났습니다.",
      en: "The requested range is outside the resource.",
    },
  },
  417: {
    reason: "Expectation Failed",
    title: { ko: "기대값을 충족하지 못했습니다", en: "Expectation failed" },
    lede: {
      ko: "요청의 Expect 조건을 서버가 맞출 수 없습니다.",
      en: "The server cannot meet the Expect condition on this request.",
    },
  },
  421: {
    reason: "Misdirected Request",
    title: { ko: "잘못된 서버로 연결되었습니다", en: "Misdirected request" },
    lede: {
      ko: "이 서버는 해당 요청을 처리할 대상이 아닙니다.",
      en: "This server is not able to produce a response for the request.",
    },
  },
  422: {
    reason: "Unprocessable Content",
    title: { ko: "처리할 수 없는 내용입니다", en: "Unprocessable content" },
    lede: {
      ko: "문법은 맞지만 내용이 규칙에 맞지 않아 저장하지 못했습니다.",
      en: "The request was well-formed but failed validation.",
    },
  },
  423: {
    reason: "Locked",
    title: { ko: "자원이 잠겨 있습니다", en: "Locked" },
    lede: {
      ko: "대상이 잠겨 있어 지금은 변경할 수 없습니다.",
      en: "The resource is locked and cannot be changed right now.",
    },
  },
  424: {
    reason: "Failed Dependency",
    title: { ko: "의존한 요청이 실패했습니다", en: "Failed dependency" },
    lede: {
      ko: "앞선 작업이 실패해 이 요청도 진행하지 못했습니다.",
      en: "This request failed because a previous one did not succeed.",
    },
  },
  425: {
    reason: "Too Early",
    title: { ko: "너무 이른 요청입니다", en: "Too early" },
    lede: {
      ko: "연결이 아직 준비되지 않아 요청을 처리하지 않았습니다.",
      en: "The server is unwilling to process this request so early.",
    },
  },
  426: {
    reason: "Upgrade Required",
    title: { ko: "프로토콜 업그레이드가 필요합니다", en: "Upgrade required" },
    lede: {
      ko: "이 요청을 처리하려면 다른 프로토콜로 바꿔야 합니다.",
      en: "The client must switch protocols to continue.",
    },
  },
  428: {
    reason: "Precondition Required",
    title: { ko: "사전 조건이 필요합니다", en: "Precondition required" },
    lede: {
      ko: "조건 헤더 없이 이 요청을 받을 수 없습니다.",
      en: "This request needs a precondition header before it can proceed.",
    },
  },
  429: {
    reason: "Too Many Requests",
    title: { ko: "요청이 너무 잦습니다", en: "Too many requests" },
    lede: {
      ko: "잠시 후에 다시 시도해 주세요. 짧은 시간에 요청이 몰렸습니다.",
      en: "Please wait a moment. Too many requests arrived in a short time.",
    },
  },
  431: {
    reason: "Request Header Fields Too Large",
    title: { ko: "요청 헤더가 너무 큽니다", en: "Request headers too large" },
    lede: {
      ko: "쿠키나 헤더가 너무 커서 요청을 받지 못했습니다.",
      en: "The request headers (including cookies) are too large.",
    },
  },
  451: {
    reason: "Unavailable For Legal Reasons",
    title: { ko: "법적 이유로 제공할 수 없습니다", en: "Unavailable for legal reasons" },
    lede: {
      ko: "법적 요청에 따라 이 내용을 보여 드릴 수 없습니다.",
      en: "This content cannot be shown for legal reasons.",
    },
  },
  500: {
    reason: "Internal Server Error",
    title: { ko: "서버에 문제가 생겼습니다", en: "Something went wrong" },
    lede: {
      ko: "처리 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.",
      en: "The server hit an error. Please try again in a moment.",
    },
  },
  501: {
    reason: "Not Implemented",
    title: { ko: "아직 구현되지 않았습니다", en: "Not implemented" },
    lede: {
      ko: "이 기능은 아직 준비되지 않았습니다.",
      en: "This feature is not implemented yet.",
    },
  },
  502: {
    reason: "Bad Gateway",
    title: { ko: "상위 서버 응답이 실패했습니다", en: "Bad gateway" },
    lede: {
      ko: "외부 서비스 응답이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.",
      en: "An upstream service returned an invalid response. Try again shortly.",
    },
  },
  503: {
    reason: "Service Unavailable",
    title: { ko: "서비스를 잠시 사용할 수 없습니다", en: "Service unavailable" },
    lede: {
      ko: "점검이거나 일시적으로 바쁩니다. 잠시 후 다시 와 주세요.",
      en: "The service is undergoing maintenance or is busy. Please try later.",
    },
  },
  504: {
    reason: "Gateway Timeout",
    title: { ko: "상위 서버 응답이 늦었습니다", en: "Gateway timeout" },
    lede: {
      ko: "외부 서비스가 제시간에 답하지 않았습니다. 잠시 후 다시 시도해 주세요.",
      en: "An upstream service did not respond in time. Try again shortly.",
    },
  },
  505: {
    reason: "HTTP Version Not Supported",
    title: { ko: "HTTP 버전을 지원하지 않습니다", en: "HTTP version not supported" },
    lede: {
      ko: "이 서버는 요청한 HTTP 버전을 쓰지 않습니다.",
      en: "The server does not support the HTTP version in this request.",
    },
  },
  506: {
    reason: "Variant Also Negotiates",
    title: { ko: "콘텐츠 협상에 실패했습니다", en: "Variant also negotiates" },
    lede: {
      ko: "서버 설정 문제로 올바른 콘텐츠를 고르지 못했습니다.",
      en: "Content negotiation failed because of a server configuration issue.",
    },
  },
  507: {
    reason: "Insufficient Storage",
    title: { ko: "저장 공간이 부족합니다", en: "Insufficient storage" },
    lede: {
      ko: "서버에 여유 공간이 없어 요청을 저장하지 못했습니다.",
      en: "The server does not have enough storage to complete the request.",
    },
  },
  508: {
    reason: "Loop Detected",
    title: { ko: "무한 루프가 감지되었습니다", en: "Loop detected" },
    lede: {
      ko: "요청을 처리하다 순환이 발견되어 중단했습니다.",
      en: "The server stopped because it detected an infinite loop.",
    },
  },
  510: {
    reason: "Not Extended",
    title: { ko: "확장이 필요합니다", en: "Not extended" },
    lede: {
      ko: "요청을 처리하려면 추가 확장이 필요합니다.",
      en: "The request needs further extensions before it can be fulfilled.",
    },
  },
  511: {
    reason: "Network Authentication Required",
    title: { ko: "네트워크 인증이 필요합니다", en: "Network authentication required" },
    lede: {
      ko: "이 네트워크를 쓰려면 먼저 인증이 필요합니다.",
      en: "You must authenticate on this network before continuing.",
    },
  },
}

const FALLBACK: HttpErrorCopy = {
  reason: "Error",
  title: { ko: "오류가 발생했습니다", en: "An error occurred" },
  lede: {
    ko: "요청을 처리하는 중 문제가 생겼습니다. 홈으로 돌아가거나 잠시 후 다시 시도해 주세요.",
    en: "Something went wrong while handling the request. Go home or try again shortly.",
  },
}

export const HTTP_ERROR_CODES = Object.keys(HTTP_ERRORS)
  .map(Number)
  .sort((a, b) => a - b)

export function isErrorStatus(status: number) {
  return Number.isInteger(status) && status >= 400 && status <= 599
}

export function parseHttpErrorCode(raw: string | undefined) {
  if (!raw || !/^\d{3}$/.test(raw)) return null
  const status = Number(raw)
  return isErrorStatus(status) ? status : null
}

export function resolveHttpError(status: number, locale: AppLocale) {
  const entry = HTTP_ERRORS[status] ?? FALLBACK
  return {
    status,
    reason: HTTP_ERRORS[status]?.reason ?? (status >= 500 ? "Server Error" : "Client Error"),
    title: entry.title[locale],
    lede: entry.lede[locale],
    known: Boolean(HTTP_ERRORS[status]),
  }
}
