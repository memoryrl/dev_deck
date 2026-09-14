"use client"

import { useState } from "react"
import { CKEditor } from "@ckeditor/ckeditor5-react"
import {
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  Code,
  CodeBlock,
  Essentials,
  Heading,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  Paragraph,
  PasteFromOffice,
  Underline,
  Undo,
} from "ckeditor5"
import translations from "ckeditor5/translations/ko.js"
import { contentToEditorHtml } from "@/lib/content"
import { structurePastedClipboard } from "@/lib/editor/paste"
import "ckeditor5/ckeditor5.css"

type RichEditorClientProps = {
  name?: string
  defaultValue?: string
  placeholder?: string
  compact?: boolean
}

export function RichEditorClient({
  name = "content",
  defaultValue = "",
  placeholder = "본문을 입력하세요",
  compact = false,
}: RichEditorClientProps) {
  const initialHtml = contentToEditorHtml(defaultValue)
  const [html, setHtml] = useState(initialHtml)

  return (
    <div className={compact ? "rich-editor rich-editor-compact" : "rich-editor"}>
      <input type="hidden" name={name} value={html} />
      <CKEditor
        editor={ClassicEditor}
        data={initialHtml}
        config={{
          licenseKey: "GPL",
          language: "ko",
          translations: [translations],
          placeholder,
          plugins: [
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Code,
            CodeBlock,
            Link,
            List,
            Indent,
            IndentBlock,
            BlockQuote,
            Autoformat,
            PasteFromOffice,
            Undo,
          ],
          toolbar: [
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "code",
            "|",
            "link",
            "bulletedList",
            "numberedList",
            "outdent",
            "indent",
            "blockQuote",
            "codeBlock",
            "|",
            "undo",
            "redo",
          ],
          indentBlock: {
            offset: 1.5,
            unit: "em",
          },
          heading: {
            options: [
              { model: "paragraph", title: "본문", class: "ck-heading_paragraph" },
              { model: "heading2", view: "h2", title: "제목", class: "ck-heading_heading2" },
              { model: "heading3", view: "h3", title: "소제목", class: "ck-heading_heading3" },
            ],
          },
        }}
        onReady={(editor) => {
          editor.editing.view.document.on(
            "clipboardInput",
            (_event, data: { dataTransfer: { getData: (type: string) => string }; content?: unknown }) => {
              const converted = structurePastedClipboard(
                data.dataTransfer.getData("text/html") ?? "",
                data.dataTransfer.getData("text/plain") ?? ""
              )
              if (!converted) return
              data.content = editor.data.processor.toView(converted)
            },
            { priority: "high" }
          )
        }}
        onChange={(_event, editor) => {
          setHtml(editor.getData())
        }}
      />
    </div>
  )
}
