import type { PendingOrder } from '../trade/pending'
import { fmtPriceCompact } from '../utils/format'
import { fmtCompact } from '../depth/format'
import { useI18n } from '../i18n/useI18n'

interface PendingOrdersProps {
  orders: PendingOrder[]
  /** 当前主图品种（行内高亮） */
  symbol: string
  onCancel: (id: string) => void
  /** 点击行切主图品种（未传则行不可点击） */
  onSwitchSymbol?: (symbol: string) => void
}

/** 限价挂单列表：方向/挂单价/数量 + 撤销；空态保留标题行，避免面板高度跳动 */
export function PendingOrders({ orders, symbol, onCancel, onSwitchSymbol }: PendingOrdersProps) {
  const { t } = useI18n()
  return (
    <div
      data-testid="pending-orders"
      style={{ borderTop: '1px dashed var(--border)', marginTop: 8, paddingTop: 6 }}
      role="region"
      aria-label={t('trade.pendingTitle')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('trade.pendingTitle')}</span>
        <span data-testid="pending-orders-count" style={{ fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
          {orders.length}
        </span>
      </div>
      {orders.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 0 4px' }}>{t('trade.pendingEmpty')}</div>
      ) : (
        orders.map((o) => (
          <div
            key={o.id}
            data-testid="pending-order-row"
            data-symbol={o.symbol}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              padding: '2px 0',
              fontVariantNumeric: 'tabular-nums',
              cursor: onSwitchSymbol && o.symbol !== symbol ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (onSwitchSymbol && o.symbol !== symbol) onSwitchSymbol(o.symbol)
            }}
          >
            <b style={{ color: o.side === 'buy' ? 'var(--up)' : 'var(--down)', minWidth: 26 }}>
              {o.side === 'buy' ? t('trade.buy') : t('trade.sell')}
            </b>
            <span style={{ color: o.symbol === symbol ? 'var(--text)' : 'var(--text-dim)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {o.symbol}
            </span>
            <span style={{ flex: 1, textAlign: 'right' }}>{fmtPriceCompact(o.price)}</span>
            <span style={{ color: 'var(--text-dim)' }}>×{fmtCompact(o.qty)}</span>
            <button
              data-testid="pending-order-cancel"
              aria-label={`${t('trade.cancelOrder')} ${o.symbol}`}
              onClick={(e) => {
                e.stopPropagation()
                onCancel(o.id)
              }}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'transparent',
                color: 'var(--text-faint)',
                cursor: 'pointer',
                fontSize: 10,
                padding: '1px 6px',
              }}
            >
              {t('trade.cancelOrder')}
            </button>
          </div>
        ))
      )}
    </div>
  )
}
