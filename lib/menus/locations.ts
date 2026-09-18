import type { MenuLocation } from "@/types/menu"

export const MENU_LOCATIONS: MenuLocation[] = ["header", "footer", "admin"]

export function isMenuLocation(value: string): value is MenuLocation {
  return MENU_LOCATIONS.includes(value as MenuLocation)
}

export function menuLocationLabel(location: MenuLocation) {
  if (location === "admin") return "관리자"
  if (location === "footer") return "푸터"
  return "헤더"
}
