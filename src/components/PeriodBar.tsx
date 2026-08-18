import { PERIODS, type Period } from '../chart/types'
import { useI18n, type MessageKey } from '../i18n'

interface PeriodBarProps {
  value: Period
  onChange: (p: Period) => void
  /** 移动端：单行横向滚动（不换行占两行）；桌面默认 flexWrap 换行 */
  scrollable?: boolean
}

/** 周期工具栏：桌面 flexWrap 换行布局；移动端单行横滚，绝不产生横向滚动条 */
export function PeriodBar({ value, onChange, scrollable }: PeriodBarProps) {
  const { t } = useI18n()
  return (
    <div
      className={scrollable ? 'scroll-toolbar' : undefined}
      data-testid="period-bar"
      style={{
        display: 'flex',
        flexWrap: scrollable ? 'nowrap' : 'wrap',
        gap: 2,
        flexShrink: 1,
        minWidth: 0,
        ...(scrollable ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' } : {}),
      }}
    >
      {PERIODS.map((p) => (
        <button
          key={p.value}
          data-testid={`period-${p.value}`}
          onClick={() => onChange(p.value)}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
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
