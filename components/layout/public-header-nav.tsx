"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react"
import { BrandMark } from "@/components/layout/brand-mark"
import { PublicMobileNav } from "@/components/layout/public-mobile-nav"
import { MENU_ICON, publicMenus, SCENE_LINE, type MegaId } from "@/components/layout/public-nav-data"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"
import type { NavNode } from "@/types/menu"

type SceneId = MegaId | "default"

const PHOTO_POOLS: Record<SceneId, string[]> = {
  default: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=70",
  ],
  prompt: [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=70",
  ],
  career: [
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=70",
  ],
  games: [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1920&q=70",
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1920&q=70",
  ],
}

const SCENE_TINT: Record<SceneId, string> = {
  default: "bg-transparent",
  prompt: "bg-[hsl(var(--lux-champagne)/0.1)]",
  career: "bg-[hsl(var(--lux-cognac)/0.1)]",
  games: "bg-[hsl(var(--lux-espresso)/0.1)]",
}

function pickPhoto(pool: string[]) {
  return pool[Math.floor(Math.random() * pool.length)]
}

function PhotoSkin({ src, scene }: { src?: string; scene: SceneId }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-[-12px] bg-cover bg-center bg-fixed"
        style={{
          backgroundColor: "hsl(var(--background))",
          backgroundImage: src ? `url("${src}")` : undefined,
        }}
      />
      <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl dark:bg-background/55" />
      <div className={cn("absolute inset-0 transition-colors duration-500", SCENE_TINT[scene])} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  )
}

function fallbackNodes(edit: Record<string, string>): NavNode[] {
  return publicMenus.map((menu) => ({
    id: menu.id,
    label: menu.label,
    href: null,
    children: menu.groups.flatMap((group) =>
      group.links.map((link) => ({
        id: link.href + link.label,
        label: link.label,
        href: edit[link.href as keyof typeof edit] ?? link.href,
        note: link.note,
      }))
    ),
  }))
}

export function PublicHeaderNav({
  signedIn,
  accountHref,
  navNodes = [],
}: {
  signedIn: boolean
  accountHref: string
  navNodes?: NavNode[]
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [photos, setPhotos] = useState<Partial<Record<SceneId, string>>>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const owner = accountHref === "/promptkit"
  const edit = {
    __prompt__: owner ? "/promptkit" : "/login",
    __career__: owner ? "/career" : "/login",
    __steam__: owner ? "/steam" : "/login",
  }
  const nodes = navNodes.length > 0 ? navNodes : fallbackNodes(edit)
  const activeNode = nodes.find((menu) => menu.id === open)
  const staticMega = publicMenus.find((menu) => menu.id === open)
  const scene: SceneId = (open as SceneId) && PHOTO_POOLS[open as SceneId] ? (open as SceneId) : "default"
  const photo = photos[scene]
  const accountLabel = signedIn ? (accountHref === "/promptkit" ? "대시보드" : "내 계정") : "로그인"
  const closeDrawer = useCallback(() => setDrawer(false), [])

  useEffect(() => {
    const next = {
      default: pickPhoto(PHOTO_POOLS.default),
      prompt: pickPhoto(PHOTO_POOLS.prompt),
      career: pickPhoto(PHOTO_POOLS.career),
      games: pickPhoto(PHOTO_POOLS.games),
    }
    setPhotos(next)
    Object.values(next).forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null)
    }
    function onResize() {
      if (window.innerWidth >= 1024) setDrawer(false)
      else setOpen(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", onResize)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "relative",
          activeNode && "absolute inset-x-0 top-0 z-40"
        )}
      >
        <PhotoSkin src={photo} scene={scene} />
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" onClick={() => setOpen(null)}>
            <BrandMark />
          </Link>
          <nav className="hidden items-center justify-end gap-1 lg:flex">
            {nodes.map((menu) => {
              const expanded = open === menu.id
              const Icon = MENU_ICON[menu.id as MegaId]
              if (menu.href && menu.children.length === 0) {
                return (
                  <Link
                    key={menu.id}
                    href={menu.href}
                    className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                    onClick={() => setOpen(null)}
                  >
                    {menu.label}
                  </Link>
                )
              }
              return (
                <button
                  key={menu.id}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
                    expanded && "bg-foreground/[0.08] text-foreground"
                  )}
                  aria-expanded={expanded}
                  aria-controls={`${labelId}-panel`}
                  onClick={() => setOpen(expanded ? null : menu.id)}
                >
                  {Icon ? <Icon className="size-3.5 opacity-70" /> : null}
                  {menu.label}
                  <ChevronDown className={cn("size-3.5 opacity-50 transition-transform", expanded && "rotate-180")} />
                </button>
              )
            })}
            <Link
              href={accountHref}
              className="ml-1 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background transition hover:opacity-90"
              onClick={() => setOpen(null)}
            >
              {accountLabel}
            </Link>
            <ThemeToggle className="rounded-full border-0 bg-transparent shadow-none hover:bg-foreground/[0.06]" />
          </nav>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-foreground/[0.06] lg:hidden"
            aria-expanded={drawer}
            aria-controls="public-mobile-nav"
            aria-label={drawer ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => {
              setOpen(null)
              setDrawer((value) => !value)
            }}
          >
            {drawer ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {activeNode ? (
          <div
            id={`${labelId}-panel`}
            className="relative z-10 hidden lg:block"
            role="region"
            aria-label={activeNode.label}
          >
            <div className="mx-auto grid max-w-6xl gap-6 px-5 pb-8 pt-1 md:grid-cols-[minmax(0,1.15fr)_repeat(2,minmax(0,1fr))]">
              <Link
                href={staticMega ? staticMega.highlight.href : activeNode.children[0]?.href ?? "/"}
                className="group rounded-2xl bg-background/70 p-5 ring-1 ring-foreground/8 transition hover:bg-background/85 hover:ring-foreground/12"
                onClick={() => setOpen(null)}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {activeNode.label}
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
                  {staticMega ? staticMega.highlight.title : activeNode.label}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {staticMega ? staticMega.highlight.body : "연결된 페이지와 게시판으로 이동합니다."}
                </p>
                <p className="mt-5 inline-flex items-center gap-1 text-sm font-medium">
                  {staticMega ? staticMega.highlight.cta : activeNode.children[0]?.label ?? "바로가기"}
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </p>
              </Link>
              {staticMega
                ? staticMega.groups.map((group) => (
                    <div key={group.title} className="pt-1">
                      <p className="px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {group.title}
                      </p>
                      <ul className="mt-2 space-y-0.5">
                        {group.links.map((link) => (
                          <li key={link.href + link.label}>
                            <Link
                              href={edit[link.href as keyof typeof edit] ?? link.href}
                              className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/[0.05]"
                              onClick={() => setOpen(null)}
                            >
                              <span className="text-sm font-medium">{link.label}</span>
                              {link.note ? (
                                <span className="mt-0.5 block text-xs text-muted-foreground">{link.note}</span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                : (
                    <div className="pt-1 md:col-span-2">
                      <p className="px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        바로가기
                      </p>
                      <ul className="mt-2 space-y-0.5">
                        {activeNode.children.map((link) => (
                          <li key={link.id}>
                            <Link
                              href={link.href}
                              className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/[0.05]"
                              onClick={() => setOpen(null)}
                            >
                              <span className="text-sm font-medium">{link.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0",
            staticMega
              ? SCENE_LINE[staticMega.id]
              : activeNode
                ? SCENE_LINE.prompt
                : "h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
          )}
        />
      </div>
      {activeNode ? (
        <div className="invisible px-5 py-3" aria-hidden>
          <BrandMark />
        </div>
      ) : null}
      <PublicMobileNav
        open={drawer}
        onClose={closeDrawer}
        signedIn={signedIn}
        accountHref={accountHref}
        navNodes={nodes}
      />
    </div>
  )
}
