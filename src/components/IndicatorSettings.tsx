import { useState } from 'react'
import type { IndicatorParams } from '../indicators/params'
import type { MainIndicatorKind, SubIndicatorKind } from './ChartView'
import { useI18n } from '../i18n/useI18n'
import type { TFunction } from '../i18n/translate'

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

function fieldsFor(main: MainIndicatorKind, sub: SubIndicatorKind, t: TFunction): Field[] {
  const fields: Field[] = []
  if (main === 'ma' || main === 'ema')
    fields.push({
      key: 'maPeriods',
      label: t('indicator.maPeriods', { name: main === 'ma' ? 'MA' : 'EMA' }),
      kind: 'list',
    })
  if (main === 'boll') {
    fields.push({ key: 'bollPeriod', label: t('indicator.bollPeriod'), kind: 'number' })
    fields.push({ key: 'bollMult', label: t('indicator.bollMult'), kind: 'number' })
  }
  if (main === 'sar') {
    fields.push({ key: 'sarAfStart', label: t('indicator.sarAfStart'), kind: 'number' })
    fields.push({ key: 'sarAfStep', label: t('indicator.sarAfStep'), kind: 'number' })
    fields.push({ key: 'sarAfMax', label: t('indicator.sarAfMax'), kind: 'number' })
  }
  if (main === 'ichimoku') {
    fields.push({ key: 'ichimokuTenkan', label: t('indicator.ichimokuTenkan'), kind: 'number' })
    fields.push({ key: 'ichimokuKijun', label: t('indicator.ichimokuKijun'), kind: 'number' })
    fields.push({ key: 'ichimokuSpanB', label: t('indicator.ichimokuSpanB'), kind: 'number' })
    fields.push({ key: 'ichimokuDisplacement', label: t('indicator.ichimokuDisplacement'), kind: 'number' })
  }
  if (sub === 'macd') {
    fields.push({ key: 'macdFast', label: t('indicator.macdFast'), kind: 'number' })
    fields.push({ key: 'macdSlow', label: t('indicator.macdSlow'), kind: 'number' })
    fields.push({ key: 'macdSignal', label: t('indicator.macdSignal'), kind: 'number' })
  }
  if (sub === 'kdj') {
    fields.push({ key: 'kdjN', label: t('indicator.kdjN'), kind: 'number' })
    fields.push({ key: 'kdjM1', label: t('indicator.kdjM1'), kind: 'number' })
    fields.push({ key: 'kdjM2', label: t('indicator.kdjM2'), kind: 'number' })
  }
  if (sub === 'rsi') fields.push({ key: 'rsiPeriod', label: t('indicator.rsiPeriod'), kind: 'number' })
  if (sub === 'wr') fields.push({ key: 'wrPeriod', label: t('indicator.wrPeriod'), kind: 'number' })
  if (sub === 'obv') fields.push({ key: 'obvMaPeriod', label: t('indicator.obvMaPeriod'), kind: 'number' })
  if (sub === 'atr') fields.push({ key: 'atrPeriod', label: t('indicator.atrPeriod'), kind: 'number' })
  if (sub === 'dmi') fields.push({ key: 'dmiPeriod', label: t('indicator.dmiPeriod'), kind: 'number' })
  if (sub === 'cci') fields.push({ key: 'cciPeriod', label: t('indicator.cciPeriod'), kind: 'number' })
  if (sub === 'psy') fields.push({ key: 'psyPeriod', label: t('indicator.psyPeriod'), kind: 'number' })
  if (sub === 'stoch') {
    fields.push({ key: 'stochK', label: t('indicator.stochK'), kind: 'number' })
    fields.push({ key: 'stochSmooth', label: t('indicator.stochSmooth'), kind: 'number' })
    fields.push({ key: 'stochD', label: t('indicator.stochD'), kind: 'number' })
  }
  if (sub === 'roc') fields.push({ key: 'rocPeriod', label: t('indicator.rocPeriod'), kind: 'number' })
  if (sub === 'mom') fields.push({ key: 'momPeriod', label: t('indicator.momPeriod'), kind: 'number' })
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
  const { t } = useI18n()
  const fields = fieldsFor(mainIndicator, subIndicator, t)
  const [draft, setDraft] = useState(() => ({ ...params }))

  const apply = (patch: Partial<IndicatorParams>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    onChange(next)
  }

  return (
    <div
      role="region"
      aria-label={t('indicator.settings')}
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
        <span style={{ fontWeight: 600 }}>{t('indicator.settings')}</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}
        >
          ✕
        </button>
      </div>
      {fields.length === 0 && <div style={{ color: 'var(--text-faint)' }}>{t('indicator.noParams')}</div>}
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
