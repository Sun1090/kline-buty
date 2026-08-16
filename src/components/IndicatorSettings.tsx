import { useState } from 'react'
import type { IndicatorParams } from '../indicators/params'
import type { MainIndicatorKind, SubIndicatorKind } from './ChartView'

interface Field {
  key: keyof IndicatorParams
  label: string
  kind: 'number' | 'list'
}

interface IndicatorSettingsProps {
  params: IndicatorParams
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  onChange: (p: IndicatorParams) => void
  onClose: () => void
}

function fieldsFor(main: MainIndicatorKind, sub: SubIndicatorKind): Field[] {
  const fields: Field[] = []
  if (main === 'ma' || main === 'ema')
    fields.push({ key: 'maPeriods', label: `${main === 'ma' ? 'MA' : 'EMA'} 周期(逗号分隔)`, kind: 'list' })
  if (main === 'boll') {
    fields.push({ key: 'bollPeriod', label: 'BOLL 周期', kind: 'number' })
    fields.push({ key: 'bollMult', label: 'BOLL 标准差倍数', kind: 'number' })
  }
  if (sub === 'macd') {
    fields.push({ key: 'macdFast', label: 'MACD 快线', kind: 'number' })
    fields.push({ key: 'macdSlow', label: 'MACD 慢线', kind: 'number' })
    fields.push({ key: 'macdSignal', label: 'MACD 信号', kind: 'number' })
  }
  if (sub === 'kdj') {
    fields.push({ key: 'kdjN', label: 'KDJ N', kind: 'number' })
    fields.push({ key: 'kdjM1', label: 'KDJ M1', kind: 'number' })
    fields.push({ key: 'kdjM2', label: 'KDJ M2', kind: 'number' })
  }
  if (sub === 'rsi') fields.push({ key: 'rsiPeriod', label: 'RSI 周期', kind: 'number' })
  return fields
}

const inputStyle: React.CSSProperties = {
  width: 64,
  padding: '4px 6px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #2a2e39',
  background: 'var(--bg)',
  color: 'var(--text)',
}

export function IndicatorSettings({
  params,
  mainIndicator,
  subIndicator,
  onChange,
  onClose,
}: IndicatorSettingsProps) {
  const fields = fieldsFor(mainIndicator, subIndicator)
  const [draft, setDraft] = useState(() => ({ ...params }))

  const apply = (patch: Partial<IndicatorParams>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    onChange(next)
  }

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
        minWidth: 230,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>指标参数</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}
        >
          ✕
        </button>
      </div>
      {fields.length === 0 && <div style={{ color: 'var(--text-faint)' }}>当前指标无参数可调</div>}
      {fields.map((f) => (
        <div key={String(f.key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-dim)' }}>{f.label}</span>
          {f.kind === 'list' ? (
            <input
              style={{ ...inputStyle, width: 110 }}
              value={draft.maPeriods.join(',')}
              onChange={(e) =>
                apply({
                  maPeriods: e.target.value
                    .split(',')
                    .map((s) => Number(s.trim()))
                    .filter((n) => Number.isFinite(n) && n > 0),
                })
              }
            />
          ) : (
            <input
              style={inputStyle}
              type="number"
              value={draft[f.key] as number}
              onChange={(e) => apply({ [f.key]: Number(e.target.value) } as Partial<IndicatorParams>)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
