"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight } from "lucide-react"
import { isActiveHref, pickActiveHref } from "@/lib/menus/active"
import { cn } from "@/lib/utils"

export type FooterColumn = {
  title: string
  links: { href: string; label: string }[]
}

// 푸터 본체는 서버 컴포넌트라 현재 경로를 모른다 — 링크 목록만 클라이언트에서 그려
// 페이지를 옮겨도 푸터 전체를 다시 만들지 않고 활성 링크만 갱신한다.
export function FooterNav({ columns }: { columns: FooterColumn[] }) {
  const pathname = usePathname()
  const activeHref = pickActiveHref(
    pathname,
    columns.flatMap((column) => column.links.map((link) => link.href))
  )

  return (
    <nav className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(7.5rem,max-content))] justify-items-start gap-x-10 gap-y-8">
      {columns.map((column) => (
        <div key={column.title}>
          <p className="text-sm font-semibold">{column.title}</p>
          <ul className="mt-3 space-y-2">
            {column.links.map((link) => {
              const current = isActiveHref(activeHref, link.href)
              return (
                <li key={`${column.title}-${link.label}`}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
                      current && "font-bold text-foreground"
                    )}
                  >
                    <ArrowUpRight
                      className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
