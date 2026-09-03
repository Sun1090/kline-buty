import { useEffect, useState } from 'react'
import type { DepthRow } from '../depth/aggregate'
import { buildDepthWsUrls, detectMode, toCoinMSymbol } from '../data/binance/endpoints'

export interface DepthSnapshot {
  bids: DepthRow[]
  asks: DepthRow[]
}

/** WS 连接超时：候选被静默丢弃（无 error/close）时在此后回退下一候选 */
const CONNECT_TIMEOUT_MS = 3000
/** 首消息超时：连接已建立但迟迟无深度数据（部分网络半开/限流）→ 推进下一候选 */
const FIRST_MESSAGE_TIMEOUT_MS = 5000
/** 全部候选失败后重连间隔 */
const RECONNECT_MS = 2000

/**
 * 盘口深度：WS depth20@100ms 实时流（代理/直连自动探测）。
 * 直连模式候选链：spot stream 优先，连接失败/超时/首消息超时回退 USDT-M 期货流（流名同构），
 * 解决部分网络环境 spot WS 被阻断导致盘口/深度无数据的问题。
 */
export function useDepth(symbol: string, reloadNonce = 0): DepthSnapshot | null {
  const [snapshot, setSnapshot] = useState<DepthSnapshot | null>(null)

  useEffect(() => {
    let alive = true
    let ws: WebSocket | null = null
    let reconnectTimer: number | undefined
    let connectTimer: number | undefined
    let firstMsgTimer: number | undefined
    let closed = false

    const mapRows = (rows: [string, string][]): DepthRow[] =>
      rows.map(([price, quantity]) => ({ price: Number(price), quantity: Number(quantity) }))

    const closeWs = () => {
      if (ws) {
        try {
          ws.onopen = null
          ws.onmessage = null
          ws.onerror = null
          ws.onclose = null
          ws.close()
        } catch {
          /* noop */
        }
        ws = null
      }
    }

    const connect = () => {
      if (closed || !alive) return
      void detectMode().then((mode) => {
        if (closed || !alive) return
        const coinm = `${toCoinMSymbol(symbol).toLowerCase()}@depth20@100ms`
        connectTo(buildDepthWsUrls(mode, `${symbol.toLowerCase()}@depth20@100ms`, coinm), 0)
      })
    }

    const connectTo = (urls: string[], idx: number) => {
      if (closed || !alive) return
      if (idx >= urls.length) {
        // 全部候选失败 → 稍后从首个重试
        reconnectTimer = window.setTimeout(connect, RECONNECT_MS)
        return
      }
      const url = urls[idx]
      let gotData = false
      closeWs()
      const w = new WebSocket(url)
      ws = w
      const clearTimers = () => {
        window.clearTimeout(connectTimer)
        window.clearTimeout(firstMsgTimer)
      }
      const advance = () => {
        if (closed || !alive || gotData) return
        clearTimers()
        connectTo(urls, idx + 1)
      }
      connectTimer = window.setTimeout(advance, CONNECT_TIMEOUT_MS)
      w.onopen = () => {
        // 连接建立：取消连接超时，另设首消息超时（部分网络半开）
        window.clearTimeout(connectTimer)
        firstMsgTimer = window.setTimeout(advance, FIRST_MESSAGE_TIMEOUT_MS)
      }
      w.onmessage = (ev) => {
        const m = JSON.parse(ev.data as string) as {
          bids?: [string, string][]
          asks?: [string, string][]
        }
        if (m.bids && m.asks) {
          gotData = true
          clearTimers()
          setSnapshot({ bids: mapRows(m.bids), asks: mapRows(m.asks) })
        }
      }
      w.onerror = () => {
        if (closed || !alive) return
        advance()
      }
      w.onclose = () => {
        if (closed || !alive) return
        clearTimers()
        if (!gotData) {
          connectTo(urls, idx + 1)
        } else {
          // 拿到过数据后断开 → 整链重来
          reconnectTimer = window.setTimeout(connect, RECONNECT_MS)
        }
      }
    }

    connect()

    return () => {
      alive = false
      closed = true
      ws?.close()
      window.clearTimeout(reconnectTimer)
      window.clearTimeout(connectTimer)
      window.clearTimeout(firstMsgTimer)
    }
  }, [symbol, reloadNonce])

  return snapshot
}
