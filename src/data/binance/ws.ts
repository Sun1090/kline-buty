import type { Candle, Period } from '../../chart/types'
import type { RawKlineWsMessage } from './types'
import { buildWsUrl, type EndpointMode } from './endpoints'

export type WsStatus = 'connecting' | 'live' | 'reconnecting' | 'closed'

export interface KlineWsCallbacks {
  onKline: (candle: Candle) => void
  onStatus: (status: WsStatus) => void
  /** 新连接建立成功时触发，调用方可拉 REST 补齐缺口 */
  onReconnect?: () => void
}

export interface KlineWs {
  close: () => void
}

/** 可注入依赖，便于单测（假 WebSocket + 假定时器） */
export interface WsDeps {
  createSocket: (url: string) => WebSocketLike
  setInterval: (fn: () => void, ms: number) => number
  clearInterval: (id?: number) => void
  setTimeout: (fn: () => void, ms: number) => number
  clearTimeout: (id?: number) => void
  now: () => number
}

export interface WebSocketLike {
  onopen: (() => void) | null
  onmessage: ((ev: { data: string }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
  close: () => void
}

/** 看门狗：超过该时长无消息则视为死连接，主动断开触发重连 */
export const WATCHDOG_INTERVAL_MS = 10_000
export const WATCHDOG_TIMEOUT_MS = 30_000
const MAX_BACKOFF_MS = 30_000

const browserDeps: WsDeps = {
  createSocket: (url) => new WebSocket(url) as unknown as WebSocketLike,
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (id) => window.clearInterval(id),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id),
  now: () => Date.now(),
}

/** 币安 WS kline 帧 → 领域类型 */
function mapWsKline(k: RawKlineWsMessage['k']): Candle {
  return {
    time: Math.floor(k.t / 1000),
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number(k.v),
    isClosed: k.x,
  }
}

/**
 * 币安 kline 实时流客户端：订阅、指数退避重连、消息看门狗。
 * 经 /ws 相对路径走 dev 代理（见 03-技术方案 §4）。
 */
export function createKlineWs(
  symbol: string,
  period: Period,
  callbacks: KlineWsCallbacks,
  deps: WsDeps = browserDeps,
  mode: EndpointMode = 'proxy',
): KlineWs {
  let socket: WebSocketLike | null = null
  let closed = false
  let attempt = 0
  let everConnected = false
  let reconnectTimer: number | undefined
  let watchdogTimer: number | undefined
  let lastMsgAt = 0

  const url = buildWsUrl(mode, `${symbol.toLowerCase()}@kline_${period}`)

  function startWatchdog() {
    stopWatchdog()
    lastMsgAt = deps.now()
    watchdogTimer = deps.setInterval(() => {
      if (deps.now() - lastMsgAt >= WATCHDOG_TIMEOUT_MS) {
        try {
          socket?.close()
        } catch {
          /* noop */
        }
      }
    }, WATCHDOG_INTERVAL_MS)
  }

  function stopWatchdog() {
    deps.clearInterval(watchdogTimer)
  }

  function connect() {
    if (closed) return
    callbacks.onStatus(attempt > 0 ? 'reconnecting' : 'connecting')
    const s = deps.createSocket(url)
    socket = s

    s.onopen = () => {
      attempt = 0
      callbacks.onStatus('live')
      if (everConnected) callbacks.onReconnect?.()
      everConnected = true
      startWatchdog()
    }
    s.onmessage = (ev) => {
      lastMsgAt = deps.now()
      const msg = JSON.parse(ev.data) as RawKlineWsMessage
      if (msg.e === 'kline') callbacks.onKline(mapWsKline(msg.k))
    }
    s.onclose = () => {
      stopWatchdog()
      if (closed) return
      callbacks.onStatus('reconnecting')
      scheduleReconnect()
    }
    s.onerror = () => {
      try {
        s.close()
      } catch {
        /* noop */
      }
    }
  }

  function scheduleReconnect() {
    if (closed) return
    attempt += 1
    const delay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** Math.min(attempt - 1, 5))
    reconnectTimer = deps.setTimeout(() => {
      connect()
    }, delay)
  }

  connect()

  return {
    close() {
      closed = true
      stopWatchdog()
      socket?.close()
      deps.clearTimeout(reconnectTimer)
    },
  }
}
