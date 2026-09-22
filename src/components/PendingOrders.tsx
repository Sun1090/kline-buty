import { useState, type CSSProperties } from 'react'
import type { PendingOrder } from '../trade/pending'
import { fmtPriceCompact } from '../utils/format'
import { fmtCompact } from '../depth/format'
import { useI18n } from '../i18n/useI18n'

interface PendingOrdersProps {
  orders: PendingOrder[]
  /** 当前品种最新价：改价时用于重算跨价差（费率归属） */
  currentPrice?: number | null
  /** 当前主图品种（行内高亮） */
  symbol: string
  onCancel: (id: string) => void
  /** 改价：返回 false 表示未受理（订单已被撮合/撤销或数值非法），行内报错 */
  onEdit?: (id: string, patch: { price: number; qty: number }, marketPrice?: number | null) => boolean
  /** 点击行切主图品种（未传则行不可点击） */
  onSwitchSymbol?: (symbol: string) => void
}

const tinyBtn: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--text-faint)',
  cursor: 'pointer',
  fontSize: 10,
  padding: '1px 6px',
}

/** 限价挂单列表：方向/挂单价/数量 + 改价 + 撤销；空态保留标题行，避免面板高度跳动 */
export function PendingOrders({ orders, symbol, onCancel, onEdit, currentPrice, onSwitchSymbol }: PendingOrdersProps) {
  const { t } = useI18n()
  // 一次只展开一条挂单的编辑器；数量与价格以字符串承载，确认时才校验
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ price: string; qty: string }>({ price: '', qty: '' })
  const [error, setError] = useState(false)

  const openEditor = (o: PendingOrder) => {
    setEditId(o.id)
    setError(false)
    setDraft({ price: String(o.price), qty: String(o.qty) })
  }

  const submit = (id: string) => {
    const price = Number(draft.price)
    const qty = Number(draft.qty)
    // 改价按当下挂价重算 Maker / Taker 归属，故把最新价一并交给上层
    const ok = Number.isFinite(price) && price > 0 && Number.isFinite(qty) && qty > 0 && onEdit?.(id, { price, qty }, currentPrice ?? null)
    if (!ok) {
      setError(true)
      return
    }
    setEditId(null)
  }

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
          <div key={o.id}>
            <div
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
              {(o.takeProfit != null || o.stopLoss != null) && (
                <span
                  data-testid={`pending-order-levels-${o.id}`}
                  title={`${t('position.levels')}: ${o.takeProfit ?? '-'} / ${o.stopLoss ?? '-'}`}
                  style={{ color: 'var(--text-faint)', fontSize: 10, whiteSpace: 'nowrap' }}
                >
                  TP/SL
                </span>
              )}
              {onEdit && (
                <button
                  data-testid={`pending-order-edit-${o.id}`}
                  aria-expanded={editId === o.id}
                  aria-label={`${t('trade.editOrder')} ${o.symbol}`}
                  style={tinyBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (editId === o.id) setEditId(null)
                    else openEditor(o)
                  }}
                >
                  {t('trade.editOrder')}
                </button>
              )}
              <button
                data-testid="pending-order-cancel"
                aria-label={`${t('trade.cancelOrder')} ${o.symbol}`}
                style={tinyBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel(o.id)
                }}
              >
                {t('trade.cancelOrder')}
              </button>
            </div>
            {onEdit && editId === o.id && (
              <div
                data-testid={`pending-order-editor-${o.id}`}
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontSize: 11, padding: '2px 0 4px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t('common.price')}
                  <input
                    data-testid={`pending-order-price-${o.id}`}
                    type="number"
                    step="any"
                    min="0"
                    value={draft.price}
                    onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                    style={{ width: 88, fontSize: 11, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t('tape.qty')}
                  <input
                    data-testid={`pending-order-qty-${o.id}`}
                    type="number"
                    step="any"
                    min="0"
                    value={draft.qty}
                    onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))}
                    style={{ width: 64, fontSize: 11, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </label>
                <button data-testid={`pending-order-edit-confirm-${o.id}`} style={tinyBtn} onClick={() => submit(o.id)}>
                  {t('common.confirm')}
                </button>
                <button data-testid={`pending-order-edit-cancel-${o.id}`} style={tinyBtn} onClick={() => setEditId(null)}>
                  {t('common.cancel')}
                </button>
                {error && (
                  <span data-testid="pending-order-edit-error" style={{ color: 'var(--down)', fontSize: 10 }}>
                    {t('trade.editErr')}
                  </span>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
