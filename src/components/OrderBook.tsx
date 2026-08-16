import { useMemo } from 'react'
import type { DepthSnapshot } from '../hooks/useDepth'
import { orderBookRows, type OrderBookRow } from '../depth/orderbook'
import { fmtCompact } from '../depth/format'
import { useI18n } from '../i18n'

interface OrderBookProps {
  symbol: string
  depth: DepthSnapshot | null
}

const BID = 'var(--up)'
const ASK = 'var(--down)'
const LIMIT = 8

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(1) : v.toFixed(2)
}

function Row({ row, side }: { row: OrderBookRow; side: 'bid' | 'ask' }) {
  const color = side === 'bid' ? BID : ASK
  return (
    <div
      data-testid={`ob-${side}`}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        padding: '1px 8px',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: `${(row.pct * 100).toFixed(1)}%`,
          background: color,
          opacity: 0.14,
          pointerEvents: 'none',
        }}
      />
      <span style={{ color }}>{fmtPrice(row.price)}</span>
      <span style={{ color: 'var(--text-dim)', textAlign: 'right' }}>{fmtCompact(row.quantity)}</span>
      <span style={{ color: 'var(--text-faint)', textAlign: 'right' }}>{fmtCompact(row.cumulative)}</span>
    </div>
  )
}

/** 盘口订单簿：卖盘（上）/ 价差 / 买盘（下），含累计量与占比比例条 */
export function OrderBook({ symbol, depth }: OrderBookProps) {
  const { t } = useI18n()
  const data = useMemo(() => orderBookRows(depth ?? { bids: [], asks: [] }, LIMIT), [depth])
  const hasData = data.bids.length > 0 && data.asks.length > 0

  return (
    <div
      style={{
        padding: '6px 16px',
        borderTop: '1px solid #2a2e39',
        background: 'var(--panel)',
        flexShrink: 0,
        minWidth: 260,
      }}
      data-testid="order-book"
    >
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>
        {t('orderBook.title', { symbol: symbol.replace('USDT', '/USDT') })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: '2px 8px',
          fontSize: 10,
          color: 'var(--text-faint)',
        }}
      >
        <span>{t('common.price')}</span>
        <span style={{ textAlign: 'right' }}>{t('orderBook.qty')}</span>
        <span style={{ textAlign: 'right' }}>{t('orderBook.cum')}</span>
      </div>
      {!hasData ? (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '6px 8px' }}>
          {t('status.depthLoading')}
        </div>
      ) : (
        <>
          {data.asks.map((r) => (
            <Row key={`a${r.price}`} row={r} side="ask" />
          ))}
          <div
            data-testid="ob-spread"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '3px 8px',
              fontSize: 10,
              borderTop: '1px dashed #2a2e39',
              borderBottom: '1px dashed #2a2e39',
              color: 'var(--text-dim)',
            }}
          >
            <span>{t('orderBook.spread')}</span>
            <span style={{ textAlign: 'right' }}>{fmtPrice(data.spread)}</span>
            <span />
          </div>
          {data.bids.map((r) => (
            <Row key={`b${r.price}`} row={r} side="bid" />
          ))}
        </>
      )}
    </div>
  )
}
