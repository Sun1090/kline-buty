import { CHANGELOG } from '../data/changelog'
import { useI18n } from '../i18n/useI18n'

interface ChangelogModalProps {
  onClose: () => void
}

/** H5 应用内版本历史：分组列出各版本要点（可滚动） */
export function ChangelogModal({ onClose }: ChangelogModalProps) {
  const { t } = useI18n()
  return (
    <div
      role="region"
      aria-label={t('changelog.title')}
      data-testid="changelog-modal"
      style={{
        position: 'fixed',
        top: 64,
        right: 16,
        zIndex: 300,
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        padding: '14px 16px',
        fontSize: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 'min(320px, 92vw)',
        maxHeight: 'min(70vh, 520px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('changelog.title')}</span>
        <button
          data-testid="changelog-close"
          onClick={onClose}
          aria-label={t('common.close')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ✕
        </button>
      </div>
      <div data-testid="changelog-list" style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {CHANGELOG.map((e) => (
          <div key={e.version} style={{ marginBottom: 12 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
              {e.version} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>· {e.date}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              {e.rows.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}