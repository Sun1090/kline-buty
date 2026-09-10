import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { listSnapshots, deleteSnapshot, clearSnapshots, type ChartSnapshot } from '../utils/snapshotGallery'

interface SnapshotGalleryProps {
  onClose: () => void
}

/** I14 图表快照画廊：本地保存的图表截图对比（缩略图网格 / 全尺寸预览 / 删除 / 清空） */
export function SnapshotGallery({ onClose }: SnapshotGalleryProps) {
  const { t } = useI18n()
  const [snaps, setSnaps] = useState<ChartSnapshot[]>([])
  const [preview, setPreview] = useState<ChartSnapshot | null>(null)
  const [tick, setTick] = useState(0)

  // 打开与每次操作后重读（快照在 ChartView 侧保存，本地存储为准）
  useEffect(() => {
    setSnaps(listSnapshots())
  }, [tick])

  const remove = (id: string) => {
    deleteSnapshot(id)
    setTick((n) => n + 1)
    if (preview?.id === id) setPreview(null)
  }

  return (
    <div
      role="region"
      aria-label={t('snap.title')}
      data-testid="snapshot-gallery"
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
        width: 'min(560px, 94vw)',
        maxHeight: 'min(72vh, 560px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('snap.title')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {snaps.length > 0 && (
            <button
              data-testid="snapshot-clear"
              onClick={() => {
                clearSnapshots()
                setTick((n) => n + 1)
                setPreview(null)
              }}
              style={{ border: 'none', background: 'transparent', color: 'var(--danger, #e05561)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              {t('snap.clearAll')}
            </button>
          )}
          <button
            data-testid="snapshot-close"
            onClick={onClose}
            aria-label={t('common.close')}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            ✕
          </button>
        </div>
      </div>

      {snaps.length === 0 ? (
        <div data-testid="snapshot-empty" style={{ color: 'var(--text-faint)', padding: '18px 0', textAlign: 'center' }}>
          {t('snap.empty')}
        </div>
      ) : (
        <div data-testid="snapshot-grid" style={{ overflowY: 'auto', overscrollBehavior: 'contain', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {snaps.map((s) => (
            <div
              key={s.id}
              data-testid={`snapshot-item-${s.id}`}
              style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <button
                onClick={() => setPreview(s)}
                aria-label={`${t('snap.preview')}: ${s.name}`}
                style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
              >
                <img src={s.dataUrl} alt={s.name} style={{ width: '100%', display: 'block' }} />
              </button>
              <div style={{ padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>
                  {s.name}
                </span>
                <button
                  data-testid={`snapshot-delete-${s.id}`}
                  onClick={() => remove(s.id)}
                  aria-label={`${t('common.delete')}: ${s.name}`}
                  style={{ border: 'none', background: 'transparent', color: 'var(--danger, #e05561)', fontSize: 12, cursor: 'pointer', padding: 0, flex: '0 0 auto' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          data-testid="snapshot-preview"
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img src={preview.dataUrl} alt={preview.name} style={{ maxWidth: '92vw', maxHeight: '86vh', border: '1px solid var(--border)', borderRadius: 6 }} />
        </div>
      )}
    </div>
  )
}