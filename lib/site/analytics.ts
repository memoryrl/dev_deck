const PLACEHOLDER = /^G-X+$/i
const MEASUREMENT_ID = /^G-[A-Z0-9]{6,}$/

export function parseGaMeasurementId(raw: string): string | null {
  const id = raw.trim().toUpperCase()
  if (!id) return null
  if (PLACEHOLDER.test(id)) return null
  if (!MEASUREMENT_ID.test(id)) return null
  return id
}

export function isGaMeasurementIdInputValid(raw: string): boolean {
  return !raw.trim() || parseGaMeasurementId(raw) !== null
}

export function isAnalyticsLocalHost(host: string | null | undefined): boolean {
  if (!host) return false
  const name = host.split(":")[0]
  return name === "localhost" || name === "127.0.0.1"
}
