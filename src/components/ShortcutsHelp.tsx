import { useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import type { MessageKey } from '../i18n/messages'
import { DEFAULT_BINDINGS, keyLabel, type ShortcutActionType } from '../shortcuts'

interface ShortcutsHelpProps {
  /** L1 配置入口：点击打开/收起配置面板 */
  onConfigure: () => void
  /** 配置面板是否已打开（按钮高亮） */
  configuring?: boolean
}

/** 快捷键分组（数据驱动）：组标题 + 动作列表（shortcuts.* 字典键） */
const GROUPS: { titleKey: MessageKey; types: ShortcutActionType[] }[] = [
  {
    titleKey: 'shortcuts.groupNav',
    types: ['open-search', 'period-prev', 'period-next', 'set-layout', 'toggle-fullscreen', 'cycle-lang'],
  },
  {
    titleKey: 'shortcuts.groupIndicators',
    types: ['cycle-main', 'cycle-sub'],
  },
  {
    titleKey: 'shortcuts.groupReplay',
    types: ['replay-toggle', 'replay-step', 'replay-speed'],
  },
  {
    titleKey: 'shortcuts.groupDrawings',
    types: ['delete-drawing', 'copy-drawing', 'paste-drawing', 'escape', 'toggle-shortcuts'],
  },
]

/** 动作显示名（短名，配置面板用同一套） */
export const ACTION_LABELS: Record<ShortcutActionType, MessageKey> = {
  'period-prev': 'shortcuts.periodPrev',
  'period-next': 'shortcuts.periodNext',
  'replay-toggle': 'shortcuts.replay',
  'replay-step': 'shortcuts.replayStep',
  'replay-speed': 'shortcuts.replaySpeed',
  'delete-drawing': 'shortcuts.deleteDrawing',
  'escape': 'shortcuts.escape',
  'open-search': 'shortcuts.openSearch',
  'toggle-fullscreen': 'shortcuts.fullscreen',
  'set-layout': 'shortcuts.layout',
  'cycle-main': 'shortcuts.cycleMain',
  'cycle-sub': 'shortcuts.cycleSub',
  'toggle-shortcuts': 'shortcuts.help',
  'copy-drawing': 'shortcuts.copyDrawing',
  'paste-drawing': 'shortcuts.pasteDrawing',
  'cycle-lang': 'shortcuts.cycleLang',
}

/** L1 快捷键帮助浮层：按分组显示当前生效键位 + 过滤 + 配置入口；Esc 关闭由全局快捷键处理 */
export function ShortcutsHelp({ onConfigure, configuring }: ShortcutsHelpProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const bindingsFor = (type: ShortcutActionType) => DEFAULT_BINDINGS[type] ?? []
  const labelFor = (type: ShortcutActionType) => {
    if (type === 'set-layout') return t('shortcuts.layoutKeys')
    return bindingsFor(type).map(keyLabel).join(' / ') || '—'
  }

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.types.filter((ty) => !q || t(ACTION_LABELS[ty]).toLowerCase().includes(q)),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      data-testid="shortcuts-help"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 64,
        zIndex: 999,
        minWidth: 320,
        maxWidth: 'min(360px, 92vw)',
        padding: '12px 16px',
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: 12,
        lineHeight: 1.9,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t('shortcuts.title')}</span>
        <button
          data-testid="shortcuts-configure"
          onClick={onConfigure}
          aria-pressed={configuring}
          title={t('shortcuts.configTitle')}
          style={{
            background: 'none',
            border: '1px solid ' + (configuring ? 'var(--accent)' : 'var(--border)'),
            borderRadius: 4,
            color: configuring ? 'var(--accent)' : 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: 11,
            padding: '2px 8px',
          }}
        >
          {t('shortcuts.configTitle')}
        </button>
      </div>
      <input
        data-testid="shortcuts-filter"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={t('shortcuts.filter')}
        aria-label={t('shortcuts.filter')}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '4px 8px',
          fontSize: 12,
          borderRadius: 4,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text)',
          marginBottom: 8,
        }}
      />
      {groups.length === 0 ? (
        <div style={{ color: 'var(--text-faint)' }}>{t('shortcuts.noMatch')}</div>
      ) : (
        groups.map((g) => (
          <div key={g.titleKey} style={{ marginBottom: 6 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11 }}>{t(g.titleKey)}</div>
            <div style={{ color: 'var(--text-dim)' }}>
              {g.items.map((ty) => (
                <div key={ty} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>{t(ACTION_LABELS[ty])}</span>
                  <span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{labelFor(ty)}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      {!q && <div style={{ color: 'var(--text-dim)' }}>{t('shortcuts.hint')}</div>}
    </div>
  )
}
