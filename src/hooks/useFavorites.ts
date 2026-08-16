import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kline-buty:favorites'
const MAX_FAVORITES = 50

/** 解析 localStorage 收藏列表（校验字符串、去重、截断，非法数据回退空数组） */
export function loadFavorites(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const s of arr) {
      if (typeof s === 'string' && /^[A-Z0-9]+USDT$/.test(s) && !seen.has(s)) {
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

/**
 * 自选交易对收藏（localStorage 持久化）。
 * 纯函数 loadFavorites/saveFavorites 可单测；组件内通过 useState 惰性初始化 + effect 持久化。
 */
export function useFavorites(): { favorites: string[]; toggleFavorite: (s: string) => void } {
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites(localStorage.getItem(STORAGE_KEY)))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (s: string) => {
    setFavorites((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length >= MAX_FAVORITES ? prev : [...prev, s],
    )
  }

  return { favorites, toggleFavorite }
}
