import { sanitizeRichHtml } from "@/lib/content"
import { createClient } from "@/lib/supabase/server"

const HTML_MAX = 100_000

function cleanStoredHtml(html: string) {
  const cleaned = sanitizeRichHtml(html).trim()
  if (!cleaned || cleaned.length > HTML_MAX) return null
  return cleaned
}

export async function getStoredBoardTemplate(boardId: string, templateId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ai_board_templates")
    .select("html")
    .eq("board_id", boardId)
    .eq("template_id", templateId)
    .maybeSingle()
  if (error || !data) return null
  return cleanStoredHtml(String(data.html ?? ""))
}

export async function storeBoardTemplate(
  boardId: string,
  templateId: string,
  html: string,
  model: string
) {
  const cleaned = cleanStoredHtml(html)
  if (!cleaned) return
  const supabase = await createClient()
  await supabase.from("ai_board_templates").upsert(
    {
      board_id: boardId,
      template_id: templateId,
      html: cleaned,
      model,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "board_id,template_id" }
  )
}
