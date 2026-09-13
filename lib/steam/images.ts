export function steamHeaderUrl(appId: number) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
}

export function steamIconUrl(appId: number, hash: string | null) {
  if (!hash) return null
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`
}
