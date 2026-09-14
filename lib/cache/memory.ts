const values = new Map<string, { expires: number; value: unknown }>()
const pending = new Map<string, Promise<unknown>>()

export const MEMORY_TTL = {
  steamOwned: 5 * 60_000,
  steamCover: 24 * 60 * 60_000,
  menus: 60_000,
  publicList: 30_000,
  board: 60_000,
} as const

export const memoryKey = {
  steamOwned: "steam:owned",
  steamCover: (appId: number) => `steam:cover:${appId}`,
  menus: (location: string) => `menus:${location}`,
  prompts: (role: string) => `public:prompts:${role}`,
  career: (role: string) => `public:career:${role}`,
  skills: (role: string) => `public:skills:${role}`,
  reviews: (role: string) => `public:reviews:${role}`,
  boardAll: "board:system:all",
}

export function withMemoryCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = values.get(key)
  if (hit && hit.expires > now) return Promise.resolve(hit.value as T)

  const inflight = pending.get(key)
  if (inflight) return inflight as Promise<T>

  let promise: Promise<T>
  promise = fn().then(
    (value) => {
      if (pending.get(key) === promise) {
        values.set(key, { value, expires: Date.now() + ttlMs })
        pending.delete(key)
      }
      return value
    },
    (error: unknown) => {
      if (pending.get(key) === promise) pending.delete(key)
      throw error
    }
  )
  pending.set(key, promise)
  return promise
}

export function forgetMemoryCache(prefix: string) {
  for (const key of values.keys()) {
    if (key === prefix || key.startsWith(prefix)) values.delete(key)
  }
  for (const key of pending.keys()) {
    if (key === prefix || key.startsWith(prefix)) pending.delete(key)
  }
}
