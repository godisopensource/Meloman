// Scroll position restoration utility using sessionStorage
export function saveScrollPosition(key: string, position: number): void {
  try {
    sessionStorage.setItem(`scroll-${key}`, position.toString())
    console.debug('[ScrollRestoration] Saved position for', key, ':', position)
  } catch (e) {
    console.error('[ScrollRestoration] Failed to save:', e)
  }
}

export function getScrollPosition(key: string): number {
  try {
    const saved = sessionStorage.getItem(`scroll-${key}`)
    const position = saved ? parseInt(saved, 10) : 0
    console.debug('[ScrollRestoration] Retrieved position for', key, ':', position)
    return position
  } catch (e) {
    console.error('[ScrollRestoration] Failed to retrieve:', e)
    return 0
  }
}

export function clearScrollPosition(key: string): void {
  try {
    sessionStorage.removeItem(`scroll-${key}`)
  } catch (e) {
    console.error('[ScrollRestoration] Failed to clear:', e)
  }
}

export function clearAllScrollPositions(): void {
  try {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith('scroll-'))
    keys.forEach(k => sessionStorage.removeItem(k))
  } catch (e) {
    console.error('[ScrollRestoration] Failed to clear all:', e)
  }
}
