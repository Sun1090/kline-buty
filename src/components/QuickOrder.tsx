import { useMemo, useState } from 'react'
import { estimateOrder, type OrderSide } from '../trade/order'
import { useI18n } from '../i18n'

interface QuickOrderProps {
  symbol: string
  side: OrderSide
  price: number
  onConfirm: (order: { side: OrderSide; price: number; qty: number }) => void
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #2a2e39',
  background: 'var(--bg)',
  color: 'var(--text)',
  boxSizing: 'border-box',
}

/** 快速下单浮动面板：盘口档位价格预填，数量/预估金额/手续费实时计算，确认后写入模拟仓位 */
export function QuickOrder({ symbol, side, price, onConfirm, onClose }: QuickOrderProps) {
  const { t } = useI18n()
  const [priceStr, setPriceStr] = useState(String(price))
  const [qtyStr, setQtyStr] = useState('1')

  const priceNum = Number(priceStr)
  const qtyNum = Number(qtyStr)
  const valid = Number.isFinite(priceNum) && priceNum > 0 && Number.isFinite(qtyNum) && qtyNum > 0
  const est = useMemo(
    () => (valid ? estimateOrder(priceNum, qtyNum) : null),
    [valid, priceNum, qtyNum],
  )

  const accent = side === 'buy' ? 'var(--up)' : 'var(--down)'

  return (
    <div
      data-testid="quick-order"
      style={{
        position: 'absolute',
        top: 56,
        right: 16,
        zIndex: 130,
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        padding: '12px 14px',
        fontSize: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 240,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>
          {t('quickOrder.title')} · {symbol.replace('USDT', '/USDT')}
        </span>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 13, padding: 0 }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '4px 0',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: side === 'buy' ? 'rgba(38,166,154,0.2)' : 'rgba(239,83,80,0.2)',
            color: accent,
          }}
        >
          {side === 'buy' ? t('trade.buy') : t('trade.sell')}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', width: 70 }}>{t('quickOrder.price')}</span>
        <input data-testid="qo-price" style={inputStyle} value={priceStr} onChange={(e) => setPriceStr(e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', width: 70 }}>{t('quickOrder.qty')}</span>
        <input data-testid="qo-qty" style={inputStyle} value={qtyStr} onChange={(e) => setQtyStr(e.target.value)} />
      </div>

      {est && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 10,
            borderTop: '1px dashed #2a2e39',
            paddingTop: 8,
            color: 'var(--text-dim)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>
            {t('quickOrder.notional')} <b style={{ color: 'var(--text)' }}>{est.notional.toFixed(2)}</b>
          </span>
          <span>
            {t('quickOrder.fee')} <b style={{ color: 'var(--text)' }}>{est.fee.toFixed(4)}</b>
          </span>
          <span>
            {t('quickOrder.total')} <b style={{ color: 'var(--text)' }}>{est.total.toFixed(2)}</b>
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          data-testid="qo-confirm"
          disabled={!valid}
          onClick={() => valid && onConfirm({ side, price: priceNum, qty: qtyNum })}
          style={{
            flex: 1,
            padding: '5px 0',
            border: 'none',
            borderRadius: 4,
            cursor: valid ? 'pointer' : 'not-allowed',
            background: accent,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            opacity: valid ? 1 : 0.4,
          }}
        >
          {t('quickOrder.confirm')}
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-faint)' }}>{t('quickOrder.hint')}</div>
    </div>
  )
}
