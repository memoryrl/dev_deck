import { ImageResponse } from "next/og"

export const alt = "DevDeck — Personal Developer Hub"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// 기본 폰트에는 한글 글리프가 없어 문구는 영문으로 둔다. 글별 설명은 og:description이 맡는다.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96, background: "#1c1917", color: "#f5efe6" }}>
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#c4a574" }}>PERSONAL DEVELOPER HUB</div>
        <div style={{ fontSize: 144, fontWeight: 800, marginTop: 16 }}>DevDeck</div>
        <div style={{ width: 120, height: 8, background: "#c4a574", marginTop: 24 }} />
      </div>
    ),
    size
  )
}
