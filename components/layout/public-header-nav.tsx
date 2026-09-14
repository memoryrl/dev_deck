"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react"
import { AccountMenu } from "@/components/layout/account-menu"
import { BrandMark } from "@/components/layout/brand-mark"
import { PublicMobileNav } from "@/components/layout/public-mobile-nav"
import { MENU_ICON, publicMenus, SCENE_LINE, type MegaId } from "@/components/layout/public-nav-data"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"
import type { SessionUserView } from "@/lib/auth/session-user"
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

function MegaHighlight({
  href,
  photo,
  scene,
  label,
  title,
  body,
  cta,
  icon: Icon,
  onNavigate,
}: {
  href: string
  photo?: string
  scene: SceneId
  label: string
  title: string
  body: string
  cta: string
  icon?: (typeof MENU_ICON)[MegaId]
  onNavigate: () => void
}) {
  const [broken, setBroken] = useState(false)
  const showPhoto = Boolean(photo) && !broken

  useEffect(() => {
    setBroken(false)
  }, [photo])

  return (
    <Link
      href={href}
      className="group relative flex min-h-[17rem] flex-col justify-between overflow-hidden p-6 text-white md:border-r md:border-white/10"
      onClick={onNavigate}
    >
      <div aria-hidden className="absolute inset-0">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo}
            src={photo}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setBroken(true)}
          />
        ) : (
          <div
            className={cn(
              "h-full w-full",
              scene === "prompt" && "bg-[hsl(var(--lux-champagne))]",
              scene === "career" && "bg-[hsl(var(--lux-cognac))]",
              scene === "games" && "bg-[hsl(var(--lux-espresso))]",
              scene === "default" && "bg-foreground"
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-black/25 transition-colors duration-300 group-hover:bg-black/10" />
      </div>
      <div className="relative z-10 drop-shadow-[0_1px_10px_rgba(0,0,0,0.75)]">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/75">
          {Icon ? <Icon className="size-3.5 opacity-80" /> : null}
          {label}
        </p>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">{body}</p>
      </div>
      <p className="relative z-10 mt-8 inline-flex items-center gap-1 text-sm font-semibold text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.75)]">
        {cta}
        <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </p>
    </Link>
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
  account,
  navNodes = [],
}: {
  account: SessionUserView | null
  navNodes?: NavNode[]
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [photos, setPhotos] = useState<Partial<Record<SceneId, string>>>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const owner = Boolean(account?.isOwner)
  const edit = {
    __prompt__: owner ? "/promptkit" : "/login",
    __career__: owner ? "/career" : "/login",
    __steam__: owner ? "/steam" : "/login",
  }
  const nodes = navNodes.length > 0 ? navNodes : fallbackNodes(edit)
  const activeNode = nodes.find((menu) => menu.id === open)
  const staticMega = publicMenus.find((menu) => menu.id === open)
  const scene: SceneId = (open as SceneId) && PHOTO_POOLS[open as SceneId] ? (open as SceneId) : "default"
  const ActiveIcon = MENU_ICON[open as MegaId]
  const photo = photos[scene]
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
          activeNode && "absolute inset-x-0 top-0 z-40",
          drawer && "z-[60]"
        )}
      >
        <PhotoSkin src={photo} scene={scene} />
        <div className="relative z-10 mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
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
            {account ? (
              <div className="ml-1">
                <AccountMenu
                  user={account}
                  showAdminNav
                  onOpen={() => {
                    setOpen(null)
                    setDrawer(false)
                  }}
                />
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-1 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background transition hover:opacity-90"
                onClick={() => setOpen(null)}
              >
                로그인
              </Link>
            )}
            <ThemeToggle className="rounded-full border-0 bg-transparent shadow-none hover:bg-foreground/[0.06]" />
          </nav>
          <div className="flex items-center gap-1 lg:hidden">
            {account ? (
              <AccountMenu
                user={account}
                showAdminNav
                compact
                onOpen={() => {
                  setOpen(null)
                  setDrawer(false)
                }}
              />
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                onClick={() => setOpen(null)}
              >
                로그인
              </Link>
            )}
            <button
              type="button"
              className="relative z-[70] inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-foreground/[0.06]"
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
        </div>

        {activeNode ? (
          <div
            id={`${labelId}-panel`}
            className="relative z-10 hidden lg:block"
            role="region"
            aria-label={activeNode.label}
          >
            <div className="mx-auto max-w-6xl px-5 pb-8 pt-2">
              <div className="grid overflow-hidden rounded-2xl bg-background/70 ring-1 ring-foreground/10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.65fr)]">
                <MegaHighlight
                  href={staticMega ? staticMega.highlight.href : activeNode.children[0]?.href ?? "/"}
                  photo={photo}
                  scene={scene}
                  label={activeNode.label}
                  title={staticMega ? staticMega.highlight.title : activeNode.label}
                  body={staticMega ? staticMega.highlight.body : "연결된 페이지와 게시판으로 이동합니다."}
                  cta={staticMega ? staticMega.highlight.cta : activeNode.children[0]?.label ?? "바로가기"}
                  icon={ActiveIcon}
                  onNavigate={() => setOpen(null)}
                />
                <div className="grid gap-1 p-3 sm:grid-cols-2 sm:p-4">
                  {staticMega
                    ? staticMega.groups.map((group) => (
                        <div key={group.title} className="px-2 py-2">
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
                        <div className="px-2 py-2 sm:col-span-2">
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
      <PublicMobileNav open={drawer} onClose={closeDrawer} account={account} navNodes={nodes} />
    </div>
  )
}
