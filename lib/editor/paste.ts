const LIST_LINE_RE = /^([ \t]*)(?:([•·‣○●▪▫*+-])|(\d+)[.)])\s+(.*)$/

type Block =
  | { type: "blank" }
  | { type: "p"; indent: number; html: string }
  | { type: "li"; indent: number; list: "ul" | "ol"; html: string }

function indentWidth(prefix: string) {
  let width = 0
  for (const char of prefix) width += char === "\t" ? 2 : 1
  return width
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function stripTagsToText(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
}

function looksLikeStructuredListText(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  return lines.filter((line) => LIST_LINE_RE.test(line)).length >= 1
}

function stripLeadingListMarker(innerHtml: string) {
  return innerHtml.replace(
    /^((?:\s|&nbsp;|<br\s*\/?>)*)((?:<[^>]+>)*)\s*(?:[•·‣○●▪▫*+-]|\d+[.)])\s+/i,
    "$1$2"
  )
}

function parseLine(line: string, htmlBody?: string): Block {
  const normalized = line.replace(/\u00a0/g, " ")
  if (!normalized.trim()) return { type: "blank" }

  const match = normalized.match(LIST_LINE_RE)
  if (!match) {
    const prefix = normalized.match(/^[ \t]*/)?.[0] ?? ""
    return {
      type: "p",
      indent: indentWidth(prefix),
      html: htmlBody?.trim() ? htmlBody : escapeHtml(normalized.trim()),
    }
  }

  return {
    type: "li",
    indent: indentWidth(match[1]),
    list: match[2] ? "ul" : "ol",
    html: htmlBody != null ? stripLeadingListMarker(htmlBody) : escapeHtml(match[4]),
  }
}

function closeLists(html: string[], stack: Array<{ list: "ul" | "ol" }>) {
  while (stack.length) {
    html.push("</li>", `</${stack.pop()!.list}>`)
  }
}

function nestBulletsUnderNumberedItems(blocks: Block[]) {
  let lastOlIndent: number | null = null
  return blocks.map((block) => {
    if (block.type === "p") {
      lastOlIndent = null
      return block
    }
    if (block.type === "blank") return block
    if (block.list === "ol") {
      lastOlIndent = block.indent
      return block
    }
    if (lastOlIndent != null && block.indent <= lastOlIndent) {
      return { ...block, indent: lastOlIndent + 1 }
    }
    return block
  })
}

function renderBlocks(blocks: Block[]) {
  const html: string[] = []
  const stack: Array<{ indent: number; list: "ul" | "ol" }> = []

  for (const block of nestBulletsUnderNumberedItems(blocks)) {
    if (block.type === "blank") {
      closeLists(html, stack)
      continue
    }

    if (block.type === "p") {
      const parent = stack[stack.length - 1]
      if (parent && block.indent > parent.indent) {
        html.push(`<br>${block.html}`)
        continue
      }
      closeLists(html, stack)
      html.push(`<p>${block.html}</p>`)
      continue
    }

    if (!stack.length || block.indent > stack[stack.length - 1].indent) {
      html.push(`<${block.list}><li>${block.html}`)
      stack.push({ indent: block.indent, list: block.list })
      continue
    }

    while (stack.length && stack[stack.length - 1].indent > block.indent) {
      html.push("</li>", `</${stack.pop()!.list}>`)
    }

    const current = stack[stack.length - 1]
    if (!current || current.indent < block.indent) {
      html.push(`<${block.list}><li>${block.html}`)
      stack.push({ indent: block.indent, list: block.list })
      continue
    }

    if (current.list !== block.list) {
      html.push("</li>", `</${current.list}>`)
      stack.pop()
      html.push(`<${block.list}><li>${block.html}`)
      stack.push({ indent: block.indent, list: block.list })
      continue
    }

    html.push("</li>", `<li>${block.html}`)
  }

  closeLists(html, stack)
  return html.join("")
}

function paragraphInners(html: string) {
  const inners: string[] = []
  const pattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) {
    inners.push(match[1])
  }
  return inners
}

export function pastedPlainTextToHtml(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").split("\n")
  if (!looksLikeStructuredListText(lines.join("\n"))) return null
  return renderBlocks(lines.map((line) => parseLine(line)))
}

export function structurePastedClipboard(html: string, plain: string) {
  const sourceText = (plain || stripTagsToText(html)).replace(/\r\n/g, "\n").replace(/\u00a0/g, " ")
  if (!looksLikeStructuredListText(sourceText)) return null
  if (/<(ul|ol|table|pre)\b/i.test(html)) return null
  if (/class=["']?Mso|xmlns:o=|office:word/i.test(html)) return null

  const lines = sourceText.split("\n")
  const inners = paragraphInners(html)
  const contentLines = lines.filter((line) => line.trim())

  if (inners.length && inners.length === contentLines.length) {
    let index = 0
    const blocks = lines.map((line) => {
      if (!line.trim()) return parseLine(line)
      const inner = inners[index]
      index += 1
      return parseLine(line, inner)
    })
    return renderBlocks(blocks)
  }

  return pastedPlainTextToHtml(sourceText)
}
