export type NeighborLink = {
  href: string
  title: string
}

export function findNeighbors<T>(
  items: T[],
  currentKey: string,
  getKey: (item: T) => string,
  hrefOf: (item: T) => string,
  titleOf: (item: T) => string
): { prev: NeighborLink | null; next: NeighborLink | null } {
  const index = items.findIndex((item) => getKey(item) === currentKey)
  if (index < 0) return { prev: null, next: null }
  const newer = index > 0 ? items[index - 1] : undefined
  const older = index < items.length - 1 ? items[index + 1] : undefined
  return {
    next: newer ? { href: hrefOf(newer), title: titleOf(newer) } : null,
    prev: older ? { href: hrefOf(older), title: titleOf(older) } : null,
  }
}
