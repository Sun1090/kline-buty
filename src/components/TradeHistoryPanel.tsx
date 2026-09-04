import { useState } from 'react'
import type { TradeRecord } from '../hooks/usePaperAccount'
import { useI18n } from '../i18n/useI18n'
import { fmtPricePrecise as fmtPrice } from '../utils/format'
import { equitySeries } from '../utils/equity'
import { buildSparkPath } from '../utils/sparkPath'

interface TradeHistoryPanelProps {
  trades: TradeRecord[]
  onClose: () => void
  onClear: () => void
  /** D14 导出流水 CSV */
  onExport: () => void
  /** J6 导出权益曲线 CSV */
  onExportEquity: () => void
  /** D15 重置模拟账户（两步确认在面板内） */
  onReset: () => void
}

/** 交易流水面板：模拟成交记录（新在前），含清空/导出/重置；空态引导 */
export function TradeHistoryPanel({ trades, onClose, onClear, onExport, onExportEquity, onReset }: TradeHistoryPanelProps) {
  const { t } = useI18n()
  // D15 重置两步确认：首次点击进入确认态，3s 未二次确认自动复位
  const [confirmingReset, setConfirmingReset] = useState(false)
  const handleReset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true)
      window.setTimeout(() => setConfirmingReset(false), 3000)
      return
    }
    setConfirmingReset(false)
    onReset()
  }
  const timeOf = (at: number) => {
    const d = new Date(at)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  return (
    <div
      role="region"
      aria-label={t('paper.title')}
      data-testid="trade-history-panel"
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
        minWidth: 300,
        maxWidth: 'min(360px, 92vw)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>{t('paper.title')}</span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {trades.length > 0 && (
            <>
              <button
                data-testid="trade-history-export"
                onClick={onExport}
                title={t('paper.export')}
                style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
              >
                {t('paper.export')}
              </button>
              <button
                data-testid="trade-history-clear"
                onClick={onClear}
                style={{ border: 'none', background: 'transparent', color: 'var(--down)', fontSize: 11, cursor: 'pointer', padding: 0 }}
              >
                {t('paper.clear')}
              </button>
            </>
          )}
          <button
            data-testid="trade-history-reset"
            onClick={handleReset}
            title={t('paper.reset')}
            style={{
              border: 'none',
              background: 'transparent',
              color: confirmingReset ? '#fff' : 'var(--text-faint)',
              backgroundColor: confirmingReset ? 'var(--down)' : 'transparent',
              borderRadius: 4,
              padding: '1px 5px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {confirmingReset ? t('paper.resetConfirm') : t('paper.reset')}
          </button>
          <button
            data-testid="trade-history-export-equity"
            onClick={onExportEquity}
            title={t('paper.exportEquity')}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-faint)',
              borderRadius: 4,
              padding: '1px 5px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {t('paper.exportEquity')}
          </button>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            ✕
          </button>
        </span>
      </div>
      {trades.length === 0 ? (
        <div style={{ padding: '12px 4px', color: 'var(--text-faint)', textAlign: 'center' }}>{t('paper.empty')}</div>
      ) : (
        <div>
          {/* D13 权益曲线：由流水推导的权益 sparkline */}
          {(() => {
            const pts = equitySeries(trades)
            const last = pts[pts.length - 1]?.equity ?? 10_000
            const up = last >= 10_000
            const d = buildSparkPath(pts.map((p) => p.equity), 280, 48)
            return (
              <div
                data-testid="trade-history-equity"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px 10px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}
              >
                <svg width={280} height={48} role="img" aria-label={t('paper.equity')} style={{ flex: 'none' }}>
                  <path d={d} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                <span style={{ color: 'var(--text-faint)', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {t('paper.equity')}
                  <b style={{ color: up ? 'var(--up)' : 'var(--down)', marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>{last.toFixed(2)}</b>
                </span>
              </div>
            )
          })()}
          <div style={{ maxHeight: 'min(46vh, 380px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {trades.map((tr) => {
            const dirColor = tr.side === 'buy' ? 'var(--up)' : 'var(--down)'
            return (
              <div
                key={tr.id}
                data-testid="trade-history-row"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}
              >
                <span style={{ color: 'var(--text-faint)', width: 58, flexShrink: 0 }}>{timeOf(tr.at)}</span>
                <span style={{ color: dirColor, fontWeight: 600, width: 44, flexShrink: 0 }}>
                  {tr.side === 'buy' ? t('paper.long') : t('paper.short')}
                </span>
                <span style={{ color: 'var(--text-dim)', width: 30, flexShrink: 0 }}>{tr.kind === 'open' ? t('paper.open') : t('paper.close')}</span>
                <span style={{ color: 'var(--text)', flex: 1, textAlign: 'right' }}>{fmtPrice(tr.price)}</span>
                <span style={{ color: 'var(--text-dim)', width: 70, textAlign: 'right', flexShrink: 0 }}>{tr.qty}</span>
                {tr.kind === 'close' ? (
                  <span style={{ color: (tr.pnl ?? 0) >= 0 ? 'var(--up)' : 'var(--down)', width: 76, textAlign: 'right', flexShrink: 0 }}>
                    {(tr.pnl ?? 0) >= 0 ? '+' : ''}
                    {(tr.pnl ?? 0).toFixed(2)}
                  </span>
                ) : (
                  <span style={{ width: 76, flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
        </div>
      )}
    </div>
  )
}
