import { useEffect, useRef, useState } from 'react'
import { PERIODS, type Period } from '../chart/types'
import { useI18n } from '../i18n/useI18n'
import type { MessageKey } from '../i18n/messages'

interface PeriodBarProps {
  value: Period
  onChange: (p: Period) => void
  /** 移动端：更紧凑的换行（按钮略小、行距更密）；桌面默认换行布局 */
  compact?: boolean
}

/** 周期工具栏：始终 flexWrap 换行——绝不产生横向滚动条，全部周期直接可见；M9 支持左右方向键导航 */
export function PeriodBar({ value, onChange, compact }: PeriodBarProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusIdx, setFocusIdx] = useState(() => Math.max(0, PERIODS.findIndex((p) => p.value === value)))

  // 选中周期变化时同步焦点索引
  useEffect(() => {
    setFocusIdx(Math.max(0, PERIODS.findIndex((p) => p.value === value)))
  }, [value])

  const getButtons = (): HTMLButtonElement[] => {
    if (!containerRef.current) return []
    return Array.from(containerRef.current.querySelectorAll<HTMLButtonElement>('button'))
  }

  const focusIndex = (idx: number) => {
    const btns = getButtons()
    if (!btns.length) return
    if (idx < 0) idx = btns.length - 1
    if (idx >= btns.length) idx = 0
    setFocusIdx(idx)
    btns[idx]?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const btns = getButtons()
    if (!btns.length) return
    const currentIdx = btns.indexOf(document.activeElement as HTMLButtonElement)
    if (currentIdx === -1) return
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(currentIdx + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(currentIdx - 1)
        break
      case 'Home':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(0)
        break
      case 'End':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(btns.length - 1)
        break
      case ' ':
      case 'Enter':
        // 拦截全局快捷键误触发（Space=回放、方向键=回放步进）
        e.stopPropagation()
        break
    }
  }

  return (
    <div
      ref={containerRef}
      data-testid="period-bar"
      role="toolbar"
      aria-label={t('shortcuts.period')}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? 1 : 2,
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      {PERIODS.map((p, idx) => (
        <button
          key={p.value}
          data-testid={`period-${p.value}`}
          onClick={() => onChange(p.value)}
          aria-label={t(p.labelKey as MessageKey)}
          aria-pressed={p.value === value}
          tabIndex={idx === focusIdx ? 0 : -1}
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
