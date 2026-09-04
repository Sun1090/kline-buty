import { useState } from 'react'
import type { Position } from '../position/pnl'
import { calcPnl, calcLiquidationPrice, calcMargin, suggestLevels } from '../position/pnl'
import { EMPTY_POSITIONS, type Positions } from '../trade/positions'
import { useI18n } from '../i18n/useI18n'

interface PositionPanelProps {
  /** J1 双向持仓：long/short 各自独立 */
  positions: Positions
  currentPrice: number | null
  /** 开仓变更回调（传入新的 positions 容器） */
  onChange: (p: Positions) => void
  /** J2 其他品种持仓一览（key=symbol；不含当前品种） */
  otherSymbols?: Record<string, Positions>
  /** J2 切到某品种查看/平仓 */
  onSwitchSymbol?: (symbol: string) => void
  /** J2 平掉某品种全部持仓（含其多空） */
  onSettleSymbol?: (symbol: string) => void
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

export function PositionPanel({ positions, currentPrice, onChange, otherSymbols, onSwitchSymbol, onSettleSymbol }: PositionPanelProps) {
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
    // J1 开仓：仅写对应方向槽位（hedge：buy→long、sell→short）
    const pos: Position = {
      entry: entryNum,
      quantity: qtyNum,
      direction,
      takeProfit: levelMode === 'pct' ? levels!.takeProfit : tpNum,
      stopLoss: levelMode === 'pct' ? levels!.stopLoss : slNum,
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

  return (
    <div
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

      {/* J1 双向持仓列表：多空各自显示，独立平仓 */}
      <div style={{ marginBottom: 10 }}>
        {DIRECTION_ROW.map(({ key, label }) => {
          const p = positions[key]
          if (!p) return null
          const active = currentPrice !== null ? calcPnl(p, currentPrice) : null
          const color = active ? (active.pnl >= 0 ? 'var(--up)' : 'var(--down)') : 'var(--text-faint)'
          return (
            <div
              key={key}
              data-testid={`position-row-${key}`}
              style={{
                display: 'flex',
                alignItems: 'center',
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
              <button
                onClick={() => settle(key)}
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
