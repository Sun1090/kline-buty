import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { DRAWING_TOOLS, optionLabel } from './headerOptions'
import { OptionGrid } from './OptionGrid'

/** 画线工具选择器：搜索框过滤 + 网格（桌面/移动端画线面板共用） */
export function DrawingToolPicker({
  value,
  onPick,
  testIdPrefix,
}: {
  value: string
  onPick: (v: string) => void
  testIdPrefix?: string
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      DRAWING_TOOLS.filter((o) => {
        if (!q) return true
        return optionLabel(o, t).toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
      }),
    [q, t],
  )
  return (
    <>
      <input
        data-testid={testIdPrefix ? `${testIdPrefix}-search` : undefined}
        aria-label={t('drawing.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('drawing.searchPlaceholder')}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: 8,
          padding: '6px 9px',
          fontSize: 12,
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: 'var(--panel)',
          color: 'var(--text)',
        }}
      />
      {filtered.length > 0 ? (
        <OptionGrid options={filtered} value={value} onPick={onPick} label={(o) => optionLabel(o, t)} />
      ) : (
        <div data-testid={testIdPrefix ? `${testIdPrefix}-no-match` : undefined} style={{ fontSize: 12, color: 'var(--text-faint)', padding: '4px 0' }}>
          {t('drawing.searchNoMatch')}
        </div>
      )}
    </>
  )
}
