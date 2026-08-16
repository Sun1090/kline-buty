import { useId, useMemo } from 'react'
import type { DepthSnapshot } from '../hooks/useDepth'
import { aggregateDepth, maxTotal, bestPrice } from '../depth/aggregate'
import { fmtCompact, sideTotals, spreadOf } from '../depth/format'
import { useI18n } from '../i18n'

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

/** 深度图：买卖盘累计量曲线 + 渐变填充 + 最优价/价差/总量标注 */
export function DepthChart({ symbol, depth }: DepthChartProps) {
  const { t } = useI18n()
  const gradId = useId().replace(/:/g, '')
  const render = useMemo(() => {
    if (!depth || depth.bids.length === 0 || depth.asks.length === 0) return null
    const points = aggregateDepth(depth.bids, depth.asks)
    const max = maxTotal(points)
    const { bestBid, bestAsk } = bestPrice(depth.bids, depth.asks)
    const { bidTotal, askTotal } = sideTotals(points)
    const spread = spreadOf(bestBid, bestAsk)
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
    // 买盘曲线远端（价格最低，累计最大）与卖盘曲线远端（价格最高）
    const bidEnd = points.filter((p) => p.side === 'bid').reduce((a, b) => (a.price < b.price ? a : b))
    const askEnd = points.filter((p) => p.side === 'ask').reduce((a, b) => (a.price > b.price ? a : b))
    const bidStart = points.find((p) => p.side === 'bid')
    const askStart = points.find((p) => p.side === 'ask')
    return {
      x, y, bidPath, askPath, bidArea, askArea,
      bestBid, bestAsk, midX, max, minPrice, maxPrice,
      bidTotal, askTotal, spread,
      bidEnd, askEnd, bidStart, askStart,
    }
  }, [depth])

  if (!render) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
        {t('status.depthLoading')}
      </div>
    )
  }

  const bidGrad = `url(#bidGrad-${gradId})`
  const askGrad = `url(#askGrad-${gradId})`

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
        {t('depth.title', { symbol: symbol.replace('USDT', '/USDT') })}
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: 520 }} data-testid="depth-chart">
        <defs>
          <linearGradient id={`bidGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BID} stopOpacity={0.4} />
            <stop offset="100%" stopColor={BID} stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id={`askGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ASK} stopOpacity={0.4} />
            <stop offset="100%" stopColor={ASK} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <path d={render.bidArea} fill={bidGrad} />
        <path d={render.askArea} fill={askGrad} />
        <path d={render.bidPath} fill="none" stroke={BID} strokeWidth={1.5} />
        <path d={render.askPath} fill="none" stroke={ASK} strokeWidth={1.5} />
        {/* 最优价起点圆点 */}
        {render.bidStart && <circle cx={render.x(render.bidStart.price)} cy={render.y(render.bidStart.total)} r={2.5} fill={BID} />}
        {render.askStart && <circle cx={render.x(render.askStart.price)} cy={render.y(render.askStart.total)} r={2.5} fill={ASK} />}
        {/* 最优价分隔 + 价差 */}
        <line x1={render.midX} y1={0} x2={render.midX} y2={H - 10} style={{ stroke: 'var(--placeholder)' }} strokeWidth={1} strokeDasharray="4 3" />
        <text x={render.midX - 4} y={16} textAnchor="end" fill="var(--text-dim)" fontSize={9}>
          spread {fmtPrice(render.spread)}
        </text>
        {/* 买卖盘累计总量标注（曲线远端） */}
        <text x={6} y={Math.max(render.y(render.bidEnd.total) - 4, 12)} fill={BID} fontSize={10} fontWeight={600}>
          {t('depth.bid')} {fmtCompact(render.bidTotal)}
        </text>
        <text x={W - 74} y={Math.max(render.y(render.askEnd.total) - 4, 12)} textAnchor="end" fill={ASK} fontSize={10} fontWeight={600}>
          {t('depth.ask')} {fmtCompact(render.askTotal)}
        </text>
        {/* 最优价标签 */}
        <text x={6} y={14} fill={BID} fontSize={10}>{fmtPrice(render.bestBid)}</text>
        <text x={W - 100} y={14} fill={ASK} fontSize={10}>{fmtPrice(render.bestAsk)}</text>
        {/* 价格范围 */}
        <text x={6} y={H - 14} style={{ fill: 'var(--placeholder)' }} fontSize={9}>{fmtPrice(render.minPrice)}</text>
        <text x={W - 70} y={H - 14} style={{ fill: 'var(--placeholder)' }} fontSize={9}>{fmtPrice(render.maxPrice)}</text>
      </svg>
    </div>
  )
}
