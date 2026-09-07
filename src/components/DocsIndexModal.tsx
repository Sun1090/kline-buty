import { useI18n } from '../i18n/useI18n'

interface DocsIndexModalProps {
  onClose: () => void
}

/** H3 应用内文档索引：项目文档 / 知识库 / 仓库 快捷入口 */
export function DocsIndexModal({ onClose }: DocsIndexModalProps) {
  const { t } = useI18n()
  const entries: { label: string; href: string; external?: boolean; desc: string }[] = [
    { label: t('docs.knowledge'), href: `${import.meta.env.BASE_URL}knowledge/`, desc: t('docs.knowledgeDesc') },
    { label: t('docs.readme'), href: 'https://github.com/sun1090/kline-buty#readme', external: true, desc: t('docs.readmeDesc') },
    { label: t('docs.repo'), href: 'https://github.com/sun1090/kline-buty', external: true, desc: t('docs.repoDesc') },
    { label: t('docs.changelog'), href: 'https://github.com/sun1090/kline-buty/blob/main/CHANGELOG.md', external: true, desc: t('docs.changelogDesc') },
  ]
  return (
    <div
      role="region"
      aria-label={t('docs.title')}
      data-testid="docs-index-modal"
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
        minWidth: 'min(300px, 92vw)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('docs.title')}</span>
        <button
          data-testid="docs-index-close"
          onClick={onClose}
          aria-label={t('common.close')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ✕
        </button>
      </div>
      <div data-testid="docs-index-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map((e) => (
          <a
            key={e.label}
            href={e.href}
            target={e.external ? '_blank' : undefined}
            rel={e.external ? 'noopener noreferrer' : undefined}
            data-testid={`docs-link-${e.label}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              textDecoration: 'none',
              color: 'var(--text)',
            }}
          >
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{e.label}</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>{e.desc}</span>
          </a>
        ))}
      </div>
    </div>
  )
}