"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronDown, Globe } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { applyAppLanguage } from "@/lib/i18n/apply-language"
import { buildUrlWithLangParam, SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"

const LANGUAGE_META: Record<AppLocale, { flag: string; labelKey: string }> = {
  ko: { flag: "🇰🇷", labelKey: "language.ko" },
  en: { flag: "🇺🇸", labelKey: "language.en" },
}

type MenuPos = {
  top?: number
  bottom?: number
  left: number
  minWidth: number
}

export function LanguageSwitcher({
  compact = false,
  fullWidth = false,
  menuPlacement = "down",
  className,
}: {
  compact?: boolean
  fullWidth?: boolean
  menuPlacement?: "down" | "up"
  className?: string
}) {
  const { locale, t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)

  const options = useMemo(
    () =>
      SUPPORTED_LOCALES.map((code) => ({
        code,
        flag: LANGUAGE_META[code].flag,
        label: t(LANGUAGE_META[code].labelKey),
      })),
    [t]
  )

  const updateMenuPos = useCallback(() => {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = 6
    const minWidth = Math.max(compact ? 160 : 140, rect.width)
    const preferredLeft = compact ? rect.right - minWidth : rect.left
    const left = Math.min(Math.max(8, preferredLeft), window.innerWidth - minWidth - 8)
    if (menuPlacement === "up") {
      setMenuPos({
        bottom: window.innerHeight - rect.top + gap,
        left,
        minWidth,
      })
      return
    }
    setMenuPos({
      top: rect.bottom + gap,
      left,
      minWidth,
    })
  }, [compact, menuPlacement])

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPos()
    window.addEventListener("resize", updateMenuPos)
    window.addEventListener("scroll", updateMenuPos, true)
    return () => {
      window.removeEventListener("resize", updateMenuPos)
      window.removeEventListener("scroll", updateMenuPos, true)
    }
  }, [open, updateMenuPos])

  const handleSelect = useCallback(
    (lang: AppLocale) => {
      setOpen(false)
      if (lang === locale) return
      applyAppLanguage(lang)
      const next = buildUrlWithLangParam(pathname, window.location.search, lang)
      router.replace(next)
      router.refresh()
    },
    [locale, pathname, router]
  )

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const menu =
    open && mounted && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={t("language.switchAria")}
            className="fixed z-[200] min-w-[9rem] overflow-hidden rounded-lg border border-foreground/10 bg-popover py-0.5 text-popover-foreground shadow-lg"
            style={{
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
            }}
          >
            {options.map((option) => {
              const selected = option.code === locale
              return (
                <li key={option.code} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs hover:bg-foreground/[0.05]",
                      selected && "font-semibold"
                    )}
                    onClick={() => handleSelect(option.code)}
                  >
                    <span aria-hidden>{option.flag}</span>
                    <span className="flex-1">{option.label}</span>
                    {selected ? <Check className="size-3 opacity-70" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body
        )
      : null

  return (
    <div ref={rootRef} className={cn("relative", fullWidth && "w-full", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.switchAria")}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center rounded-full text-[11px] font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
          compact ? "size-8 justify-center" : "gap-1 px-2 py-1",
          fullWidth &&
            "h-10 w-full justify-center gap-1.5 border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground",
          open && "bg-foreground/[0.08] text-foreground"
        )}
      >
        <Globe className={cn("opacity-80", compact || fullWidth ? "size-4" : "size-3.5")} />
        {compact ? null : <span>{t("language.comboLabel")}</span>}
        {compact ? null : (
          <ChevronDown
            className={cn("opacity-50 transition-transform", fullWidth ? "size-4" : "size-3", open && "rotate-180")}
          />
        )}
      </button>
      {menu}
    </div>
  )
}
