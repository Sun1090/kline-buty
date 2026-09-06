import { useState } from 'react'
import type { TradeRecord } from '../hooks/usePaperAccount'
import type { TradeStats } from '../trade/stats'
import { useI18n } from '../i18n/useI18n'
import { fmtPricePrecise as fmtPrice } from '../utils/format'
import { equitySeries } from '../utils/equity'
import { buildSparkPath } from '../utils/sparkPath'

interface TradeHistoryPanelProps {
  trades: TradeRecord[]
  /** D6 盈亏统计（App 层用 tradeStats 计算后传入） */
  stats: TradeStats
  /** D5/D8 交易设置（费率/滑点，百分比显示） */
  takerFeeRatePct: number
  slippagePct: number
  onTakerFeeRatePctChange: (pct: number) => void
  onSlippagePctChange: (pct: number) => void
  onClose: () => void
  onClear: () => void
  /** D14 导出流水 CSV */
  onExport: () => void
  /** J6 导出权益曲线 CSV */
  onExportEquity: () => void
  /** D15 重置模拟账户（两步确认在面板内） */
  onReset: () => void
}

/** 交易流水面板：模拟成交记录（新在前），含统计/设置/清空/导出/重置；空态引导 */
export function TradeHistoryPanel({ trades, stats, takerFeeRatePct, slippagePct, onTakerFeeRatePctChange, onSlippagePctChange, onClose, onClear, onExport, onExportEquity, onReset }: TradeHistoryPanelProps) {
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
      {/* D6 交易统计：胜率 / 累计盈亏 / 盈亏比（有平仓记录时显示） */}
      {stats.closed > 0 && (
        <div
          data-testid="trade-history-stats"
          style={{ display: 'flex', gap: 12, padding: '4px 2px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8, flexWrap: 'wrap' }}
        >
          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            {t('trade.stats')}:
          </span>
          <span style={{ fontSize: 11, color: 'var(--text)' }}>
            {t('trade.winRate')} <b style={{ color: stats.winRate >= 0.5 ? 'var(--up)' : 'var(--down)' }}>{(stats.winRate * 100).toFixed(0)}%</b>
          </span>
          <span style={{ fontSize: 11 }}>
            {t('trade.totalPnl')} <b style={{ color: stats.totalPnl >= 0 ? 'var(--up)' : 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>{stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}</b>
          </span>
          <span style={{ fontSize: 11 }}>
            {t('trade.profitFactor')}{' '}
            <b style={{ color: stats.profitFactor >= 1 ? 'var(--up)' : 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>
              {Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
            </b>
          </span>
          <span style={{ fontSize: 11 }}>
            {t('trade.avgWin')} <b style={{ color: 'var(--up)', fontVariantNumeric: 'tabular-nums' }}>{stats.avgWin.toFixed(2)}</b>
          </span>
          <span style={{ fontSize: 11 }}>
            {t('trade.avgLoss')} <b style={{ color: 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>{stats.avgLoss.toFixed(2)}</b>
          </span>
        </div>
      )}
      {/* D5/D8 交易设置：吃单费率 + 市价滑点（百分比输入，持久化） */}
      <div
        data-testid="trade-history-settings"
        style={{ display: 'flex', gap: 10, padding: '2px 2px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8, alignItems: 'center' }}
      >
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{t('trade.settings')}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)' }}>
          {t('trade.feeRate')}
          <input
            data-testid="trade-fee-rate"
            type="number"
            min={0}
            step={0.01}
            value={takerFeeRatePct}
            onChange={(e) => onTakerFeeRatePctChange(Number(e.target.value))}
            style={{ width: 56, padding: '2px 4px', fontSize: 11, borderRadius: 4, border: '1px solid #2a2e39', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)' }}>
          {t('trade.slippage')}
          <input
            data-testid="trade-slippage"
            type="number"
            min={0}
            step={0.001}
            value={slippagePct}
            onChange={(e) => onSlippagePctChange(Number(e.target.value))}
            style={{ width: 56, padding: '2px 4px', fontSize: 11, borderRadius: 4, border: '1px solid #2a2e39', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </label>
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
