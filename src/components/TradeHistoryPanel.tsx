import { useRef, useState } from 'react'
import type { TradeRecord } from '../hooks/usePaperAccount'
import type { TradeStats } from '../trade/stats'
import { profitTargetStatus } from '../trade/stats'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useI18n } from '../i18n/useI18n'
import { fmtPricePrecise as fmtPrice } from '../utils/format'
import { equitySeries } from '../utils/equity'
import { maxDrawdown, currentDrawdown, pnlBars } from '../trade/perf'
import { filterTrades, tradeSymbols } from '../trade/filter'
import { periodPnl as periodPnlOf } from '../trade/daily'
import { groupTradesByDay, dailySummary } from '../trade/daily'
import { symbolBreakdown } from '../trade/breakdown'
import { EquityCurve } from './EquityCurve'
import { PnlBars } from './PnlBars'

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
  /** 导出流水 CSV（v0.5.x 传入当前筛选结果；未筛选时为全量） */
  onExport: (trades: TradeRecord[]) => void
  /** 导出权益曲线 CSV */
  onExportEquity: () => void
  /** 重置模拟账户（两步确认在面板内） */
  onReset: () => void
  /** D14 收益目标（USDT，0=未设置） */
  profitTarget: number
  onProfitTargetChange: (v: number) => void
  /** D13 账户快照：名称列表（新在前）+ 保存/载入/删除 */
  snapshots: string[]
  onSaveSnapshot: (name: string) => boolean
  onLoadSnapshot: (name: string) => void
  onDeleteSnapshot: (name: string) => void
  /** D15 账户 JSON 导入/导出 */
  onExportJson: () => void
  onImportJson: (json: string) => boolean
  /** v0.5 按品种汇总点击切换主图品种（可选；未传则行不可点击） */
  onSwitchSymbol?: (symbol: string) => void
  /** v0.5.x 流水行点击定位到图表该时刻（传 symbol + 成交时间戳；未传则行不可点击定位） */
  onLocateTrade?: (symbol: string, at: number) => void
}

/** D10 手续费拆分：由费率倒推计费成交额（费率缺失时用 价格×数量 兜底展示） */
function feeNotional(tr: TradeRecord): number {
  if (tr.feeRate && tr.feeRate > 0) return tr.fee / tr.feeRate
  return tr.price * tr.qty
}

/** 交易流水面板：模拟成交记录（新在前），含统计/目标/设置/快照/导入导出/清空/重置；流水行可展开手续费明细 */
export function TradeHistoryPanel({
  trades,
  stats,
  takerFeeRatePct,
  slippagePct,
  onTakerFeeRatePctChange,
  onSlippagePctChange,
  onClose,
  onClear,
  onExport,
  onExportEquity,
  onReset,
  profitTarget,
  onProfitTargetChange,
  snapshots,
  onSaveSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
  onExportJson,
  onImportJson,
  onSwitchSymbol,
  onLocateTrade,
}: TradeHistoryPanelProps) {
  const { t } = useI18n()
  // 重置两步确认：首次点击进入确认态，3s 未二次确认自动复位
  const [confirmingReset, setConfirmingReset] = useState(false)
  // D10 展开的流水行 id
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // D13 快照名输入
  const [snapshotName, setSnapshotName] = useState('')
  // D15 导入结果提示
  const [importStatus, setImportStatus] = useState<'' | 'ok' | 'fail'>('')
  // v0.5 按品种汇总折叠开关
  const [showBySymbol, setShowBySymbol] = useState(false)
  // v0.5 流水过滤：品种 / 方向 / 关键词（仅过滤列表，统计与权益曲线用全量）
  const [filterSymbol, setFilterSymbol] = useState('')
  const [filterSide, setFilterSide] = useState<'buy' | 'sell' | ''>('')
  const [filterQuery, setFilterQuery] = useState('')
  const visibleTrades = filterTrades(trades, {
    symbol: filterSymbol || undefined,
    side: filterSide || undefined,
    query: filterQuery || undefined,
  })
  const symbols = tradeSymbols(trades)
  // v0.5.x 期间已实现盈亏：今日 / 本周 / 本月（UTC 口径，供统计条下方展示）
  const periodPnl = periodPnlOf(trades)
  const fileRef = useRef<HTMLInputElement>(null)
  // F4 焦点陷阱：Tab 在面板内循环，关闭恢复焦点
  const rootRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, rootRef)

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
  const target = profitTargetStatus(stats.totalPnl, profitTarget)
  const handleSaveSnapshot = () => {
    if (onSaveSnapshot(snapshotName)) setSnapshotName('')
  }
  // D15 导入：读文件 → 校验 → 恢复；成功/失败给短提示（2.5s 自动回落）
  const handleImportFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const ok = onImportJson(String(reader.result ?? ''))
      setImportStatus(ok ? 'ok' : 'fail')
      window.setTimeout(() => setImportStatus(''), 2500)
    }
    reader.readAsText(file)
  }
  return (
    <div
      ref={rootRef}
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
          {visibleTrades.length > 0 && (
            <>
              <button
                data-testid="trade-history-export"
                onClick={() => onExport(visibleTrades)}
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
      {/* v0.5.x 期间已实现盈亏：今日 / 本周 / 本月（UTC 口径，正负着色） */}
      {trades.length > 0 && (
        <div
          data-testid="trade-period-pnl"
          style={{ display: 'flex', gap: 12, padding: '2px 2px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8, flexWrap: 'wrap' }}
        >
          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{t('trade.period')}:</span>
          {(
            [
              ['trade.dailyPnl', periodPnl.today],
              ['trade.weekPnl', periodPnl.week],
              ['trade.monthPnl', periodPnl.month],
            ] as const
          ).map(([labelKey, value]) => (
            <span key={labelKey} style={{ fontSize: 11 }}>
              {t(labelKey)}{' '}
              <b style={{ color: value >= 0 ? 'var(--up)' : 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>
                {value >= 0 ? '+' : ''}
                {value.toFixed(2)}
              </b>
            </span>
          ))}
        </div>
      )}
      {/* v0.5 按品种汇总：折叠区（默认收起），净盈亏降序 */}
      {trades.length > 1 && (
        <div style={{ padding: '2px 0 8px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <button
            data-testid="trade-by-symbol-toggle"
            onClick={() => setShowBySymbol((v) => !v)}
            aria-expanded={showBySymbol}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            {showBySymbol ? '▾ ' : '▸ '}{t('trade.bySymbol')}
          </button>
          {showBySymbol && (
            <div data-testid="trade-by-symbol" style={{ marginTop: 4, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {symbolBreakdown(trades).map((b) => (
                <div
                  key={b.symbol}
                  onClick={onSwitchSymbol ? () => onSwitchSymbol(b.symbol) : undefined}
                  data-testid={`trade-by-symbol-row-${b.symbol}`}
                  title={onSwitchSymbol ? t('trade.bySymbol') : undefined}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    cursor: onSwitchSymbol ? 'pointer' : 'default',
                  }}
                >
                  <span style={{ width: 90, flexShrink: 0, color: 'var(--text)' }}>{b.symbol}</span>
                  <span style={{ color: 'var(--text-faint)', width: 44, flexShrink: 0 }}>{t('trade.dailyCount')} {b.count}</span>
                  <span style={{ color: 'var(--text-faint)', width: 44, flexShrink: 0 }}>{t('trade.winRate')} {b.closed > 0 ? `${Math.round(b.winRate * 100)}%` : '—'}</span>
                  <span style={{ color: 'var(--text-dim)', width: 70, flexShrink: 0, textAlign: 'right' }}>
                    {t('trade.totalPnl')}{' '}
                    <b style={{ color: b.pnl >= 0 ? 'var(--up)' : 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>
                      {b.pnl >= 0 ? '+' : ''}{b.pnl.toFixed(2)}
                    </b>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* D14 收益目标：输入目标 → 进度条 + 达成提示 */}
      <div
        data-testid="trade-history-target"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 2px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8, flexWrap: 'wrap' }}
      >
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{t('trade.target')}</span>
        <input
          data-testid="trade-target-input"
          type="number"
          min={0}
          step={10}
          value={Number.isFinite(profitTarget) && profitTarget > 0 ? profitTarget : ''}
          placeholder="0"
          onChange={(e) => onProfitTargetChange(Number(e.target.value) || 0)}
          style={{ width: 64, padding: '2px 4px', fontSize: 11, borderRadius: 4, border: '1px solid #2a2e39', background: 'var(--bg)', color: 'var(--text)' }}
        />
        {profitTarget > 0 && (
          <>
            <span style={{ fontSize: 11, color: target.achieved ? 'var(--up)' : 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(target.progress * 100)}%
            </span>
            <span style={{ fontSize: 11, flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', minWidth: 40 }}>
              <span
                data-testid="trade-target-progress"
                style={{ display: 'block', height: '100%', width: `${target.progress * 100}%`, background: target.achieved ? 'var(--up)' : 'var(--accent)' }}
              />
            </span>
            {target.achieved && (
              <b data-testid="trade-target-achieved" style={{ color: 'var(--up)', fontSize: 11 }}>
                {t('trade.targetHit')} 🎉
              </b>
            )}
          </>
        )}
      </div>
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
      {/* D13/D15 账户工具：JSON 导入/导出 + 账户快照（保存/载入/删除） */}
      <div
        data-testid="trade-history-account"
        style={{ display: 'flex', gap: 6, padding: '2px 2px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <button
          data-testid="trade-history-export-json"
          onClick={onExportJson}
          title={t('paper.exportJson')}
          style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
        >
          {t('paper.exportJson')}
        </button>
        <button
          data-testid="trade-history-import-json"
          onClick={() => fileRef.current?.click()}
          title={t('paper.importJson')}
          style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
        >
          {t('paper.importJson')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          data-testid="trade-history-import-file"
          onChange={(e) => {
            handleImportFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {importStatus === 'ok' && <span style={{ color: 'var(--up)', fontSize: 11 }}>{t('paper.importDone')}</span>}
        {importStatus === 'fail' && <span style={{ color: 'var(--down)', fontSize: 11 }}>{t('paper.importFail')}</span>}
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('paper.snapshot')}</span>
        <input
          data-testid="trade-snapshot-name"
          value={snapshotName}
          placeholder={t('paper.snapshotName')}
          onChange={(e) => setSnapshotName(e.target.value)}
          style={{ width: 72, padding: '2px 4px', fontSize: 11, borderRadius: 4, border: '1px solid #2a2e39', background: 'var(--bg)', color: 'var(--text)' }}
        />
        <button
          data-testid="trade-snapshot-save"
          onClick={handleSaveSnapshot}
          style={{ border: 'none', background: 'rgba(41,98,255,0.15)', color: 'var(--accent)', borderRadius: 4, padding: '1px 6px', fontSize: 11, cursor: 'pointer' }}
        >
          {t('paper.saveSnapshot')}
        </button>
      </div>
      {snapshots.length > 0 && (
        <div
          data-testid="trade-snapshot-list"
          style={{ display: 'flex', gap: 6, padding: '2px 2px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}
        >
          {snapshots.map((name) => (
            <span key={name} data-testid={`trade-snapshot-${name}`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
              <b style={{ color: 'var(--text)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</b>
              <button
                data-testid={`trade-snapshot-load-${name}`}
                onClick={() => onLoadSnapshot(name)}
                title={t('paper.loadSnapshot')}
                style={{ border: 'none', background: 'rgba(41,98,255,0.12)', color: 'var(--accent)', borderRadius: 3, padding: '0 4px', fontSize: 10, cursor: 'pointer' }}
              >
                {t('paper.loadSnapshot')}
              </button>
              <button
                data-testid={`trade-snapshot-del-${name}`}
                onClick={() => onDeleteSnapshot(name)}
                title={t('paper.deleteSnapshot')}
                style={{ border: 'none', background: 'rgba(239,83,80,0.12)', color: 'var(--down)', borderRadius: 3, padding: '0 4px', fontSize: 10, cursor: 'pointer' }}
              >
                {t('paper.deleteSnapshot')}
              </button>
            </span>
          ))}
        </div>
      )}
      {trades.length === 0 ? (
        <div style={{ padding: '12px 4px', color: 'var(--text-faint)', textAlign: 'center' }}>{t('paper.empty')}</div>
      ) : (
        <div>
          {/* v0.5 权益曲线：交互式曲线 + 最大回撤/当前回撤（由流水推导） */}
          {(() => {
            const pts = equitySeries(trades)
            const last = pts[pts.length - 1]?.equity ?? 10_000
            const up = last >= 10_000
            const mdd = maxDrawdown(pts, 10_000)
            const cdd = currentDrawdown(pts, 10_000)
            return (
              <div
                data-testid="trade-history-equity"
                style={{ padding: '6px 2px 10px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}
              >
                <EquityCurve points={pts} initialBalance={10_000} height={120} />
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-faint)' }}>
                    {t('paper.equity')}
                    <b style={{ color: up ? 'var(--up)' : 'var(--down)', marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>{last.toFixed(2)}</b>
                  </span>
                  <span style={{ color: 'var(--text-faint)' }}>
                    {t('trade.maxDrawdown')}
                    <b style={{ color: mdd > 0 ? 'var(--down)' : 'var(--text-dim)', marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {(mdd * 100).toFixed(2)}%
                    </b>
                  </span>
                  <span style={{ color: 'var(--text-faint)' }}>
                    {t('trade.drawdown')}
                    <b style={{ color: cdd > 0 ? 'var(--down)' : 'var(--text-dim)', marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {(cdd * 100).toFixed(2)}%
                    </b>
                  </span>
                </div>
              </div>
            )
          })()}
          {/* v0.5 逐笔盈亏条形图：已平仓记录盈亏可视化（无平仓 → 不渲染） */}
          <PnlBars data={pnlBars(trades)} />
          {/* v0.5 流水过滤：品种 / 方向 / 关键词（仅过滤列表） */}
          {symbols.length > 1 && (
            <div
              data-testid="trade-filter-row"
              style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 0 8px', flexWrap: 'wrap' }}
            >
              <select
                data-testid="trade-filter-symbol"
                aria-label={t('trade.filterSymbol')}
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
                style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="">{t('trade.all')}</option>
                {symbols.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                data-testid="trade-filter-side"
                aria-label={t('trade.filterSide')}
                value={filterSide}
                onChange={(e) => setFilterSide(e.target.value as 'buy' | 'sell' | '')}
                style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="">{t('trade.filterSide')}: {t('trade.all')}</option>
                <option value="buy">{t('paper.long')}</option>
                <option value="sell">{t('paper.short')}</option>
              </select>
              <input
                data-testid="trade-filter-query"
                aria-label={t('trade.filterQuery')}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('trade.filterQuery')}
                style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', width: 96 }}
              />
            </div>
          )}
          <div style={{ maxHeight: 'min(46vh, 380px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {visibleTrades.length === 0 && trades.length > 0 ? (
              <div style={{ padding: '8px 4px', color: 'var(--text-faint)', textAlign: 'center', fontSize: 12 }}>{t('trade.filterEmpty')}</div>
            ) : (
              groupTradesByDay(visibleTrades).map((day) => {
                const sum = dailySummary(day)
                return (
                  <div key={day.dayKey}>
                    {/* v0.5 按日分组：UTC 日标题 + 每日小计（笔数 / 净盈亏） */}
                    <div
                      data-testid="trade-history-day"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 2px', fontSize: 10, color: 'var(--text-faint)' }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>{day.dayKey}</span>
                      <span>{t('trade.dailyCount')} {sum.count}</span>
                      {sum.closed > 0 && (
                        <span>
                          {t('trade.dailyPnl')}{' '}
                          <b style={{ color: sum.pnl >= 0 ? 'var(--up)' : 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>
                            {sum.pnl >= 0 ? '+' : ''}{sum.pnl.toFixed(2)}
                          </b>
                        </span>
                      )}
                    </div>
                    {day.trades.map((tr) => {
              const dirColor = tr.side === 'buy' ? 'var(--up)' : 'var(--down)'
              const expanded = expandedId === tr.id
              // D10 手续费拆分：成交额、费率、价差盈亏、净盈亏
              const notional = feeNotional(tr)
              const grossPnl = tr.kind === 'close' ? (tr.pnl ?? 0) + tr.fee : 0
              return (
                <div key={tr.id}>
                  <div
                    data-testid="trade-history-row"
                    onClick={onLocateTrade ? () => onLocateTrade(tr.symbol, tr.at) : undefined}
                    title={onLocateTrade ? t('trade.locate') : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: expanded ? 'none' : '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', cursor: onLocateTrade ? 'pointer' : 'default' }}
                  >
                    <button
                      data-testid={`trade-history-detail-toggle-${tr.kind}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(expanded ? null : tr.id)
                      }}
                      aria-label={t('trade.detail')}
                      aria-expanded={expanded}
                      style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', fontSize: 10, cursor: 'pointer', padding: 0, width: 12, flexShrink: 0 }}
                    >
                      {expanded ? '▾' : '▸'}
                    </button>
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
                  {expanded && (
                    <div
                      data-testid="trade-history-detail"
                      style={{ display: 'flex', gap: 10, padding: '3px 2px 6px 12px', borderBottom: '1px solid var(--border)', marginBottom: 2, flexWrap: 'wrap', fontSize: 10, color: 'var(--text-faint)' }}
                    >
                      <span>{t('trade.notional')} <b style={{ color: 'var(--text)' }}>{notional.toFixed(2)}</b></span>
                      <span>{t('trade.feeRateDetail')} <b style={{ color: 'var(--text)' }}>{((tr.feeRate ?? (notional > 0 ? tr.fee / notional : 0)) * 100).toFixed(2)}%</b></span>
                      <span>{t('trade.feeDetail')} <b style={{ color: 'var(--down)' }}>{tr.fee.toFixed(4)}</b></span>
                      {tr.kind === 'close' && (
                        <>
                          <span>{t('trade.grossPnl')} <b style={{ color: grossPnl >= 0 ? 'var(--up)' : 'var(--down)' }}>{grossPnl.toFixed(2)}</b></span>
                          <span>{t('trade.netPnl')} <b style={{ color: (tr.pnl ?? 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>{(tr.pnl ?? 0).toFixed(2)}</b></span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
