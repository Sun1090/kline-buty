import type { DrawingTool } from '../drawings/logic'
import { useI18n } from '../i18n'
import { DRAWING_TOOLS } from './headerOptions'

interface DrawingToolbarProps {
  tool: DrawingTool
  onChange: (t: DrawingTool) => void
  selected: boolean
  selectedText?: string
  onDeleteSelected: () => void
  onEditSelectedText?: () => void
}

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
      {DRAWING_TOOLS.map((o) => (
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
