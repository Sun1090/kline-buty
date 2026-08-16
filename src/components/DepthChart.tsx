import { useMemo } from 'react'
import type { DepthSnapshot } from '../hooks/useDepth'
import { aggregateDepth, maxTotal, bestPrice } from '../depth/aggregate'

interface DepthChartProps {
  symbol: string
  depth: DepthSnapshot | null
}

const W = 760
const H = 170
const BID = 'var(--up)'
const ASK = 'var(--down)'

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(1) : v.toFixed(2)
}

/** 深度图：买盘（绿）/ 卖盘（红）累计量曲线 + 最优价标记 */
export function DepthChart({ symbol, depth }: DepthChartProps) {
  const render = useMemo(() => {
    if (!depth || depth.bids.length === 0 || depth.asks.length === 0) return null
    const points = aggregateDepth(depth.bids, depth.asks)
    const max = maxTotal(points)
    const { bestBid, bestAsk } = bestPrice(depth.bids, depth.asks)
    const prices = points.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice || 1

    const x = (price: number) => ((price - minPrice) / range) * (W - 70)
    const y = (total: number) => H - 10 - (total / max) * (H - 30)

    const bidPath = points
      .filter((p) => p.side === 'bid')
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.price).toFixed(1)},${y(p.total).toFixed(1)}`)
      .join(' ')
    const askPath = points
      .filter((p) => p.side === 'ask')
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.price).toFixed(1)},${y(p.total).toFixed(1)}`)
      .join(' ')
    const bidArea = `${bidPath} L${x(bestBid).toFixed(1)},${H - 10} L${x(bestBid - range * 0.01).toFixed(1)},${H - 10} Z`
    const askArea = `${askPath} L${x(bestAsk).toFixed(1)},${H - 10} L${x(bestAsk + range * 0.01).toFixed(1)},${H - 10} Z`

    const midX = (x(bestBid) + x(bestAsk)) / 2
    return { x, y, bidPath, askPath, bidArea, askArea, bestBid, bestAsk, midX, max, minPrice, maxPrice }
  }, [depth])

  if (!render) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
        加载盘口深度…
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '6px 16px',
        borderTop: '1px solid #2a2e39',
        background: 'var(--panel)',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>
        盘口深度 · {symbol.replace('USDT', '/USDT')}（实时）
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: 520 }}>
        <path d={render.bidArea} fill={BID} opacity={0.18} />
        <path d={render.askArea} fill={ASK} opacity={0.18} />
        <path d={render.bidPath} fill="none" stroke={BID} strokeWidth={1.5} />
        <path d={render.askPath} fill="none" stroke={ASK} strokeWidth={1.5} />
        {/* 最优价分隔 */}
        <line x1={render.midX} y1={0} x2={render.midX} y2={H - 10} style={{stroke: "var(--placeholder)"}} strokeWidth={1} strokeDasharray="4 3" />
        {/* 价格标签 */}
        <text x={6} y={14} fill={BID} fontSize={10}>买 {fmtPrice(render.bestBid)}</text>
        <text x={W - 100} y={14} fill={ASK} fontSize={10}>卖 {fmtPrice(render.bestAsk)}</text>
        <text x={6} y={H - 14} style={{fill: "var(--placeholder)"}} fontSize={9}>{fmtPrice(render.minPrice)}</text>
        <text x={W - 70} y={H - 14} style={{fill: "var(--placeholder)"}} fontSize={9}>{fmtPrice(render.maxPrice)}</text>
      </svg>
    </div>
  )
}
