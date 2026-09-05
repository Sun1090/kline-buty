import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createKlineWs,
  WATCHDOG_INTERVAL_MS,
  WATCHDOG_TIMEOUT_MS,
  type WebSocketLike,
  type WsDeps,
} from '../ws'

interface FakeSocket extends WebSocketLike {
  emitOpen(): void
  emitClose(): void
  emitFrame(data: unknown): void
}

function makeEnv() {
  const sockets: FakeSocket[] = []
  const createdUrls: string[] = []

  const deps: WsDeps = {
    createSocket: (url) => {
      createdUrls.push(url)
      const s: FakeSocket = {
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        close: () => s.onclose?.(),
        emitOpen: () => s.onopen?.(),
        emitClose: () => s.onclose?.(),
        emitFrame: (data: unknown) => s.onmessage?.({ data: JSON.stringify(data) }),
      }
      sockets.push(s)
      return s
    },
    // 直接使用全局定时器：vi.useFakeTimers() 已接管
    setInterval: (fn, ms) => setInterval(fn, ms) as unknown as number,
    clearInterval: (id) => clearInterval(id as unknown as ReturnType<typeof setInterval>),
    setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number,
    clearTimeout: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
    now: () => Date.now(),
  }

  return { sockets, createdUrls, deps }
}

function klineFrame(close = 100) {
  return {
    e: 'kline',
    k: { t: 1786800000000, o: '100', h: '101', l: '99', c: String(close), v: '5', x: false },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

describe('createKlineWs', () => {
  it('连接成功 → live；收到帧 → onKline', () => {
    const env = makeEnv()
    const statuses: string[] = []
    const closes: number[] = []
    const ws = createKlineWs('BTCUSDT', '1m', {
      onStatus: (s) => statuses.push(s),
      onKline: (c) => closes.push(c.close),
    }, env.deps)

    expect(env.createdUrls[0]).toContain('/ws/btcusdt@kline_1m')
    env.sockets[0].emitOpen()
    expect(statuses).toEqual(['connecting', 'live'])
    env.sockets[0].emitFrame(klineFrame(63000))
    expect(closes).toEqual([63000])
    ws.close()
  })

  it('断线 → reconnecting → 退避重连 → live，补数钩子仅在新连接成功后触发', () => {
    const env = makeEnv()
    const statuses: string[] = []
    let reconnects = 0
    const ws = createKlineWs('BTCUSDT', '5m', {
      onStatus: (s) => statuses.push(s),
      onKline: () => {},
      onReconnect: () => reconnects++,
    }, env.deps)

    env.sockets[0].emitOpen()
    env.sockets[0].emitClose()
    expect(statuses[statuses.length - 1]).toBe('reconnecting')

    vi.advanceTimersByTime(1000)
    expect(env.sockets.length).toBe(2) // 已发起第 2 次连接
    expect(reconnects).toBe(0) // 尚未连接成功，不补数

    env.sockets[1].emitOpen()
    expect(statuses[statuses.length - 1]).toBe('live')
    expect(reconnects).toBe(1) // 二次连接成功 → 补数
    ws.close()
  })

  it('看门狗：30s 无消息 → 主动断开并重连', () => {
    const env = makeEnv()
    const statuses: string[] = []
    const ws = createKlineWs('BTCUSDT', '1h', {
      onStatus: (s) => statuses.push(s),
      onKline: () => {},
    }, env.deps)

    env.sockets[0].emitOpen()
    expect(statuses[statuses.length - 1]).toBe('live')

    vi.advanceTimersByTime(WATCHDOG_INTERVAL_MS * 2)
    env.sockets[0].emitFrame(klineFrame(1)) // 20s 时有消息
    vi.advanceTimersByTime(WATCHDOG_TIMEOUT_MS + WATCHDOG_INTERVAL_MS) // 再过 40s 无消息
    expect(statuses[statuses.length - 1]).toBe('reconnecting')
    expect(env.sockets.length).toBe(2)

    env.sockets[1].emitOpen()
    expect(statuses[statuses.length - 1]).toBe('live')
    ws.close()
  })

  it('周期性消息重置看门狗计时，不误断', () => {
    const env = makeEnv()
    const statuses: string[] = []
    const ws = createKlineWs('BTCUSDT', '1m', {
      onStatus: (s) => statuses.push(s),
      onKline: () => {},
    }, env.deps)

    env.sockets[0].emitOpen()
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(WATCHDOG_INTERVAL_MS * 2) // 每 20s
      env.sockets[0].emitFrame(klineFrame(i))
    }
    expect(statuses[statuses.length - 1]).toBe('live')
    expect(env.sockets.length).toBe(1)
    ws.close()
  })

  it('主动 close → 不再重连', () => {
    const env = makeEnv()
    const statuses: string[] = []
    const ws = createKlineWs('BTCUSDT', '1m', {
      onStatus: (s) => statuses.push(s),
      onKline: () => {},
    }, env.deps)

    env.sockets[0].emitOpen()
    ws.close()
    vi.advanceTimersByTime(120_000)
    expect(statuses[statuses.length - 1]).toBe('live')
    expect(env.sockets.length).toBe(1)
  })

  it('O7：onerror → 内部调用 close → 触发 onclose → 重连', () => {
    const env = makeEnv()
    const statuses: string[] = []
    const ws = createKlineWs('BTCUSDT', '1m', {
      onStatus: (s) => statuses.push(s),
      onKline: () => {},
    }, env.deps)

    env.sockets[0].emitOpen()
    expect(statuses[statuses.length - 1]).toBe('live')
    // 触发真实 onerror：ws.ts 处理器调用 s.close()（FakeSocket close→onclose），
    // onclose 置 reconnecting 并调度重连
    env.sockets[0].onerror?.()
    expect(statuses[statuses.length - 1]).toBe('reconnecting')
    vi.advanceTimersByTime(1000)
    expect(env.sockets.length).toBe(2) // 已发起第 2 次连接
    ws.close()
  })
})
