"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { lockDocumentScroll } from "@/lib/dom/lock-scroll"
import {
  settleLayerDialog,
  subscribeLayerDialog,
  type LayerDialogKind,
  type LayerDialogRequest,
} from "@/lib/ui/layer-dialog"
import { cn } from "@/lib/utils"

export { showAlert, showConfirm } from "@/lib/ui/layer-dialog"

export function LayerDialogHost() {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [request, setRequest] = useState<LayerDialogRequest | null>(null)

  useEffect(() => {
    setMounted(true)
    return subscribeLayerDialog(setRequest)
  }, [])

  if (!mounted || !request) return null

  return createPortal(
    <LayerDialogView
      key={request.id}
      kind={request.kind}
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel ?? t("common.ok")}
      cancelLabel={request.cancelLabel ?? t("common.cancel")}
      destructive={request.destructive}
      onClose={(value) => settleLayerDialog(request.id, value)}
    />,
    document.body
  )
}

function LayerDialogView({
  kind,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onClose,
}: {
  kind: LayerDialogKind
  title?: string
  message: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  onClose: (value: boolean) => void
}) {
  const titleId = useId()
  const messageId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const closed = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  function close(value: boolean) {
    if (closed.current) return
    closed.current = true
    onCloseRef.current(value)
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const unlock = lockDocumentScroll()
    const panel = panelRef.current
    const buttons = panel ? Array.from(panel.querySelectorAll<HTMLElement>("button")) : []
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    confirmRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        close(false)
        return
      }
      if (event.key !== "Tab" || !first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKey, true)
    return () => {
      unlock()
      document.removeEventListener("keydown", onKey, true)
      previous?.focus?.()
    }
    // Mounted once per dialog instance (`key={request.id}`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label={cancelLabel}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={() => close(false)}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : messageId}
        aria-describedby={title ? messageId : undefined}
        className="relative w-full max-w-[22rem] rounded-2xl border border-foreground/10 bg-background p-6 shadow-[0_24px_48px_-20px_hsl(var(--foreground)/0.55)]"
      >
        {title ? (
          <h2 id={titleId} className="font-display text-lg font-bold tracking-tight">
            {title}
          </h2>
        ) : null}
        <p
          id={messageId}
          className={cn("text-sm leading-relaxed text-foreground/85", title && "mt-2 text-muted-foreground")}
        >
          {message}
        </p>
        <div className={cn("flex justify-end gap-2", title || message ? "mt-6" : "mt-4")}>
          {kind === "confirm" ? (
            <Button type="button" variant="outline" className="rounded-full" onClick={() => close(false)}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            ref={confirmRef}
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="rounded-full"
            onClick={() => close(true)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
