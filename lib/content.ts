import { marked, Renderer } from "marked"
import sanitizeHtml from "sanitize-html"

const BLOCK_HTML_RE = /^\s*<(p|h[1-6]|ul|ol|li|blockquote|figure|div|pre|table)\b/i

export function looksLikeHtml(value: string) {
  return BLOCK_HTML_RE.test(value)
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

const markdownRenderer = new Renderer()
markdownRenderer.html = ({ text }) => escapeHtml(text)

export function markdownToHtml(value: string) {
  return marked.parse(value, {
    async: false,
    gfm: true,
    breaks: true,
    renderer: markdownRenderer,
  }) as string
}

export function contentToEditorHtml(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (looksLikeHtml(value)) return value
  return markdownToHtml(value)
}

export function plainTextFromContent(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export function isBlankContent(value: string) {
  return plainTextFromContent(value).length === 0
}

export function sanitizeRichHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "img", "figure", "figcaption"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      code: ["class"],
      pre: ["class"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      li: ["style"],
      blockquote: ["style"],
      img: [...sanitizeHtml.defaults.allowedAttributes.img, "class", "style"],
      figure: ["class", "style"],
      figcaption: ["class"],
    },
    allowedStyles: {
      "*": {
        "margin-left": [/^\d+(?:px|em|rem)$/],
        "padding-left": [/^\d+(?:px|em|rem)$/],
        width: [/^\d+(?:\.\d+)?(?:px|%|em|rem)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
  })
}
