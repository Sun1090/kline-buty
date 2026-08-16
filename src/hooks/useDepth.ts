import { useEffect, useState } from 'react'
import type { DepthRow } from '../depth/aggregate'

export interface DepthSnapshot {
  bids: DepthRow[]
  asks: DepthRow[]
}

/**
 * 盘口深度：WS depth20@100ms 实时流（经 /ws 代理），简单重连 + REST 兜底。
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
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${protocol}://${location.host}/ws/${symbol.toLowerCase()}@depth20@100ms`)
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
