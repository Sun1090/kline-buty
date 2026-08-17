import { useMemo, useState } from 'react'
import type { DepthSnapshot } from '../hooks/useDepth'
import { orderBookRows, type OrderBookRow } from '../depth/orderbook'
import { fmtCompact } from '../depth/format'
import { useI18n } from '../i18n'
import type { OrderSide } from '../trade/order'

interface OrderBookProps {
  symbol: string
  depth: DepthSnapshot | null
  /** hover 档位时上报价格（移出传 null），联动主图参考线 */
  onHoverPrice?: (price: number | null) => void
  /** 点击档位时上报价格（再点同档清除），联动主图限价标记线 */
  onMarkPrice?: (price: number) => void
  /** 点击档位的买/卖快捷按钮，打开快速下单（价格预填） */
  onQuickOrder?: (price: number, side: OrderSide) => void
}

const BID = 'var(--up)'
const ASK = 'var(--down)'
const LIMIT = 8

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(1) : v.toFixed(2)
}

function Row({
  row,
  side,
  onHoverPrice,
  onMarkPrice,
  onQuickOrder,
}: {
  row: OrderBookRow
  side: 'bid' | 'ask'
  onHoverPrice?: (price: number | null) => void
  onMarkPrice?: (price: number) => void
  onQuickOrder?: (price: number, side: OrderSide) => void
}) {
  const { t } = useI18n()
  const [hover, setHover] = useState(false)
  const color = side === 'bid' ? BID : ASK
  const tradeSide: OrderSide = side === 'bid' ? 'buy' : 'sell'
  return (
    <div
      data-testid={`ob-${side}`}
      data-price={row.price}
      onMouseEnter={() => {
        setHover(true)
        onHoverPrice?.(row.price)
      }}
      onMouseLeave={() => {
        setHover(false)
        onHoverPrice?.(null)
      }}
      onClick={() => onMarkPrice?.(row.price)}
      title={t('orderBook.markHint')}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        padding: '1px 8px',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
        cursor: 'crosshair',
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
      {hover && onQuickOrder && (
        <button
          data-testid={`qo-${tradeSide}`}
          onClick={(e) => {
            e.stopPropagation()
            onQuickOrder(row.price, tradeSide)
          }}
          style={{
            position: 'absolute',
            left: 2,
            top: 1,
            bottom: 1,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            background: tradeSide === 'buy' ? 'rgba(38,166,154,0.85)' : 'rgba(239,83,80,0.85)',
            color: '#fff',
          }}
        >
          {tradeSide === 'buy' ? t('trade.buy') : t('trade.sell')}
        </button>
      )}
    </div>
  )
}

/** 盘口订单簿：卖盘（上）/ 价差 / 买盘（下），含累计量与占比比例条 */
export function OrderBook({ symbol, depth, onHoverPrice, onMarkPrice, onQuickOrder }: OrderBookProps) {
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
            <Row key={`a${r.price}`} row={r} side="ask" onHoverPrice={onHoverPrice} onMarkPrice={onMarkPrice} onQuickOrder={onQuickOrder} />
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
            <Row key={`b${r.price}`} row={r} side="bid" onHoverPrice={onHoverPrice} onMarkPrice={onMarkPrice} onQuickOrder={onQuickOrder} />
          ))}
        </>
      )}
    </div>
  )
}
