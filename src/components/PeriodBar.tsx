import { PERIODS, type Period } from '../chart/types'
import { useI18n, type MessageKey } from '../i18n'

interface PeriodBarProps {
  value: Period
  onChange: (p: Period) => void
}

/** 周期工具栏：flexWrap 换行布局，绝不产生横向滚动条 */
export function PeriodBar({ value, onChange }: PeriodBarProps) {
  const { t } = useI18n()
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
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
