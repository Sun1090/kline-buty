import { PERIODS, type Period } from '../chart/types'
import { useI18n } from '../i18n/useI18n'
import type { MessageKey } from '../i18n/messages'

interface PeriodBarProps {
  value: Period
  onChange: (p: Period) => void
  /** 移动端：更紧凑的换行（按钮略小、行距更密）；桌面默认换行布局 */
  compact?: boolean
}

/** 周期工具栏：始终 flexWrap 换行——绝不产生横向滚动条，全部周期直接可见 */
export function PeriodBar({ value, onChange, compact }: PeriodBarProps) {
  const { t } = useI18n()
  return (
    <div
      data-testid="period-bar"
      role="toolbar"
      aria-label={t('shortcuts.period')}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? 1 : 2,
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      {PERIODS.map((p) => (
        <button
          key={p.value}
          data-testid={`period-${p.value}`}
          onClick={() => onChange(p.value)}
          aria-label={t(p.labelKey as MessageKey)}
          aria-pressed={p.value === value}
          style={{
            padding: compact ? '3px 6px' : '4px 8px',
            fontSize: compact ? 11 : 12,
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
