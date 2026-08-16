// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { usePriceAlerts } from '../usePriceAlerts'

const notifyMock = vi.fn()

beforeEach(() => {
  localStorage.clear()
  ;(globalThis as Record<string, unknown>).Notification = class {
    static permission = 'granted'
    static requestPermission = vi.fn(async () => 'granted')
    constructor(_title: string, _opts: unknown) {
      notifyMock(_title, _opts)
    }
  }
  notifyMock.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('usePriceAlerts', () => {
  it('添加提醒并持久化', () => {
    const { result } = renderHook(() => usePriceAlerts(null))
    act(() => {
      result.current.addAlert('BTCUSDT', 'above', 65000)
    })
    expect(result.current.alerts).toHaveLength(1)
    expect(result.current.alerts[0]).toMatchObject({
      symbol: 'BTCUSDT',
      direction: 'above',
      price: 65000,
      triggered: false,
    })
    expect(JSON.parse(localStorage.getItem('kline-buty:alerts')!)).toHaveLength(1)
  })

  it('价格到达 → 触发通知并标记 triggered', () => {
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    act(() => {
      result.current.addAlert('BTCUSDT', 'above', 65000)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 65100 } })
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(result.current.alerts[0].triggered).toBe(true)
  })

  it('已触发的提醒不重复通知', () => {
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    act(() => {
      result.current.addAlert('BTCUSDT', 'above', 65000)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 66000 } })
    rerender({ price: { symbol: 'BTCUSDT', price: 67000 } })
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })

  it('其他品种的提醒不触发', () => {
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    act(() => {
      result.current.addAlert('ETHUSDT', 'above', 3000)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 5000 } })
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('重置后可再次触发', () => {
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    act(() => {
      result.current.addAlert('BTCUSDT', 'below', 60000)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 59000 } })
    expect(notifyMock).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.resetAlert(result.current.alerts[0].id)
    })
    expect(result.current.alerts[0].triggered).toBe(false)
    rerender({ price: { symbol: 'BTCUSDT', price: 58000 } })
    expect(notifyMock).toHaveBeenCalledTimes(2)
  })
})
