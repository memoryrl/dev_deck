export type LayerDialogKind = "alert" | "confirm"

export type LayerDialogOptions = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export type LayerDialogRequest = LayerDialogOptions & {
  id: number
  kind: LayerDialogKind
  message: string
  resolve: (value: boolean) => void
}

let seq = 0
const queue: LayerDialogRequest[] = []
let active: LayerDialogRequest | null = null
const listeners = new Set<(request: LayerDialogRequest | null) => void>()

function emit() {
  listeners.forEach((listener) => listener(active))
}

function pump() {
  if (active) {
    emit()
    return
  }
  active = queue.shift() ?? null
  emit()
}

function enqueue(
  kind: LayerDialogKind,
  message: string,
  options: LayerDialogOptions | undefined,
  resolve: (value: boolean) => void
) {
  queue.push({
    id: ++seq,
    kind,
    message,
    ...options,
    resolve,
  })
  pump()
}

export function showAlert(message: string, options?: LayerDialogOptions): Promise<void> {
  return new Promise((resolve) => {
    enqueue("alert", message, options, () => resolve())
  })
}

export function showConfirm(message: string, options?: LayerDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    enqueue("confirm", message, options, resolve)
  })
}

export function settleLayerDialog(id: number, value: boolean) {
  if (!active || active.id !== id) return
  const request = active
  active = null
  request.resolve(value)
  pump()
}

export function subscribeLayerDialog(listener: (request: LayerDialogRequest | null) => void) {
  listeners.add(listener)
  listener(active)
  return () => {
    listeners.delete(listener)
  }
}
