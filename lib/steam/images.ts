export function steamHeaderUrl(appId: number) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
}

export function steamLibraryHeroUrl(appId: number) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`
}

export function steamIconUrl(appId: number, hash: string | null) {
  if (!hash) return null
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`
}

export function steamHeroSources(appId: number, extra?: string | null) {
  return [extra, steamHeaderUrl(appId), steamLibraryHeroUrl(appId)].filter(
    (url, index, list): url is string => Boolean(url) && list.indexOf(url) === index
  )
}

export function steamCoverSources(appId: number, extra?: string | null) {
  return [extra, steamHeaderUrl(appId)].filter(
    (url, index, list): url is string => Boolean(url) && list.indexOf(url) === index
  )
}
