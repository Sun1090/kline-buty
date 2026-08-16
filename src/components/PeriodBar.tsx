import { PERIODS, type Period } from '../chart/types'
import { useI18n, type MessageKey } from '../i18n'

interface PeriodBarProps {
  value: Period
  onChange: (p: Period) => void
}

export function PeriodBar({ value, onChange }: PeriodBarProps) {
  const { t } = useI18n()
  return (
    <div className="scroll-toolbar" style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflowX: 'auto', flexShrink: 1, minWidth: 0 }}>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: p.value === value ? 'var(--accent)' : 'transparent',
            color: p.value === value ? '#fff' : 'var(--text-dim)',
          }}
        >
          {t(p.labelKey as MessageKey)}
        </button>
      ))}
    </div>
  )
}
