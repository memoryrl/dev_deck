export type Messages = { [key: string]: string | Messages }

export function t(messages: Messages, key: string, vars?: Record<string, string | number>) {
  const parts = key.split(".")
  let current: string | Messages | undefined = messages
  for (const part of parts) {
    if (typeof current !== "object" || current == null) return key
    current = current[part]
  }
  if (typeof current !== "string") return key
  if (!vars) return current
  return current.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    vars[name] === undefined ? "" : String(vars[name])
  )
}
