// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScheduledTheme } from '../useScheduledTheme'

const CONFIG = { darkTime: '18:00', lightTime: '07:00' }

function setNow(date: Date) {
  vi.setSystemTime(date)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useScheduledTheme（I9 定时主题）', () => {
  it('初始按配置时间解析出当前主题', () => {
    setNow(new Date(2026, 0, 1, 19, 0)) // 19:00 属深色区间（18:00–07:00）
    const { result } = renderHook(() => useScheduledTheme(CONFIG))
    expect(result.current).toBe('dark')
  })

  it('越过切换点后定时更新', () => {
    setNow(new Date(2026, 0, 1, 6, 59, 45)) // 06:59:45 仍深色；下一 tick 到 07:00:15 越过切换点
    const { result } = renderHook(() => useScheduledTheme(CONFIG))
    expect(result.current).toBe('dark')
    // 推进 30s 触发一次定时重算 → 应切为浅色（fake clock 同步推进 new Date()）
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current).toBe('light')
  })

  it('config 变更后立即按新配置重算', () => {
    setNow(new Date(2026, 0, 1, 10, 0)) // 10:00
    const { result, rerender } = renderHook(({ config }) => useScheduledTheme(config), {
      initialProps: { config: CONFIG },
    })
    // 原配置 10:00 → light
    expect(result.current).toBe('light')
    // 新配置 dark 00:00 / light 18:00 → 10:00 → dark
    rerender({ config: { darkTime: '00:00', lightTime: '18:00' } })
    expect(result.current).toBe('dark')
  })

  it('未越过切换点保持当前值（不产生多余更新）', () => {
    setNow(new Date(2026, 0, 1, 12, 0))
    const { result } = renderHook(() => useScheduledTheme(CONFIG))
    expect(result.current).toBe('light')
    setNow(new Date(2026, 0, 1, 12, 1))
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current).toBe('light')
  })
})
