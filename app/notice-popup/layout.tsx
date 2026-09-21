import type { ReactNode } from "react"

export default function NoticePopupLayout({ children }: { children: ReactNode }) {
  return <div className="flex h-dvh flex-col overflow-hidden bg-background">{children}</div>
}
