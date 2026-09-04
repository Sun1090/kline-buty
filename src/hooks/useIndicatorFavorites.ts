import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kline-buty:indicatorFavorites'
const MAX_FAVORITES = 12

/** 副图指标快捷收藏：持久化常用指标 id 列表（快速切换 H15）。 */
export function loadIndicatorFavorites(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const s of arr) {
      if (typeof s === 'string' && s.length > 0 && s.length <= 20 && !seen.has(s)) {
        seen.add(s)
        out.push(s)
        if (out.length >= MAX_FAVORITES) break
      }
    }
    return out
  } catch {
    return []
  }
}

export function useIndicatorFavorites(): {
  favorites: string[]
  toggleFavorite: (id: string) => void
} {
  const [favorites, setFavorites] = useState<string[]>(() => loadIndicatorFavorites(localStorage.getItem(STORAGE_KEY)))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_FAVORITES
          ? prev
          : [...prev, id],
    )
  }

  return { favorites, toggleFavorite }
}