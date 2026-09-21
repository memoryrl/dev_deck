/** html이 overflow-x clip이면 스크롤 컨테이너가 html이라 body만 hidden해도 배경이 움직인다. */
export function lockDocumentScroll() {
  const html = document.documentElement
  const body = document.body
  const prevHtmlOverflow = html.style.overflow
  const prevBodyOverflow = body.style.overflow
  const prevOverscroll = html.style.overscrollBehavior
  html.style.overflow = "hidden"
  body.style.overflow = "hidden"
  html.style.overscrollBehavior = "none"
  return () => {
    html.style.overflow = prevHtmlOverflow
    body.style.overflow = prevBodyOverflow
    html.style.overscrollBehavior = prevOverscroll
  }
}
