import { useState } from 'react'
import type { Position } from '../position/pnl'
import { calcPnl, suggestLevels } from '../position/pnl'
import { useI18n } from '../i18n'

interface PositionPanelProps {
  position: Position | null
  currentPrice: number | null
  onChange: (p: Position | null) => void
}

const inputStyle: React.CSSProperties = {
  width: 88,
  padding: '4px 6px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #2a2e39',
  background: 'var(--bg)',
  color: 'var(--text)',
}

export function PositionPanel({ position, currentPrice, onChange }: PositionPanelProps) {
  const { t } = useI18n()
  const [entry, setEntry] = useState<string>(position ? String(position.entry) : '')
  const [quantity, setQuantity] = useState<string>(position ? String(position.quantity) : '')
  const [direction, setDirection] = useState<'long' | 'short'>(position?.direction ?? 'long')
  const [tpPct, setTpPct] = useState('3')
  const [slPct, setSlPct] = useState('2')

  const entryNum = Number(entry)
  const qtyNum = Number(quantity)
  const valid = Number.isFinite(entryNum) && entryNum > 0 && Number.isFinite(qtyNum) && qtyNum > 0

  const levels = valid ? suggestLevels(entryNum, direction, Number(tpPct) || 0, Number(slPct) || 0) : null
  const active = position && currentPrice !== null ? calcPnl(position, currentPrice) : null

  const apply = () => {
    if (!valid || !levels) return
    onChange({
      entry: entryNum,
      quantity: qtyNum,
      direction,
      takeProfit: levels.takeProfit,
      stopLoss: levels.stopLoss,
    })
  }

  const fillPrice = () => {
    if (currentPrice !== null && entry === '') setEntry(currentPrice.toFixed(2))
  }

  const pnlColor = active ? (active.pnl >= 0 ? 'var(--up)' : 'var(--down)') : 'var(--text-faint)'

  return (
    <div
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
        {position && (
          <button
            onClick={() => onChange(null)}
            style={{ background: 'none', border: 'none', color: 'var(--down)', cursor: 'pointer', fontSize: 12 }}
          >
            {t('position.close')}
          </button>
        )}
      </div>

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.tpPct')}</span>
        <input style={inputStyle} type="number" value={tpPct} onChange={(e) => setTpPct(e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: 'var(--text-dim)', width: 52 }}>{t('position.slPct')}</span>
        <input style={inputStyle} type="number" value={slPct} onChange={(e) => setSlPct(e.target.value)} />
      </div>

      {levels && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, color: 'var(--text-dim)' }}>
          <span>{t('position.tpLine')} <b style={{ color: 'var(--up)' }}>{levels.takeProfit.toFixed(2)}</b></span>
          <span>{t('position.slLine')} <b style={{ color: 'var(--down)' }}>{levels.stopLoss.toFixed(2)}</b></span>
        </div>
      )}

      {active ? (
        <div style={{ borderTop: '1px solid #2a2e39', paddingTop: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>{t('position.floatingPnl')}</span>
          <b style={{ color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
            {active.pnl >= 0 ? '+' : ''}
            {active.pnl.toFixed(2)} USDT（{active.pnlPct >= 0 ? '+' : ''}
            {active.pnlPct.toFixed(2)}%）
          </b>
        </div>
      ) : (
        <button
          onClick={apply}
          disabled={!valid}
          style={{
            width: '100%',
            padding: '6px 0',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            cursor: valid ? 'pointer' : 'not-allowed',
            background: valid ? 'var(--accent)' : 'var(--border)',
            color: valid ? '#fff' : 'var(--text-faint)',
          }}
        >
          {t('position.open')}
        </button>
      )}
    </div>
  )
}
