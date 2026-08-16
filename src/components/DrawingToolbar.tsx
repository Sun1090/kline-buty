import type { DrawingTool } from '../drawings/logic'
import { useI18n, type MessageKey } from '../i18n'

interface DrawingToolbarProps {
  tool: DrawingTool
  onChange: (t: DrawingTool) => void
  selected: boolean
  selectedText?: string
  onDeleteSelected: () => void
  onEditSelectedText?: () => void
}

const TOOLS: { value: DrawingTool; labelKey: MessageKey }[] = [
  { value: 'none', labelKey: 'drawing.mouse' },
  { value: 'horizontal', labelKey: 'drawing.horizontal' },
  { value: 'trend', labelKey: 'drawing.trend' },
  { value: 'channel', labelKey: 'drawing.channel' },
  { value: 'fib', labelKey: 'drawing.fib' },
  { value: 'rect', labelKey: 'drawing.rect' },
  { value: 'ellipse', labelKey: 'drawing.ellipse' },
  { value: 'circle', labelKey: 'drawing.circle' },
  { value: 'triangle', labelKey: 'drawing.triangle' },
  { value: 'arc', labelKey: 'drawing.arc' },
  { value: 'ray', labelKey: 'drawing.ray' },
  { value: 'text', labelKey: 'drawing.text' },
  { value: 'fibext', labelKey: 'drawing.fibext' },
  { value: 'fibfan', labelKey: 'drawing.fibfan' },
  { value: 'fibtimed', labelKey: 'drawing.fibTime' },
  { value: 'gann', labelKey: 'drawing.gann' },
  { value: 'pricelabel', labelKey: 'drawing.pricelabel' },
  { value: 'arrow', labelKey: 'drawing.arrow' },
  { value: 'polyline', labelKey: 'drawing.polyline' },
  { value: 'measure', labelKey: 'drawing.measure' },
]

export function DrawingToolbar({
  tool,
  onChange,
  selected,
  onDeleteSelected,
  onEditSelectedText,
}: DrawingToolbarProps) {
  const { t } = useI18n()
  return (
    <div className="scroll-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'nowrap', overflowX: 'auto', flexShrink: 1, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>{t('drawing.group')}</span>
      {TOOLS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          title={t(o.labelKey)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: o.value === tool ? 'var(--accent)' : 'transparent',
            color: o.value === tool ? '#fff' : 'var(--text-dim)',
          }}
        >
          {t(o.labelKey)}
        </button>
      ))}
      {selected && (
        <>
          {onEditSelectedText && (
            <button
              onClick={onEditSelectedText}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'rgba(41,98,255,0.15)',
                color: 'var(--accent)',
              }}
            >
              {t('drawing.editText')}
            </button>
          )}
          <button
            onClick={onDeleteSelected}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'rgba(239,83,80,0.15)',
              color: 'var(--down)',
            }}
          >
            {t('common.delete')}
          </button>
        </>
      )}
    </div>
  )
}
