import { useMemo, useRef, useState } from 'react'
import { estimateOrder, DEFAULT_SLIPPAGE_RATIO, MAKER_FEE_RATE, TAKER_FEE_RATE, type OrderSide } from '../trade/order'
import { attachedLevelsOk, isMarketable } from '../trade/pending'
import { parseLevel } from '../position/levels'
import { useDepth } from '../hooks/useDepth'
import { useI18n } from '../i18n/useI18n'
import { useFocusTrap } from '../hooks/useFocusTrap'

/** 下单类型：市价（即时成交、计滑点）/ 限价（挂单，触价按当时市场价成交） */
export type OrderType = 'market' | 'limit'

/** 限价单可随带的止盈/止损价（null = 不附带），成交后写进新开仓位的价位线 */
export interface QuickOrderAttach {
  takeProfit: number | null
  stopLoss: number | null
}

interface QuickOrderProps {
  symbol: string
  side: OrderSide
  price: number
  /** 盘口买一/卖一价（可选）：一键填入价格输入框 */
  bid?: number | null
  ask?: number | null
  /** 模拟账户可用余额（USDT）：传入时显示并拦截保证金不足 */
  balance?: number | null
  /** 吃单/挂单费率（可选，默认内置常量）：限价模式不计滑点，跨参考价的按吃单费率、挂在盘口等价的按挂单费率 */
  takerFeeRate?: number
  makerFeeRate?: number
  /** 打开时的下单类型（默认市价）：图表右键「挂限价单」传 limit */
  initialType?: OrderType
  onConfirm: (order: { side: OrderSide; price: number; qty: number; type: OrderType } & QuickOrderAttach) => void
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

/**
 * 解析随单止盈/止损两行输入：留空 = 不附带（null）；填坏（非数字、非正）
 * 与站错挂单价一侧都算不成立——`parseLevel` 用 undefined 表示「填了但坏了」，
 * 必须折成非法值再交给 `attachedLevelsOk`，否则 'abc' 会被当成未设置而放行。
 */
function parseAttach(side: OrderSide, price: number, tpStr: string, slStr: string): { attach: QuickOrderAttach; ok: boolean } {
  const tp = parseLevel(tpStr)
  const sl = parseLevel(slStr)
  return {
    attach: { takeProfit: typeof tp === 'number' ? tp : null, stopLoss: typeof sl === 'number' ? sl : null },
    ok: attachedLevelsOk(side, price, {
      takeProfit: tp === undefined ? Number.NaN : tp,
      stopLoss: sl === undefined ? Number.NaN : sl,
    }),
  }
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

export function QuickOrder({ symbol, side, price, bid, ask, balance, takerFeeRate = TAKER_FEE_RATE, makerFeeRate = MAKER_FEE_RATE, initialType = 'market', onConfirm, onClose }: QuickOrderProps) {
  const { t } = useI18n()
  const [orderType, setOrderType] = useState<OrderType>(initialType)
  const [priceStr, setPriceStr] = useState(String(price))
  const [qtyStr, setQtyStr] = useState('1')
  // v0.5.x 自定义百分比仓位输入（余额占比，含开仓手续费预留）
  const [customPct, setCustomPct] = useState('')
  // 随单止盈/止损（仅限价）：留空即不附带
  const [tpStr, setTpStr] = useState('')
  const [slStr, setSlStr] = useState('')
  // M5 焦点陷阱：下单弹层内 Tab 循环
  const rootRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, rootRef)

  const priceNum = Number(priceStr)
  const qtyNum = Number(qtyStr)
  const valid = Number.isFinite(priceNum) && priceNum > 0 && Number.isFinite(qtyNum) && qtyNum > 0
  // 限价单无滑点；费率看这单的性质：挂在盘口等价按 Maker，下单即跨过参考价按 Taker。市价单按 Taker + 可配滑点
  const isLimit = orderType === 'limit'
  const limitRate = isMarketable({ side, price: priceNum }, price) ? takerFeeRate : makerFeeRate
  const est = useMemo(
    () =>
      valid
        ? estimateOrder(priceNum, qtyNum, side, isLimit ? 0 : DEFAULT_SLIPPAGE_RATIO, isLimit ? limitRate : takerFeeRate)
        : null,
    [valid, priceNum, qtyNum, side, isLimit, limitRate, takerFeeRate],
  )
  const insufficient = est != null && balance != null && est.notional + est.fee > balance
  const { attach, ok: attachOk } = parseAttach(side, priceNum, tpStr, slStr)

  const accent = side === 'buy' ? 'var(--up)' : 'var(--down)'
  // v0.5.x 键盘支持：Enter 确认下单（有效且保证金充足时）、Esc 关闭弹层
  const confirmable = valid && !insufficient && attachOk
  const submit = () => onConfirm({ side, price: priceNum, qty: qtyNum, type: orderType, ...attach })
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && confirmable) {
      e.preventDefault()
      submit()
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

      {/* v0.5.x 下单类型：市价即时成交 / 限价挂单（价格触达后按挂单价成交） */}
      <div data-testid="qo-type" style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['market', 'limit'] as const).map((tp) => (
          <button
            key={tp}
            data-testid={`qo-type-${tp}`}
            onClick={() => {
              setOrderType(tp)
              // 随单价位只对限价单有意义：切走就清空，不留隐形的待提交状态
              if (tp !== 'limit') {
                setTpStr('')
                setSlStr('')
              }
            }}
            aria-pressed={orderType === tp}
            title={t('trade.limitHint')}
            style={{
              flex: 1,
              padding: '3px 0',
              fontSize: 11,
              borderRadius: 4,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: orderType === tp ? 'rgba(41,98,255,0.18)' : 'transparent',
              color: orderType === tp ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            {tp === 'market' ? t('trade.market') : t('trade.limit')}
          </button>
        ))}
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
      {isLimit && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} title={t('quickOrder.attachHint')}>
            <span style={{ color: 'var(--text-dim)', width: 70 }}>{t('position.tpPrice')}</span>
            <input
              data-testid="qo-tp"
              aria-label={t('position.tpPrice')}
              style={inputStyle}
              value={tpStr}
              onChange={(e) => setTpStr(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} title={t('quickOrder.attachHint')}>
            <span style={{ color: 'var(--text-dim)', width: 70 }}>{t('position.slPrice')}</span>
            <input
              data-testid="qo-sl"
              aria-label={t('position.slPrice')}
              style={inputStyle}
              value={slStr}
              onChange={(e) => setSlStr(e.target.value)}
            />
          </div>
          {!attachOk && (
            <div data-testid="qo-attach-err" style={{ color: 'var(--down)', fontSize: 10, marginTop: -4, marginBottom: 8 }}>
              {t('quickOrder.attachErr')}
            </div>
          )}
        </>
      )}
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
          <span data-testid={isLimit ? 'qo-limit-price' : undefined}>
            {isLimit ? t('quickOrder.price') : t('quickOrder.fill')} <b style={{ color: 'var(--text)' }}>{est.fillPrice.toFixed(priceNum >= 1 ? 2 : 6)}</b>
          </span>
          <span>
            {t('quickOrder.notional')} <b style={{ color: 'var(--text)' }}>{est.notional.toFixed(2)}</b>
          </span>
          <span>
            {t('quickOrder.fee')}{' '}
            <b data-testid="qo-fee" style={{ color: 'var(--text)' }}>{est.fee.toFixed(4)}</b>
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
          onClick={() => confirmable && submit()}
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
      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-faint)' }}>
        {isLimit ? t('trade.limitHint') : t('quickOrder.hint')}
      </div>
    </div>
  )
}

/** 带盘口的快捷下单面板：仅在挂载期间（面板打开时）订阅深度 WS，取买一/卖一供一键填价 */
export function QuickOrderWithDepth(props: Omit<QuickOrderProps, 'bid' | 'ask'>) {
  const snapshot = useDepth(props.symbol, 0, props.price)
  const bid = snapshot?.bids[0]?.price ?? null
  const ask = snapshot?.asks[0]?.price ?? null
  return <QuickOrder {...props} bid={bid} ask={ask} />
}
