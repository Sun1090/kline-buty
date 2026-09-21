import { useMemo, useRef, useState } from 'react'
import { estimateOrder, DEFAULT_SLIPPAGE_RATIO, TAKER_FEE_RATE, type OrderSide } from '../trade/order'
import { useDepth } from '../hooks/useDepth'
import { useI18n } from '../i18n/useI18n'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface QuickOrderProps {
  symbol: string
  side: OrderSide
  price: number
  /** 盘口买一/卖一价（可选）：一键填入价格输入框 */
  bid?: number | null
  ask?: number | null
  /** 模拟账户可用余额（USDT）：传入时显示并拦截保证金不足 */
  balance?: number | null
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

/** D8 手数预设：常用数量一键填入（覆盖 BTC 级别小数与主流币整数档） */
const QTY_PRESETS = [0.001, 0.01, 0.1, 1, 5, 10]

/** 快速下单浮动面板：盘口档位价格预填，数量/预估金额/手续费实时计算，确认后写入模拟仓位 */
const fillBtnStyle = (color: string): React.CSSProperties => ({
  border: '1px solid var(--border)',
  background: 'transparent',
  color,
  fontSize: 11,
  cursor: 'pointer',
  padding: '2px 8px',
  borderRadius: 4,
  fontVariantNumeric: 'tabular-nums',
})

export function QuickOrder({ symbol, side, price, bid, ask, balance, onConfirm, onClose }: QuickOrderProps) {
  const { t } = useI18n()
  const [priceStr, setPriceStr] = useState(String(price))
  const [qtyStr, setQtyStr] = useState('1')
  // v0.5.x 自定义百分比仓位输入（余额占比，含开仓手续费预留）
  const [customPct, setCustomPct] = useState('')
  // M5 焦点陷阱：下单弹层内 Tab 循环
  const rootRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, rootRef)

  const priceNum = Number(priceStr)
  const qtyNum = Number(qtyStr)
  const valid = Number.isFinite(priceNum) && priceNum > 0 && Number.isFinite(qtyNum) && qtyNum > 0
  const est = useMemo(
    () => (valid ? estimateOrder(priceNum, qtyNum, side, DEFAULT_SLIPPAGE_RATIO) : null),
    [valid, priceNum, qtyNum, side],
  )
  const insufficient = est != null && balance != null && est.notional + est.fee > balance

  const accent = side === 'buy' ? 'var(--up)' : 'var(--down)'
  // v0.5.x 键盘支持：Enter 确认下单（有效且保证金充足时）、Esc 关闭弹层
  const confirmable = valid && !insufficient
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && confirmable) {
      e.preventDefault()
      onConfirm({ side, price: priceNum, qty: qtyNum })
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      ref={rootRef}
      data-testid="quick-order"
      onKeyDown={handleKeyDown}
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
        <span style={{ color: 'var(--text-dim)', width: 70 }} />
        {bid != null && (
          <button data-testid="qo-bid" onClick={() => setPriceStr(String(bid))} title={t('quickOrder.bid')} style={fillBtnStyle('var(--down)')}>
            {t('quickOrder.bid')} {bid}
          </button>
        )}
        {ask != null && (
          <button data-testid="qo-ask" onClick={() => setPriceStr(String(ask))} title={t('quickOrder.ask')} style={fillBtnStyle('var(--up)')}>
            {t('quickOrder.ask')} {ask}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', width: 70 }}>{t('quickOrder.qty')}</span>
        <input data-testid="qo-qty" style={inputStyle} value={qtyStr} onChange={(e) => setQtyStr(e.target.value)} />
      </div>
      {/* D8 手数预设：一键填入常用数量 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', width: 70 }} />
        {QTY_PRESETS.map((q) => (
          <button
            key={q}
            data-testid={`qo-qty-${q}`}
            onClick={() => setQtyStr(String(q))}
            title={t('quickOrder.qtyPreset')}
            style={fillBtnStyle('var(--text-dim)')}
          >
            {q}
          </button>
        ))}
      </div>
      {balance != null && priceNum > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-dim)', width: 70 }} />
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              data-testid={`qo-pct-${pct}`}
              onClick={() => {
                // 仓位 = 余额 × pct ÷ (价格 × (1 + 费率))：预留开仓手续费
                const maxQty = (balance * (pct / 100)) / (priceNum * (1 + TAKER_FEE_RATE))
                const step = maxQty >= 1 ? 0.001 : 0.000001
                setQtyStr(String(Math.floor(maxQty / step) * step))
              }}
              style={fillBtnStyle('var(--accent)')}
            >
              {pct}%
            </button>
          ))}
          {/* v0.5.x 自定义百分比仓位 */}
          <input
            data-testid="qo-pct-custom-input"
            type="number"
            min={0}
            max={100}
            value={customPct}
            onChange={(e) => setCustomPct(e.target.value)}
            placeholder={t('quickOrder.customPct')}
            aria-label={t('quickOrder.customPct')}
            style={{
              width: 46,
              padding: '2px 4px',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          <button
            data-testid="qo-pct-custom-apply"
            onClick={() => {
              const pct = Number(customPct)
              if (!(pct > 0)) return
              const maxQty = (balance * (pct / 100)) / (priceNum * (1 + TAKER_FEE_RATE))
              const step = maxQty >= 1 ? 0.001 : 0.000001
              setQtyStr(String(Math.floor(maxQty / step) * step))
            }}
            title={t('quickOrder.customPct')}
            style={fillBtnStyle('var(--yellow)')}
          >
            {t('quickOrder.apply')}
          </button>
        </div>
      )}

      {balance != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-dim)', width: 70 }}>{t('quickOrder.balance')}</span>
          <b data-testid="qo-balance" style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {balance.toFixed(2)} USDT
          </b>
        </div>
      )}
      {insufficient && (
        <div data-testid="qo-insufficient" style={{ color: 'var(--down)', fontSize: 11, marginBottom: 8 }}>
          {t('quickOrder.insufficient')}
        </div>
      )}
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
            {t('quickOrder.fill')} <b style={{ color: 'var(--text)' }}>{est.fillPrice.toFixed(priceNum >= 1 ? 2 : 6)}</b>
          </span>
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
          disabled={!confirmable}
          onClick={() => confirmable && onConfirm({ side, price: priceNum, qty: qtyNum })}
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

/** 带盘口的快捷下单面板：仅在挂载期间（面板打开时）订阅深度 WS，取买一/卖一供一键填价 */
export function QuickOrderWithDepth(props: Omit<QuickOrderProps, 'bid' | 'ask'>) {
  const snapshot = useDepth(props.symbol)
  const bid = snapshot?.bids[0]?.price ?? null
  const ask = snapshot?.asks[0]?.price ?? null
  return <QuickOrder {...props} bid={bid} ask={ask} />
}
