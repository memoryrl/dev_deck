import type { ReactNode } from "react"
import { Suspense } from "react"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background/80 backdrop-blur" />
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
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
