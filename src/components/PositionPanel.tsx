import { useRef, useState } from 'react'
import type { Position } from '../position/pnl'
import { calcPnl, calcLiquidationPrice, calcMargin, liquidationRisk, marginRate, suggestLevels } from '../position/pnl'
import { applyLevels, breakevenStop, type LevelError, type LevelInput } from '../position/levels'
import { EMPTY_POSITIONS, planReduce, type Positions } from '../trade/positions'
import type { PendingOrder } from '../trade/pending'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useI18n } from '../i18n/useI18n'
import { PendingOrders } from './PendingOrders'

interface PositionPanelProps {
  /** J1 双向持仓：long/short 各自独立 */
  positions: Positions
  currentPrice: number | null
  /** v0.5 可用余额（USDT）：头部显示账户总览 */
  balance?: number | null
  /** 开仓变更回调（传入新的 positions 容器） */
  onChange: (p: Positions) => void
  /** J2 其他品种持仓一览（key=symbol；不含当前品种） */
  otherSymbols?: Record<string, Positions>
  /** J2 切到某品种查看/平仓 */
  onSwitchSymbol?: (symbol: string) => void
  /** J2 平掉某品种全部持仓（含其多空） */
  onSettleSymbol?: (symbol: string) => void
  /** v0.5.x 反手：平掉指定方向并以现价同量开反向仓（记账由父层完成） */
  onReverse?: (slot: 'long' | 'short') => void
  /** v0.5.x 部分平仓：减掉 qty 数量，剩余仓位保留原开仓价与价位线（记账由父层完成） */
  onReduce?: (slot: 'long' | 'short', qty: number) => void
  /** v0.5.x 今日已实现盈亏（USDT）：账户总览展示，无则传 null 显占位 */
  todayPnl?: number | null
  /** v0.5.x 限价挂单列表（含其他品种）：当前品种 + 撤销回调 */
  symbol?: string
  pendingOrders?: PendingOrder[]
  onCancelOrder?: (id: string) => void
}

/** 杠杆档位速选（D1：模拟交易杠杆选择） */
const LEVERAGE_OPTIONS = [1, 2, 5, 10, 20, 50, 100]

const inputStyle: React.CSSProperties = {
  width: 88,
  padding: '4px 6px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #2a2e39',
  background: 'var(--bg)',
  color: 'var(--text)',
}

const DIRECTION_ROW: { key: 'long' | 'short'; label: 'position.long' | 'position.short' }[] = [
  { key: 'long', label: 'position.long' },
  { key: 'short', label: 'position.short' },
]

export function PositionPanel({ positions, currentPrice, balance, onChange, otherSymbols, onSwitchSymbol, onSettleSymbol, onReverse, onReduce, todayPnl, symbol, pendingOrders, onCancelOrder }: PositionPanelProps) {
  const { t } = useI18n()
  const [entry, setEntry] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [leverage, setLeverage] = useState(10)
  const [tpPct, setTpPct] = useState('3')
  const [slPct, setSlPct] = useState('2')
  // 止盈/止损模式：pct=百分比参考价，price=手动输入价位
  const [levelMode, setLevelMode] = useState<'pct' | 'price'>('pct')
  const [tpPrice, setTpPrice] = useState<string>('')
  const [slPrice, setSlPrice] = useState<string>('')
  // v0.5.x 已开仓位的止盈/止损行内编辑：一次只展开一个方向
  const [levelEdit, setLevelEdit] = useState<'long' | 'short' | null>(null)
  const [levelDraft, setLevelDraft] = useState<LevelInput>({ takeProfit: '', stopLoss: '', trail: '' })
  const [levelError, setLevelError] = useState<LevelError | null>(null)
  // v0.5.x 部分平仓：一次只展开一个方向的减仓编辑器，数量以字符串承载
  const [reduceEdit, setReduceEdit] = useState<'long' | 'short' | null>(null)
  const [reduceDraft, setReduceDraft] = useState<string>('')
  const [reduceError, setReduceError] = useState<boolean>(false)
  // F4 焦点陷阱：Tab 在面板内循环，关闭恢复焦点
  const rootRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, rootRef)
  // v0.5 当前品种浮动盈亏（多空合计；无现价/无持仓 → 0）
  const hasPos = Boolean(positions.long || positions.short)
  const floating = (() => {
    if (currentPrice === null || !hasPos) return 0
    const long = positions.long ? calcPnl(positions.long, currentPrice).pnl : 0
    const short = positions.short ? calcPnl(positions.short, currentPrice).pnl : 0
    return long + short
  })()

  const entryNum = Number(entry)
  const qtyNum = Number(quantity)
  const valid = Number.isFinite(entryNum) && entryNum > 0 && Number.isFinite(qtyNum) && qtyNum > 0

  const levels = valid ? suggestLevels(entryNum, direction, Number(tpPct) || 0, Number(slPct) || 0) : null
  // D2/D3：保证金与强平价（表单视角展示）
  const margin = valid ? calcMargin(entryNum * qtyNum, leverage) : null
  const liqPrice = valid ? calcLiquidationPrice({ entry: entryNum, quantity: qtyNum, direction }, leverage) : null

  // 价格模式下校验手动输入的止盈/止损价
  const tpNum = Number(tpPrice)
  const slNum = Number(slPrice)
  const priceModeValid =
    levelMode === 'price' &&
    Number.isFinite(tpNum) && tpNum > 0 &&
    Number.isFinite(slNum) && slNum > 0
  const canApply = valid && (levelMode === 'pct' ? !!levels : priceModeValid)

  const apply = () => {
    if (!valid || !canApply) return
    // J1 开仓：仅写对应方向槽位（hedge：buy→long、sell→short）；D9 记录杠杆用于强平预警
    const pos: Position = {
      entry: entryNum,
      quantity: qtyNum,
      direction,
      takeProfit: levelMode === 'pct' ? levels!.takeProfit : tpNum,
      stopLoss: levelMode === 'pct' ? levels!.stopLoss : slNum,
      leverage,
    }
    onChange({ ...positions, [direction]: pos })
    setEntry('')
    setQuantity('')
  }

  const fillPrice = () => {
    if (currentPrice !== null && entry === '') setEntry(currentPrice.toFixed(2))
  }

  const settle = (slot: 'long' | 'short') => {
    onChange({ ...positions, [slot]: null })
  }

  /** 展开减仓编辑器：默认填一半数量（浮点结果按 12 位有效数字收窄，避免一长串尾数） */
  const openReduceEditor = (slot: 'long' | 'short') => {
    const p = positions[slot]
    if (!p) return
    setReduceEdit(slot)
    setReduceError(false)
    setReduceDraft(String(Number((p.quantity / 2).toPrecision(12))))
  }

  /** 提交减仓：数量非法或超过持仓量时面板内报错、不回调 */
  const submitReduce = (slot: 'long' | 'short') => {
    const p = positions[slot]
    if (!p) return
    const plan = planReduce(p, Number(reduceDraft))
    if (!plan) {
      setReduceError(true)
      return
    }
    setReduceEdit(null)
    onReduce?.(slot, plan.qty)
  }

  /** 按比例快捷减仓：直接按该比例减掉，不再弹编辑器 */
  const reduceByRatio = (slot: 'long' | 'short', ratio: number) => {
    const p = positions[slot]
    if (!p) return
    const plan = planReduce(p, Number((p.quantity * ratio).toPrecision(12)))
    if (!plan) {
      setReduceError(true)
      return
    }
    setReduceEdit(null)
    onReduce?.(slot, plan.qty)
  }

  /** 展开某方向的价位编辑器：以当前止盈/止损预填，空槽位留空 */
  const openLevelEditor = (slot: 'long' | 'short') => {
    const p = positions[slot]
    if (!p) return
    setLevelEdit(slot)
    setLevelError(null)
    setLevelDraft({
      takeProfit: p.takeProfit !== undefined ? String(p.takeProfit) : '',
      stopLoss: p.stopLoss !== undefined ? String(p.stopLoss) : '',
      trail: p.trailPct !== undefined ? String(p.trailPct) : '',
    })
  }

  const saveLevels = (slot: 'long' | 'short') => {
    const p = positions[slot]
    if (!p) return
    const res = applyLevels(p, levelDraft, currentPrice)
    if (!res.ok) {
      setLevelError(res.error)
      return
    }
    onChange({ ...positions, [slot]: res.position })
    setLevelEdit(null)
  }

  /** 一键把止损移到开仓价（保本），编辑器同步显示 */
  const applyBreakeven = (slot: 'long' | 'short') => {
    const p = positions[slot]
    if (!p) return
    onChange({ ...positions, [slot]: breakevenStop(p) })
    setLevelDraft((d) => ({ ...d, stopLoss: String(p.entry) }))
    setLevelError(null)
  }

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={t('position.title')}
      style={{
        position: 'absolute',
        top: 52,
        right: 16,
        zIndex: 100,
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
        <span style={{ fontWeight: 600 }}>{t('position.title')}</span>
        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>
          {positions.long || positions.short ? `${t('position.hedgeMode')} · 2/2` : ''}
        </span>
      </div>

      {/* v0.5 账户总览：可用余额 + 当前品种浮动盈亏（多空合计）+ 今日已实现盈亏 */}
      {balance != null && (
        <div
          data-testid="position-account-summary"
          style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-faint)', padding: '4px 0 8px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}
        >
          <span>
            {t('position.balance')}{' '}
            <b style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{balance.toFixed(2)}</b>
          </span>
          <span>
            {t('position.unrealized')}{' '}
            <b
              style={{
                color: hasPos && currentPrice !== null ? (floating >= 0 ? 'var(--up)' : 'var(--down)') : 'var(--text-faint)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {hasPos && currentPrice !== null ? `${floating >= 0 ? '+' : ''}${floating.toFixed(2)}` : '—'}
            </b>
          </span>
          {todayPnl != null && (
            <span>
              {t('position.todayPnl')}{' '}
              <b
                data-testid="position-today-pnl"
                style={{
                  color: todayPnl >= 0 ? 'var(--up)' : 'var(--down)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {todayPnl >= 0 ? '+' : ''}
                {todayPnl.toFixed(2)}
              </b>
            </span>
          )}
        </div>
      )}

      {/* J1 双向持仓列表：多空各自显示，独立平仓 */}
      <div style={{ marginBottom: 10 }}>
        {DIRECTION_ROW.map(({ key, label }) => {
          const p = positions[key]
          if (!p) return null
          const active = currentPrice !== null ? calcPnl(p, currentPrice) : null
          const color = active ? (active.pnl >= 0 ? 'var(--up)' : 'var(--down)') : 'var(--text-faint)'
          // D2 动态保证金率：全额保证金口径下随盈亏实时变化（无现价时隐藏）
          const rate = currentPrice !== null ? marginRate(p, currentPrice, p.leverage) : null
          // D9 强平预警：保证金率低于阈值（剩 50%/20% 以内）显示警示徽标
          const risk = rate !== null ? liquidationRisk(rate) : 'safe'
          return (
            <div
              key={key}
              data-testid={`position-row-${key}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                padding: '6px 8px',
                marginBottom: 6,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                background: key === 'long' ? 'rgba(38,166,154,0.08)' : 'rgba(239,83,80,0.08)',
              }}
            >
              <span style={{ fontWeight: 600, color: key === 'long' ? 'var(--up)' : 'var(--down)' }}>{t(label)}</span>
              <span style={{ color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                {t('position.qtyShort')} {p.quantity} @ {p.entry.toFixed(2)}
              </span>
              {active && (
                <span style={{ color, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                  {active.pnl >= 0 ? '+' : ''}
                  {active.pnl.toFixed(2)}
                </span>
              )}
              {rate !== null && (
                <span
                  data-testid={`position-margin-rate-${key}`}
                  title={t('position.marginRate')}
                  style={{ fontSize: 10, color: rate < 0.8 ? 'var(--down)' : 'var(--text-faint)' }}
                >
                  {(rate * 100).toFixed(0)}%
                </span>
              )}
              {risk !== 'safe' && (
                <span
                  data-testid={`position-liq-warn-${key}`}
                  title={risk === 'critical' ? t('position.liqCritical') : t('position.liqWarn')}
                  style={{ fontSize: 10, fontWeight: 600, color: 'var(--down)' }}
                >
                  {risk === 'critical' ? '⚠⚠' : '⚠'} {t('position.liqWarn')}
                </span>
              )}
              <button
                onClick={() => settle(key)}
                data-testid={`position-close-${key}`}
                title={t('position.close')}
                aria-label={`${t('position.close')} ${t(label)}`}
                style={{
                  flex: '0 0 auto',
                  padding: '2px 8px',
                  fontSize: 11,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: 'rgba(239,83,80,0.15)',
                  color: 'var(--down)',
                }}
              >
                {t('position.close')}
              </button>
              <button
                onClick={() => (reduceEdit === key ? setReduceEdit(null) : openReduceEditor(key))}
                data-testid={`position-reduce-toggle-${key}`}
                aria-expanded={reduceEdit === key}
                title={t('position.reduce')}
                aria-label={`${t('position.reduce')} ${t(label)}`}
                style={{
                  flex: '0 0 auto',
                  padding: '2px 8px',
                  fontSize: 11,
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text-dim)',
                }}
              >
                {t('position.reduce')}
              </button>
              <button
                onClick={() => onReverse?.(key)}
                data-testid={`position-reverse-${key}`}
                disabled={currentPrice === null || (balance != null && currentPrice * p.quantity >= balance)}
                title={t('position.reverse')}
                aria-label={`${t('position.reverse')} ${t(label)}`}
                style={{
                  flex: '0 0 auto',
                  padding: '2px 8px',
                  fontSize: 11,
                  border: 'none',
                  borderRadius: 4,
                  cursor: currentPrice !== null && !(balance != null && currentPrice * p.quantity >= balance) ? 'pointer' : 'not-allowed',
                  background: 'rgba(66,133,244,0.15)',
                  color: currentPrice !== null && !(balance != null && currentPrice * p.quantity >= balance) ? '#4285f4' : 'var(--text-faint)',
                  opacity: currentPrice !== null && !(balance != null && currentPrice * p.quantity >= balance) ? 1 : 0.5,
                }}
              >
                {t('position.reverse')}
              </button>
              {p.trailPct !== undefined && (
                <span
                  data-testid={`position-trail-${key}`}
                  title={t('position.levelTrailHint')}
                  style={{ fontSize: 10, color: 'var(--accent)' }}
                >
                  {t('position.levelTrail')} {p.trailPct}%
                </span>
              )}
              <button
                onClick={() => (levelEdit === key ? setLevelEdit(null) : openLevelEditor(key))}
                data-testid={`position-edit-levels-${key}`}
                aria-expanded={levelEdit === key}
                title={t('position.levels')}
                aria-label={`${t('position.levels')} ${t(label)}`}
                style={{
                  flex: '0 0 auto',
                  padding: '2px 8px',
                  fontSize: 11,
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text-dim)',
                }}
              >
                {t('position.levels')}
              </button>
              {levelEdit === key && (
                <div
                  data-testid={`position-levels-editor-${key}`}
                  style={{
                    flex: '1 1 100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginTop: 2,
                    paddingTop: 8,
                    borderTop: '1px dashed rgba(255,255,255,0.12)',
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ color: 'var(--text-dim)', flex: '0 0 auto' }}>{t('position.tpLine')}</span>
                      <input
                        data-testid={`position-level-tp-${key}`}
                        style={{ ...inputStyle, width: 'auto', flex: '1 1 auto', minWidth: 0 }}
                        type="number"
                        step="any"
                        value={levelDraft.takeProfit}
                        onChange={(e) => setLevelDraft((d) => ({ ...d, takeProfit: e.target.value }))}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ color: 'var(--text-dim)', flex: '0 0 auto' }}>{t('position.slLine')}</span>
                      <input
                        data-testid={`position-level-sl-${key}`}
                        style={{ ...inputStyle, width: 'auto', flex: '1 1 auto', minWidth: 0 }}
                        type="number"
                        step="any"
                        value={levelDraft.stopLoss}
                        onChange={(e) => setLevelDraft((d) => ({ ...d, stopLoss: e.target.value }))}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ color: 'var(--text-dim)', flex: '0 0 auto' }}>{t('position.levelTrail')}</span>
                      <input
                        data-testid={`position-level-trail-${key}`}
                        style={{ ...inputStyle, width: 'auto', flex: '1 1 auto', minWidth: 0 }}
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={levelDraft.trail}
                        onChange={(e) => setLevelDraft((d) => ({ ...d, trail: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => applyBreakeven(key)}
                      data-testid={`position-level-breakeven-${key}`}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text-dim)',
                      }}
                    >
                      {t('position.levelBreakeven')}
                    </button>
                    <button
                      onClick={() => saveLevels(key)}
                      data-testid={`position-level-save-${key}`}
                      style={{
                        padding: '2px 10px',
                        fontSize: 11,
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      {t('common.confirm')}
                    </button>
                    <button
                      onClick={() => setLevelEdit(null)}
                      data-testid={`position-level-cancel-${key}`}
                      style={{
                        padding: '2px 10px',
                        fontSize: 11,
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text-faint)',
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                    <span style={{ color: 'var(--text-faint)' }}>{t('position.levelClearHint')}</span>
                  </div>
                  {levelError && (
                    <span data-testid="position-level-error" style={{ color: 'var(--down)' }}>
                      {t(levelError === 'crossed' ? 'position.levelErrCrossed' : 'position.levelErrInvalid')}
                    </span>
                  )}
                </div>
              )}
              {reduceEdit === key && (
                <div
                  data-testid={`position-reduce-editor-${key}`}
                  style={{
                    flex: '1 1 100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 2,
                    paddingTop: 8,
                    borderTop: '1px dashed rgba(255,255,255,0.12)',
                    fontSize: 11,
                  }}
                >
                  {[0.25, 0.5, 0.75].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => reduceByRatio(key, ratio)}
                      data-testid={`position-reduce-ratio-${key}-${Math.round(ratio * 100)}`}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text-dim)',
                      }}
                    >
                      {Math.round(ratio * 100)}%
                    </button>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ color: 'var(--text-dim)' }}>{t('position.reduceQty')}</span>
                    <input
                      data-testid={`position-reduce-qty-${key}`}
                      style={{ ...inputStyle, width: 80 }}
                      type="number"
                      step="any"
                      min="0"
                      value={reduceDraft}
                      onChange={(e) => {
                        setReduceDraft(e.target.value)
                        setReduceError(false)
                      }}
                    />
                  </label>
                  <button
                    onClick={() => submitReduce(key)}
                    data-testid={`position-reduce-confirm-${key}`}
                    style={{
                      padding: '2px 10px',
                      fontSize: 11,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: 'var(--accent)',
                      color: '#fff',
                    }}
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    onClick={() => setReduceEdit(null)}
                    data-testid={`position-reduce-cancel-${key}`}
                    style={{
                      padding: '2px 10px',
                      fontSize: 11,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: 'transparent',
                      color: 'var(--text-faint)',
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  {reduceError && (
                    <span data-testid="position-reduce-error" style={{ color: 'var(--down)' }}>
                      {t('position.reduceErr')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!positions.long && !positions.short && (
          <div style={{ color: 'var(--text-faint)', fontSize: 11, padding: '4px 2px' }}>{t('position.noPosition')}</div>
        )}
        {(positions.long || positions.short) && (
          <button
            data-testid="position-close-all"
            onClick={() => onChange({ long: null, short: null })}
            style={{
              width: '100%',
              padding: '4px 0',
              fontSize: 11,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'rgba(239,83,80,0.15)',
              color: 'var(--down)',
              marginTop: 4,
            }}
          >
            {t('position.closeAll')}
          </button>
        )}
      </div>

      {/* v0.5.x 限价挂单列表（含其他品种，可撤销、点行切品种） */}
      {pendingOrders && onCancelOrder && (
        <PendingOrders
          orders={pendingOrders}
          symbol={symbol ?? ''}
          onCancel={onCancelOrder}
          onSwitchSymbol={onSwitchSymbol}
        />
      )}

      {/* J2 其他品种持仓一览：切品种查看或一键全平 */}
      {otherSymbols && Object.keys(otherSymbols).length > 0 && (
        <div
          data-testid="position-other-symbols"
          style={{ marginBottom: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}
        >
          <div style={{ color: 'var(--text-faint)', fontSize: 11, marginBottom: 4 }}>{t('position.otherSymbols')}</div>
          {Object.entries(otherSymbols).map(([sym, ps]) => {
            if (!ps.long && !ps.short) return null
            const total = (ps.long?.quantity ?? 0) + (ps.short?.quantity ?? 0)
            return (
              <div key={sym} data-testid={`position-other-${sym}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <button
                  onClick={() => onSwitchSymbol?.(sym)}
                  title={t('position.switch')}
                  style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                >
                  <b>{sym}</b> · {total}
                </button>
                <button
                  onClick={() => onSettleSymbol?.(sym)}
                  title={t('position.closeAll')}
                  aria-label={`${t('position.closeAll')} ${sym}`}
                  style={{ flex: '0 0 auto', padding: '2px 8px', fontSize: 11, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'rgba(239,83,80,0.15)', color: 'var(--down)' }}
                >
                  🗑
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {(['long', 'short'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 12,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: d === direction ? (d === 'long' ? 'rgba(38,166,154,0.25)' : 'rgba(239,83,80,0.25)') : 'transparent',
              color: d === direction ? (d === 'long' ? 'var(--up)' : 'var(--down)') : 'var(--text-dim)',
            }}
          >
            {d === 'long' ? t('position.long') : t('position.short')}
          </button>
        ))}
      </div>

      {/* 杠杆档位（D1）：全仓保证金随杠杆缩小，影响强平价 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {LEVERAGE_OPTIONS.map((l) => (
          <button
            key={l}
            onClick={() => setLeverage(l)}
            aria-pressed={leverage === l}
            style={{
              flex: 1,
              padding: '3px 0',
              fontSize: 11,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: leverage === l ? 'rgba(41,98,255,0.18)' : 'transparent',
              color: leverage === l ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            {l === 1 ? '1x' : `${l}x`}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.entry')}</span>
        <input style={inputStyle} value={entry} placeholder={currentPrice ? String(currentPrice.toFixed(2)) : t('common.price')} onChange={(e) => setEntry(e.target.value)} onFocus={fillPrice} />
        <button
          onClick={fillPrice}
          style={{ background: 'none', border: '1px solid #2a2e39', borderRadius: 4, color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11, padding: '3px 6px' }}
        >
          {t('position.market')}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.quantity')}</span>
        <input style={inputStyle} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      {/* 止盈/止损模式切换：百分比参考价 vs 手动输入价位 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {(['pct', 'price'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setLevelMode(m)}
            aria-pressed={levelMode === m}
            style={{
              flex: 1,
              padding: '3px 0',
              fontSize: 11,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: levelMode === m ? 'rgba(41,98,255,0.18)' : 'transparent',
              color: levelMode === m ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            {m === 'pct' ? t('position.levelModePct') : t('position.levelModePrice')}
          </button>
        ))}
      </div>

      {levelMode === 'pct' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.tpPct')}</span>
            <input style={inputStyle} type="number" value={tpPct} onChange={(e) => setTpPct(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.slPct')}</span>
            <input style={inputStyle} type="number" value={slPct} onChange={(e) => setSlPct(e.target.value)} />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.tpPrice')}</span>
            <input
              style={inputStyle}
              type="number"
              value={tpPrice}
              placeholder={levels ? levels.takeProfit.toFixed(2) : t('common.price')}
              onChange={(e) => setTpPrice(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.slPrice')}</span>
            <input
              style={inputStyle}
              type="number"
              value={slPrice}
              placeholder={levels ? levels.stopLoss.toFixed(2) : t('common.price')}
              onChange={(e) => setSlPrice(e.target.value)}
            />
          </div>
        </>
      )}

      {levelMode === 'pct' && levels && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, color: 'var(--text-dim)' }}>
          <span>{t('position.tpLine')} <b style={{ color: 'var(--up)' }}>{levels.takeProfit.toFixed(2)}</b></span>
          <span>{t('position.slLine')} <b style={{ color: 'var(--down)' }}>{levels.stopLoss.toFixed(2)}</b></span>
        </div>
      )}

      {valid && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, color: 'var(--text-dim)' }}>
          <span>{t('position.margin')} <b style={{ color: 'var(--text)' }}>{margin!.toFixed(2)} USDT</b> · {t('position.leverage')} <b style={{ color: 'var(--text)' }}>{leverage}x</b></span>
          {liqPrice !== null && (
            <span>
              {t('position.liqPrice')}{' '}
              <b style={{ color: direction === 'long' ? 'var(--down)' : 'var(--up)' }}>{liqPrice.toFixed(2)}</b>
            </span>
          )}
        </div>
      )}

      <button
        onClick={apply}
        disabled={!canApply}
        style={{
          width: '100%',
          padding: '6px 0',
          fontSize: 12,
          border: 'none',
          borderRadius: 4,
          cursor: canApply ? 'pointer' : 'not-allowed',
          background: canApply ? 'var(--accent)' : 'var(--border)',
          color: canApply ? '#fff' : 'var(--text-faint)',
        }}
      >
        {t('position.open')}
      </button>
    </div>
  )
}

/** 兼容旧单仓位用法：包装为 Positions（仅保留传入方向） */
export function _fromLegacy(p: Position | null): Positions {
  if (!p) return EMPTY_POSITIONS
  return { long: p.direction === 'long' ? p : null, short: p.direction === 'short' ? p : null }
}
