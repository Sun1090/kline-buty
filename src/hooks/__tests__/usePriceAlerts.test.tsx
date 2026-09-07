// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { usePriceAlerts, playAlertBeep } from '../usePriceAlerts'

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

  it('触发时写入历史（含触发价），持久化且清空生效', () => {
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    expect(result.current.history).toHaveLength(0)
    act(() => {
      result.current.addAlert('BTCUSDT', 'above', 65000)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 65123.45 } })
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0]).toMatchObject({
      alertId: result.current.alerts[0].id,
      symbol: 'BTCUSDT',
      direction: 'above',
      price: 65000,
      triggeredPrice: 65123.45,
    })
    const stored = JSON.parse(localStorage.getItem('kline-buty:alertHistory')!)
    expect(stored).toHaveLength(1)
    act(() => {
      result.current.clearHistory()
    })
    expect(result.current.history).toHaveLength(0)
    expect(localStorage.getItem('kline-buty:alertHistory')).toBeNull()
  })

  it('历史按新记录在前排序且上限 50 条', () => {
    // 直接注入 55 条历史（模拟长期累积）
    const seeded = Array.from({ length: 55 }, (_, i) => ({
      alertId: `a${i}`,
      symbol: 'BTCUSDT',
      direction: 'above' as const,
      price: 100 + i,
      triggeredPrice: 101 + i,
      at: 1_000_000 + i,
    }))
    localStorage.setItem('kline-buty:alertHistory', JSON.stringify(seeded))
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    expect(result.current.history).toHaveLength(55)
    act(() => {
      result.current.addAlert('BTCUSDT', 'below', 50)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 49 } })
    // 触发 1 条后裁剪到上限 50，新记录在最前
    expect(result.current.history).toHaveLength(50)
    expect(result.current.history[0].triggeredPrice).toBe(49)
    expect(result.current.history[0].at).toBeGreaterThan(seeded[54].at)
    expect(JSON.parse(localStorage.getItem('kline-buty:alertHistory')!)).toHaveLength(50)
  })

  it('playAlertBeep：WebAudio 合成不抛错（非法音效回退 beep）', () => {
    const ctx = {
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        frequency: { value: 0 },
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      })),
      close: vi.fn(() => Promise.resolve()),
    }
    // 普通函数构造器：new 时返回 ctx（vi.fn 构造器语义会忽略返回值）
    function FakeAudioContext() {
      return ctx
    }
    Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, configurable: true })
    expect(() => playAlertBeep('chime')).not.toThrow()
    expect(() => playAlertBeep('unknown-kind' as never)).not.toThrow()
    expect(ctx.createOscillator).toHaveBeenCalled()
    delete (window as { AudioContext?: unknown }).AudioContext
  })

  it('playAlertBeep：无 AudioContext → 静默返回', () => {
    delete (window as { AudioContext?: unknown }).AudioContext
    expect(() => playAlertBeep()).not.toThrow()
  })

  it('requestPermission：无 Notification → unsupported', async () => {
    delete (globalThis as Record<string, unknown>).Notification
    const { result } = renderHook(() => usePriceAlerts(null))
    await expect(result.current.requestPermission()).resolves.toBe('unsupported')
    expect(result.current.permission).toBe('unsupported')
  })

  it('localStorage 存非法 JSON → 加载为空列表不抛错', () => {
    localStorage.setItem('kline-buty:alerts', 'not-json{{')
    const { result } = renderHook(() => usePriceAlerts(null))
    expect(result.current.alerts).toEqual([])
  })

  it('permission 非 granted → 不弹系统通知，但站内横幅事件照常触发（E1 web 渠道）', () => {
    ;(globalThis as Record<string, unknown>).Notification = class {
      static permission = 'denied'
      static requestPermission = vi.fn(async () => 'denied')
    }
    const dispatchMock = vi.fn()
    window.dispatchEvent = dispatchMock
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    act(() => {
      result.current.addAlert('BTCUSDT', 'above', 65000)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 65100 } })
    expect(notifyMock).not.toHaveBeenCalled()
    // 默认渠道 both：无系统权限跳过系统通知，但 web 横幅事件仍派发且标记 triggered
    expect(dispatchMock).toHaveBeenCalled()
    expect(result.current.alerts[0].triggered).toBe(true)
    expect(result.current.history).toHaveLength(1)
  })

  it('Notification 构造失败 → 不阻塞标记 triggered', () => {
    ;(globalThis as Record<string, unknown>).Notification = class {
      static permission = 'granted'
      static requestPermission = vi.fn(async () => 'granted')
      constructor() {
        throw new Error('notification blocked')
      }
    }
    const { result, rerender } = renderHook(({ price }) => usePriceAlerts(price), {
      initialProps: { price: null as { symbol: string; price: number } | null },
    })
    act(() => {
      result.current.addAlert('BTCUSDT', 'above', 65000)
    })
    rerender({ price: { symbol: 'BTCUSDT', price: 65100 } })
    expect(result.current.alerts[0].triggered).toBe(true)
  })
})

  it('E2 多品种监控：prices 表中其他品种价格到达触发其提醒', () => {
    const { result, rerender } = renderHook(
      ({ price, prices }) => usePriceAlerts(price, prices),
      {
        initialProps: {
          price: { symbol: 'BTCUSDT', price: 50000 } as { symbol: string; price: number },
          prices: { ETHUSDT: 3000 } as Record<string, number>,
        },
      },
    )
    act(() => {
      result.current.addAlert('ETHUSDT', 'above', 2990)
    })
    expect(result.current.pendingCount).toBe(1)
    rerender({ price: { symbol: 'BTCUSDT', price: 50000 }, prices: { ETHUSDT: 2995 } })
    expect(result.current.alerts[0].triggered).toBe(true)
    expect(result.current.history[0]).toMatchObject({ symbol: 'ETHUSDT' })
  })

  it('E12 pendingCount：未触发/未停用/未过期才计入待触发', () => {
    const { result } = renderHook(() => usePriceAlerts(null))
    act(() => result.current.addAlert('BTCUSDT', 'above', 65000))
    expect(result.current.pendingCount).toBe(1)
    act(() => result.current.updateAlert(result.current.alerts[0].id, { disabled: true }))
    expect(result.current.pendingCount).toBe(0)
    act(() => result.current.updateAlert(result.current.alerts[0].id, { disabled: false, expiresAt: 1 }))
    expect(result.current.pendingCount).toBe(0)
  })

  it('E14 exportAlertsJson / importAlertsJson：往返恢复；非法输入拒绝', () => {
    const { result } = renderHook(() => usePriceAlerts(null))
    act(() => result.current.addAlert('BTCUSDT', 'above', 65000))
    const json = result.current.exportAlertsJson()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.alerts).toHaveLength(1)
    expect(result.current.importAlertsJson('{bad')).toBe(false)
    expect(result.current.importAlertsJson('{"alerts":[{"id":1}]}')).toBe(false)
    act(() => result.current.removeAlert(result.current.alerts[0].id))
    expect(result.current.alerts).toHaveLength(0)
    act(() => {
      expect(result.current.importAlertsJson(json)).toBe(true)
    })
    expect(result.current.alerts).toHaveLength(1)
  })

  it('E4 模板：保存/读取/删除（重名与空名拒绝）', () => {
    const { result } = renderHook(() => usePriceAlerts(null))
    act(() => {
      expect(result.current.saveTemplate({ name: '突破', direction: 'above', price: 65000 })).toBe(true)
      expect(result.current.saveTemplate({ name: '突破', direction: 'below', price: 1 })).toBe(false)
      expect(result.current.saveTemplate({ name: '  ', direction: 'above', price: 1 })).toBe(false)
    })
    expect(result.current.templates).toEqual(['突破'])
    expect(result.current.loadTemplate('突破')).toMatchObject({ direction: 'above', price: 65000 })
    act(() => result.current.deleteTemplate('突破'))
    expect(result.current.templates).toEqual([])
    expect(result.current.loadTemplate('突破')).toBeNull()
  })

  it('E1 推送渠道设置并持久化（默认 both）', () => {
    const { result } = renderHook(() => usePriceAlerts(null))
    expect(result.current.channel).toBe('both')
    act(() => result.current.setChannel('web'))
    expect(result.current.channel).toBe('web')
    expect(localStorage.getItem('kline-buty:alertChannel')).toBe('web')
  })

  it('I7 语音播报：默认关闭，可切换并持久化', () => {
    const { result } = renderHook(() => usePriceAlerts(null))
    expect(result.current.voiceEnabled).toBe(false)
    act(() => result.current.setVoiceEnabled(true))
    expect(result.current.voiceEnabled).toBe(true)
    expect(localStorage.getItem('kline-buty:alertVoice')).toBe('true')
  })
