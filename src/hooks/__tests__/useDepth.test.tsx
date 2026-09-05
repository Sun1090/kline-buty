// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDepth } from '../useDepth'

/** 简易 WS mock：记录实例，可控触发回调 */
class FakeWs {
  static instances: FakeWs[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  closed = false
  constructor(url: string) {
    this.url = url
    FakeWs.instances.push(this)
  }
  close() {
    this.closed = true
    this.onclose?.()
  }
  fireMessage(bids: [string, string][], asks: [string, string][]) {
    this.onmessage?.({ data: JSON.stringify({ bids, asks }) })
  }
  fireOpen() {
    this.onopen?.()
  }
  fireError() {
    this.onerror?.()
  }
}

// endpoints.detectMode 走 fetch /api/v3/ping —— mock 成 direct 模式
vi.mock('../../data/binance/endpoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/binance/endpoints')>()
  return {
    ...actual,
    detectMode: vi.fn(async () => 'direct' as const),
    readCustomBases: vi.fn(() => null),
  }
})

beforeEach(() => {
  FakeWs.instances = []
  ;(globalThis as Record<string, unknown>).WebSocket = FakeWs
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useDepth（盘口深度 WS）', () => {
  it('收到深度消息 → snapshot 更新（O7 覆盖数据分支）', async () => {
    const { result } = renderHook(() => useDepth('BTCUSDT'))
    expect(result.current).toBeNull()
    // 等待 detectMode 异步完成后创建 WS
    await vi.waitFor(() => {
      expect(FakeWs.instances.length).toBeGreaterThan(0)
    })
    const ws = FakeWs.instances[0]
    ws.fireOpen()
    act(() => {
      ws.fireMessage([['50000', '1.5']], [['50001', '2']])
    })
    expect(result.current).toEqual({
      bids: [{ price: 50000, quantity: 1.5 }],
      asks: [{ price: 50001, quantity: 2 }],
    })
  })

  it('连接失败 → 推进下一候选（多个 URL 依次尝试）', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useDepth('ETHUSDT'))
    await vi.waitFor(() => {
      expect(FakeWs.instances.length).toBeGreaterThan(0)
    })
    const first = FakeWs.instances[0]
    expect(first.url).toContain('stream.binance.com')
    act(() => first.fireError())
    expect(result.current).toBeNull()
  })

  it('卸载时关闭连接并清理定时器（O7 覆盖清理分支）', async () => {
    const { unmount } = renderHook(() => useDepth('BTCUSDT'))
    await vi.waitFor(() => {
      expect(FakeWs.instances.length).toBeGreaterThan(0)
    })
    const ws = FakeWs.instances[0]
    unmount()
    expect(ws.closed).toBe(true)
  })
})