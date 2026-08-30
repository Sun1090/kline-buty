import { useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import type { MessageKey } from '../i18n/messages'

/** 快捷键分组（数据驱动）：组标题 + 条目（均为 shortcuts.* 字典键） */
const SHORTCUT_GROUPS: { titleKey: MessageKey; items: MessageKey[] }[] = [
  {
    titleKey: 'shortcuts.groupNav',
    items: ['shortcuts.openSearch', 'shortcuts.period', 'shortcuts.layout', 'shortcuts.fullscreen'],
  },
  {
    titleKey: 'shortcuts.groupIndicators',
    items: ['shortcuts.cycleMain', 'shortcuts.cycleSub'],
  },
  {
    titleKey: 'shortcuts.groupReplay',
    items: ['shortcuts.replay', 'shortcuts.replayStep', 'shortcuts.replaySpeed'],
  },
  {
    titleKey: 'shortcuts.groupDrawings',
    items: ['shortcuts.deleteDrawing', 'shortcuts.escape'],
  },
]

/** 快捷键帮助浮层（T28）：按功能分组 + 关键字过滤；Esc 关闭仍由全局快捷键处理 */
export function ShortcutsHelp() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const groups = SHORTCUT_GROUPS.map((g) => ({
    titleKey: g.titleKey,
    items: g.items.filter((k) => !q || t(k).toLowerCase().includes(q)),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      data-testid="shortcuts-help"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 64,
        zIndex: 999,
        minWidth: 300,
        maxWidth: 'min(340px, 92vw)',
        padding: '12px 16px',
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: 12,
        lineHeight: 1.9,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{t('shortcuts.title')}</div>
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
              {g.items.map((k) => (
                <div key={k}>{t(k)}</div>
              ))}
            </div>
          </div>
        ))
      )}
      {!q && <div style={{ color: 'var(--text-dim)' }}>{t('shortcuts.hint')}</div>}
    </div>
  )
}
