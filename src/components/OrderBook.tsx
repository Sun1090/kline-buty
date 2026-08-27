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
/** 聚合精度档位（价格宽度），循环切换；0 = 不聚合（显示 ×1） */
const GROUP_STEPS = [0, 10, 100] as const

function fmtPrice(v: number) {
  return v >= 1000 ? v.toFixed(1) : v.toFixed(2)
}

function Row({
  row,
  side,
  isMaxQty,
  onHoverPrice,
  onMarkPrice,
  onQuickOrder,
}: {
  row: OrderBookRow
  side: 'bid' | 'ask'
  isMaxQty?: boolean
  onHoverPrice?: (price: number | null) => void
  onMarkPrice?: (price: number) => void
  onQuickOrder?: (price: number, side: OrderSide) => void
}) {
  const { t } = useI18n()
  const color = side === 'bid' ? BID : ASK
  const tradeSide: OrderSide = side === 'bid' ? 'buy' : 'sell'
  return (
    <div
      data-testid={`ob-${side}`}
      data-price={row.price}
      data-max-qty={isMaxQty ? 'true' : 'false'}
      onMouseEnter={() => onHoverPrice?.(row.price)}
      onMouseLeave={() => onHoverPrice?.(null)}
      onClick={() => onMarkPrice?.(row.price)}
      title={t('orderBook.markHint')}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '44px minmax(0, 1fr) 52px minmax(0, 1fr)',
        alignItems: 'center',
        gap: 4,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: isMaxQty ? 700 : 400,
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
          opacity: isMaxQty ? 0.26 : 0.14,
          pointerEvents: 'none',
        }}
      />
      {onQuickOrder ? (
        <button
          data-testid={`qo-${tradeSide}`}
          aria-label={`${t('quickOrder.title')} ${fmtPrice(row.price)}`}
          onClick={(e) => {
            e.stopPropagation()
            onQuickOrder(row.price, tradeSide)
          }}
          style={{
            minWidth: 36,
            padding: '2px 5px',
            border: 'none',
            borderRadius: 3,
            fontSize: 10,
            lineHeight: 1.3,
            fontWeight: 600,
            cursor: 'pointer',
            background: tradeSide === 'buy' ? 'rgba(38,166,154,0.9)' : 'rgba(239,83,80,0.9)',
            color: '#fff',
          }}
        >
          {tradeSide === 'buy' ? t('trade.buy') : t('trade.sell')}
        </button>
      ) : (
        <span />
      )}
      <span style={{ color }}>{fmtPrice(row.price)}</span>
      <span style={{ color: isMaxQty ? color : 'var(--text-dim)', textAlign: 'right', minWidth: 0 }}>
        {fmtCompact(row.quantity)}
      </span>
      <span style={{ color: 'var(--text-faint)', textAlign: 'right', minWidth: 0 }}>{fmtCompact(row.cumulative)}</span>
    </div>
  )
}

/** 盘口订单簿：卖盘（上）/ 价差 / 买盘（下），含累计量与占比比例条；支持价格聚合精度切换 */
export function OrderBook({ symbol, depth, onHoverPrice, onMarkPrice, onQuickOrder }: OrderBookProps) {
  const { t } = useI18n()
  const [groupIdx, setGroupIdx] = useState(0)
  const groupSize = GROUP_STEPS[groupIdx]
  const data = useMemo(() => orderBookRows(depth ?? { bids: [], asks: [] }, LIMIT, groupSize), [depth, groupSize])
  const hasData = data.bids.length > 0 && data.asks.length > 0
  // 买卖各自最大挂单量档位（强调：粗字重 + 高亮色 + 更亮背景条）
  const maxBidQty = useMemo(() => data.bids.reduce((m, r) => Math.max(m, r.quantity), 0), [data.bids])
  const maxAskQty = useMemo(() => data.asks.reduce((m, r) => Math.max(m, r.quantity), 0), [data.asks])

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {t('orderBook.title', { symbol: symbol.replace('USDT', '/USDT') })}
        </span>
        <button
          data-testid="ob-group-toggle"
          onClick={() => setGroupIdx((i) => (i + 1) % GROUP_STEPS.length)}
          title={t('orderBook.group')}
          style={{
            border: '1px solid #2a2e39',
            borderRadius: 4,
            background: 'transparent',
            color: groupIdx > 0 ? 'var(--yellow)' : 'var(--text-faint)',
            cursor: 'pointer',
            fontSize: 10,
            padding: '1px 6px',
          }}
        >
          {t('orderBook.group')} ×{groupSize === 0 ? 1 : groupSize}
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '44px minmax(0, 1fr) 52px minmax(0, 1fr)',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          fontSize: 10,
          color: 'var(--text-faint)',
        }}
      >
        <span />
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
            <Row
              key={`a${r.price}`}
              row={r}
              side="ask"
              isMaxQty={r.quantity === maxAskQty}
              onHoverPrice={onHoverPrice}
              onMarkPrice={onMarkPrice}
              onQuickOrder={onQuickOrder}
            />
          ))}
          <div
            data-testid="ob-spread"
            style={{
              display: 'grid',
              gridTemplateColumns: '44px minmax(0, 1fr) 52px minmax(0, 1fr)',
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
            <Row
              key={`b${r.price}`}
              row={r}
              side="bid"
              isMaxQty={r.quantity === maxBidQty}
              onHoverPrice={onHoverPrice}
              onMarkPrice={onMarkPrice}
              onQuickOrder={onQuickOrder}
            />
          ))}
        </>
      )}
    </div>
  )
}
