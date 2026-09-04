import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { DEFAULT_BINDINGS, keyLabel, type ShortcutActionType, type ShortcutKey, type ShortcutKeyMap } from '../shortcuts'
import type { MessageKey } from '../i18n/messages'

interface ShortcutsSettingsProps {
  keys: ShortcutKeyMap
  onChange: (keys: ShortcutKeyMap) => void
  onClose: () => void
}

/** L1 可配置动作清单（含 i18n 标签键）；布局键/方向回放不列入配置 */
const CONFIGURABLE: { type: ShortcutActionType; labelKey: MessageKey }[] = [
  { type: 'period-prev', labelKey: 'shortcuts.periodPrev' },
  { type: 'period-next', labelKey: 'shortcuts.periodNext' },
  { type: 'replay-toggle', labelKey: 'shortcuts.replay' },
  { type: 'delete-drawing', labelKey: 'shortcuts.deleteDrawing' },
  { type: 'open-search', labelKey: 'shortcuts.openSearch' },
  { type: 'toggle-fullscreen', labelKey: 'shortcuts.fullscreen' },
  { type: 'cycle-main', labelKey: 'shortcuts.cycleMain' },
  { type: 'cycle-sub', labelKey: 'shortcuts.cycleSub' },
  { type: 'toggle-shortcuts', labelKey: 'shortcuts.help' },
  { type: 'copy-drawing', labelKey: 'shortcuts.copyDrawing' },
  { type: 'paste-drawing', labelKey: 'shortcuts.pasteDrawing' },
]

/** L1 把按键事件归一化为可存储的键位定义（忽略独立修饰键/功能键） */
export function eventToKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): ShortcutKey | null {
  if (!e.key || e.key === 'Unidentified' || e.key === 'Dead') return null
  const norm = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const lower = e.key.toLowerCase()
  if (lower === 'control' || lower === 'meta' || lower === 'shift' || lower === 'alt' || lower === 'capslock' || lower === 'tab') return null
  return { key: norm, mod: e.ctrlKey || e.metaKey, shift: e.shiftKey }
}

/** L1 快捷键配置面板：逐动作显示当前键位，点击行后按新键替换 */
export function ShortcutsSettings({ keys, onChange, onClose }: ShortcutsSettingsProps) {
  const { t } = useI18n()
  const [recording, setRecording] = useState<ShortcutActionType | null>(null)

  const bindingFor = (type: ShortcutActionType): ShortcutKey[] => keys[type] ?? DEFAULT_BINDINGS[type] ?? []
  const labelOf = (type: ShortcutActionType) => bindingFor(type).map(keyLabel).join(' / ') || '—'

  useEffect(() => {
    if (recording === null) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const def = eventToKey(e)
      if (!def) return
      onChange({ ...keys, [recording]: [def] })
      setRecording(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recording 变化重绑；keys 闭包读取最新
  }, [recording])

  const reset = () => onChange({})

  return (
    <div
      data-testid="shortcuts-settings"
      role="dialog"
      aria-label={t('shortcuts.configTitle')}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 64,
        zIndex: 1000,
        minWidth: 320,
        maxWidth: 'min(360px, 92vw)',
        padding: '12px 16px',
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>{t('shortcuts.configTitle')}</span>
        <button onClick={onClose} aria-label={t('common.close')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>
          ✕
        </button>
      </div>
      {recording && (
        <div data-testid="shortcuts-recording" style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 4, background: 'rgba(41,98,255,0.15)', color: 'var(--accent)' }}>
          {t('shortcuts.recording')}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, maxHeight: 320, overflowY: 'auto' }}>
        {CONFIGURABLE.map(({ type, labelKey }) => (
          <button
            key={type}
            data-testid={`shortcut-${type}`}
            onClick={() => setRecording(recording === type ? null : type)}
            title={recording === type ? t('shortcuts.cancel') : t('shortcuts.clickToChange')}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 8px',
              borderRadius: 4,
              border: recording === type ? '1px solid var(--accent)' : '1px solid transparent',
              background: recording === type ? 'rgba(41,98,255,0.1)' : 'transparent',
              cursor: 'pointer',
              color: 'var(--text)',
              textAlign: 'left',
            }}
          >
            <span>{t(labelKey)}</span>
            <span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{labelOf(type)}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('shortcuts.configHint')}</span>
        <button
          data-testid="shortcuts-reset"
          onClick={reset}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--down)', cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
        >
          {t('shortcuts.reset')}
        </button>
      </div>
    </div>
  )
}
