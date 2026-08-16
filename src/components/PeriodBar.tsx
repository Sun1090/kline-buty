import { PERIODS, type Period } from '../chart/types'

interface PeriodBarProps {
  value: Period
  onChange: (p: Period) => void
}

export function PeriodBar({ value, onChange }: PeriodBarProps) {
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
          {p.label}
        </button>
      ))}
    </div>
  )
}
