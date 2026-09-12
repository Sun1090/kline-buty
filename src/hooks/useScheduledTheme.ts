import { useEffect, useRef, useState } from 'react'
import { currentScheduledTheme, type ScheduleThemeConfig, type ThemeMode } from '../theme'

const TICK_MS = 30_000

/** 定时主题：按配置在深/浅色切换时刻自动更新；每 30s 重算，仅变化时 setState */
export function useScheduledTheme(config: ScheduleThemeConfig): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => currentScheduledTheme(config))
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    setMode(currentScheduledTheme(config))
    const timer = setInterval(() => {
      setMode((prev) => {
        const next = currentScheduledTheme(configRef.current)
        return next === prev ? prev : next
      })
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [config])

  return mode
}
