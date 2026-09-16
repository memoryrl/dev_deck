import type { ReactNode } from "react"
import { Suspense } from "react"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-background/80 backdrop-blur" />
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen max-w-full flex-col overflow-x-clip">
      <Suspense fallback={<HeaderFallback />}>
        <PublicHeader />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <PublicFooter />
      </Suspense>
    </div>
  )
}
