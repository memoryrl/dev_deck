export function maskIp(ip: string) {
  if (!ip || ip === "0.0.0.0") return "-"
  if (ip.includes(":")) {
    const parts = ip.split(":")
    return `${parts.slice(0, 3).join(":")}:*`
  }
  const parts = ip.split(".")
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`
  return ip
}
