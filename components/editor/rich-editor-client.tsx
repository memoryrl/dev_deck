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
  Italic,
  Link,
  List,
  Paragraph,
  Underline,
  Undo,
} from "ckeditor5"
import translations from "ckeditor5/translations/ko.js"
import { contentToEditorHtml } from "@/lib/content"
import "ckeditor5/ckeditor5.css"

type RichEditorClientProps = {
  name?: string
  defaultValue?: string
  placeholder?: string
}

export function RichEditorClient({
  name = "content",
  defaultValue = "",
  placeholder = "본문을 입력하세요",
}: RichEditorClientProps) {
  const initialHtml = contentToEditorHtml(defaultValue)
  const [html, setHtml] = useState(initialHtml)

  return (
    <div className="rich-editor">
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
            BlockQuote,
            Autoformat,
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
            "blockQuote",
            "codeBlock",
            "|",
            "undo",
            "redo",
          ],
          heading: {
            options: [
              { model: "paragraph", title: "본문", class: "ck-heading_paragraph" },
              { model: "heading2", view: "h2", title: "제목", class: "ck-heading_heading2" },
              { model: "heading3", view: "h3", title: "소제목", class: "ck-heading_heading3" },
            ],
          },
        }}
        onChange={(_event, editor) => {
          setHtml(editor.getData())
        }}
      />
    </div>
  )
}
