import { useEffect, useState } from 'react'

const PREFIX = 'kline-buty:'

type Setter<T> = (v: T | ((prev: T) => T)) => void

/** localStorage 持久化 state：初始化读取，变化即写，解析失败回退默认 */
export function usePersistedState<T>(key: string, initial: T): [T, Setter<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  const setPersisted: Setter<T> = (v) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next))
      } catch {
        /* 存储不可用时静默（隐私模式等） */
      }
      return next
    })
  }

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* noop */
    }
  }, [key, value])

  return [value, setPersisted]
}
