import { useEffect, useState } from 'react'
import type { DepthRow } from '../depth/aggregate'
import { detectMode, buildWsUrl } from '../data/binance/endpoints'

export interface DepthSnapshot {
  bids: DepthRow[]
  asks: DepthRow[]
}

/**
 * 盘口深度：WS depth20@100ms 实时流（代理/直连自动探测），简单重连。
 */
export function useDepth(symbol: string): DepthSnapshot | null {
  const [snapshot, setSnapshot] = useState<DepthSnapshot | null>(null)

  useEffect(() => {
    let alive = true
    let ws: WebSocket | null = null
    let reconnectTimer: number | undefined
    let closed = false

    const mapRows = (rows: [string, string][]): DepthRow[] =>
      rows.map(([price, quantity]) => ({ price: Number(price), quantity: Number(quantity) }))

    const connect = () => {
      if (closed || !alive) return
      void detectMode().then((mode) => {
        if (closed || !alive) return
        ws = new WebSocket(buildWsUrl(mode, `${symbol.toLowerCase()}@depth20@100ms`))
        ws.onmessage = (ev) => {
          const m = JSON.parse(ev.data as string) as {
            bids?: [string, string][]
            asks?: [string, string][]
          }
          if (m.bids && m.asks) {
            setSnapshot({ bids: mapRows(m.bids), asks: mapRows(m.asks) })
          }
        }
        ws.onclose = () => {
          if (closed || !alive) return
          reconnectTimer = window.setTimeout(connect, 2000)
        }
        ws.onerror = () => ws?.close()
      })
    }

    connect()

    return () => {
      alive = false
      closed = true
      ws?.close()
      window.clearTimeout(reconnectTimer)
    }
  }, [symbol])

  return snapshot
}
