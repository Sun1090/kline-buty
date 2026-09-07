import type { FrameStats } from '../utils/frameGauge'
import { isDropping } from '../utils/frameGauge'
import { useI18n } from '../i18n/useI18n'

interface PerfPanelProps {
  /** WS 实时帧统计（null=无实时帧） */
  frameStats: FrameStats | null
  onClose: () => void
}

/** G10 图表卡顿诊断面板：实时帧速率 / 丢帧率 / 平均帧间隔 / 窗口帧数 */
export function PerfPanel({ frameStats, onClose }: PerfPanelProps) {
  const { t } = useI18n()
  const fps = frameStats && frameStats.avgInterval > 0 ? 1000 / frameStats.avgInterval : 0
  const dropping = frameStats !== null && isDropping(frameStats)
  return (
    <div
      role="region"
      aria-label={t('perf.panelTitle')}
      data-testid="perf-panel"
      style={{
        position: 'absolute',
        top: 52,
        right: 16,
        zIndex: 100,
        background: 'var(--panel)',
        border: '1px solid #2a2e39',
        borderRadius: 8,
        padding: '12px 14px',
        fontSize: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 220,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('perf.panelTitle')}</span>
        <button
          data-testid="perf-panel-close"
          onClick={onClose}
          aria-label={t('common.close')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ✕
        </button>
      </div>
      {!frameStats ? (
        <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('perf.noFrame')}</div>
      ) : (
        <div data-testid="perf-stats" style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-dim)', fontSize: 11 }}>
          <span>
            {t('perf.fps')} <b data-testid="perf-fps" style={{ color: fps >= 30 ? 'var(--up)' : 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>{fps.toFixed(1)}</b>
          </span>
          <span>
            {t('perf.dropRate')}{' '}
            <b data-testid="perf-drop-rate" style={{ color: dropping ? 'var(--down)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {(frameStats.rate * 100).toFixed(1)}%
            </b>
          </span>
          <span>
            {t('perf.avgInterval')} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{frameStats.avgInterval.toFixed(1)} ms</b>
          </span>
          <span>
            {t('perf.window')} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{frameStats.total}</b>
          </span>
          {dropping && (
            <div data-testid="perf-warn" style={{ color: 'var(--yellow)', fontWeight: 600, marginTop: 4 }}>
              {t('perf.warn')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
