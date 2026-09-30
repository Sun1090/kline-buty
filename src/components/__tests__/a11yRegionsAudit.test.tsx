// @vitest-environment jsdom
/**
 * O9/E11 region 面板 a11y 全树审计（扩展覆盖，2026-09-29）
 *
 * 背景：a11yAudit.test.tsx 只覆盖 OrderBook / MarketList / PeriodBar / AlertPanel /
 * PositionPanel / DesktopHeader（另 DrawingLayers、MobileHeader 在各自测试里）。
 * 本文件把 runA11yAudit / auditRegion 扩展到其余 14 个带 role="region" 的面板组件：
 * ChangelogModal、DocsIndexModal、DepthChart、IndicatorSettings、PendingOrders、
 * PerfPanel、RecentTrades、SnapshotGallery、PinnedPanel、StatsBar、ReplayBar、
 * VolumeProfileChart、TradeHistoryPanel、SentimentPanel。
 *
 * props 从各组件现有测试文件（src/components/__tests__/<Name>.test.tsx）的 setup 逐字抄；
 * VolumeProfileChart 无既有测试，按组件 props 类型构造最小合法 props。
 * RecentTrades / PinnedPanel 的 hook vi.mock 亦照抄各自测试文件。
 * 每个组件一条 it：面板根过 auditRegion 无 error + 整容器 runA11yAudit 无 error。
 *
 * E11 残余项收口（2026-09-30）：runA11yAudit 从 BUTTON_SELECTOR 升级为 INTERACTIVE_SELECTOR，
 * input/textarea/select 一并纳入可访问名称审计（此前仅审按钮）。
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChangelogModal } from '../ChangelogModal'
import { DocsIndexModal } from '../DocsIndexModal'
import { DepthChart } from '../DepthChart'
import { IndicatorSettings } from '../IndicatorSettings'
import { PendingOrders } from '../PendingOrders'
import { PerfPanel } from '../PerfPanel'
import { RecentTrades } from '../RecentTrades'
import { SnapshotGallery } from '../SnapshotGallery'
import { PinnedPanel } from '../PinnedPanel'
import { StatsBar } from '../StatsBar'
import { ReplayBar } from '../ReplayBar'
import { VolumeProfileChart } from '../VolumeProfileChart'
import { TradeHistoryPanel } from '../TradeHistoryPanel'
import { SentimentPanel } from '../SentimentPanel'
import { createReplay } from '../../replay/engine'
import { tradeStats } from '../../trade/stats'
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'
import { useRecentTrades } from '../../hooks/useRecentTrades'
import type { DepthSnapshot } from '../../hooks/useDepth'
import type { TradePrint } from '../../data/trades'
import type { MarketStats } from '../../hooks/useMarketStats'
import type { SentimentData } from '../../hooks/useSentiment'
import type { PendingOrder } from '../../trade/pending'
import type { TradeRecord } from '../../hooks/usePaperAccount'
import type { Candle } from '../../chart/types'
import { auditRegion, INTERACTIVE_SELECTOR, runA11yAudit } from '../../utils/a11yAudit'

// 照抄 RecentTrades.test.tsx：hook mock（组件内订阅行情流，jsdom 下必须桩掉）
vi.mock('../../hooks/useRecentTrades', () => ({ useRecentTrades: vi.fn(() => []) }))
const hook = vi.mocked(useRecentTrades)

// 照抄 PinnedPanel.test.tsx：行情快照 hook mock
vi.mock('../../hooks/useMarketSnapshots', () => ({
  useMarketSnapshots: vi.fn(() => ({ snapshots: {}, loading: false })),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  hook.mockReset().mockReturnValue([])
})

beforeEach(() => localStorage.clear())

function expectAuditClean(container: Element) {
  const r = runA11yAudit(container, { interactiveSelector: INTERACTIVE_SELECTOR })
  const detail = r.errors.map((f) => `- [${f.rule}] ${f.target}: ${f.message}`).join('\n')
  expect(r.errors, detail).toEqual([])
}

describe('O9/E11 region 面板全树 a11y 审计', () => {
  it('ChangelogModal：region 语义 + 全树审计无 error', () => {
    const onClose = vi.fn()
    render(<ChangelogModal onClose={onClose} />)
    const el = screen.getByTestId('changelog-modal')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('DocsIndexModal：region 语义 + 全树审计无 error', () => {
    const onClose = vi.fn()
    render(<DocsIndexModal onClose={onClose} />)
    const el = screen.getByTestId('docs-index-modal')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('DepthChart：region 语义 + 全树审计无 error（含数据态）', () => {
    const depth: DepthSnapshot = {
      bids: [
        { price: 99, quantity: 2 },
        { price: 98, quantity: 5 },
        { price: 97, quantity: 3 },
      ],
      asks: [
        { price: 101, quantity: 3 },
        { price: 102, quantity: 8 },
        { price: 103, quantity: 2 },
      ],
    }
    render(<DepthChart symbol="BTCUSDT" depth={depth} />)
    const el = screen.getByRole('region')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('IndicatorSettings：region 语义 + 全树审计无 error（关闭钮 ✕ 带 aria-label）', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(
      <IndicatorSettings params={DEFAULT_INDICATOR_PARAMS} mainIndicator="ma" subIndicator="rsi" onChange={onChange} onClose={onClose} />,
    )
    const el = screen.getByTestId('indicator-settings-panel')
    expect(auditRegion(el)).toEqual([])
    // 关闭钮为图标钮，必须带显式 aria-label（与 ChangelogModal 关闭钮同源 t('common.close')）
    expect(screen.getByText('✕').getAttribute('aria-label')).toBeTruthy()
    expectAuditClean(el)
  })

  it('PendingOrders：region 语义 + 全树审计无 error', () => {
    const orders: PendingOrder[] = [
      { id: 'a', symbol: 'BTCUSDT', side: 'buy', price: 60_000, qty: 0.5, createdAt: 1, marketable: false },
      { id: 'b', symbol: 'ETHUSDT', side: 'sell', price: 3_500, qty: 2, createdAt: 2, marketable: false },
    ]
    render(<PendingOrders orders={orders} symbol="BTCUSDT" onCancel={vi.fn()} />)
    const el = screen.getByTestId('pending-orders')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('PerfPanel：region 语义 + 全树审计无 error（空态）', () => {
    render(<PerfPanel frameStats={null} onClose={vi.fn()} />)
    const el = screen.getByTestId('perf-panel')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('RecentTrades：region 语义 + 全树审计无 error（空态骨架）', () => {
    render(<RecentTrades symbol="BTCUSDT" />)
    const el = screen.getByTestId('recent-trades')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('RecentTrades（有数据态）：筛选按钮 aria-pressed 合法 + 全树审计无 error', () => {
    const print = (id: number, buy: boolean): TradePrint => ({
      id,
      price: 63000 + id,
      qty: 1.5,
      time: new Date(2026, 0, 2, 10, 30, id).getTime(),
      buy,
    })
    hook.mockReturnValue([print(1, true), print(2, false)])
    render(<RecentTrades symbol="BTCUSDT" />)
    const el = screen.getByTestId('recent-trades')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('SnapshotGallery：region 语义 + 全树审计无 error（空态）', () => {
    render(<SnapshotGallery onClose={() => {}} />)
    const el = screen.getByTestId('snapshot-gallery')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('PinnedPanel：region 语义 + 全树审计无 error（空列表）', () => {
    render(<PinnedPanel symbols={[]} onSelect={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />)
    const el = screen.getByTestId('pinned-panel')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('StatsBar：region 语义 + 全树审计无 error', () => {
    const EMPTY: MarketStats = {
      price: null, changePct: null, high: null, low: null,
      quoteVolume: null, fundingRate: null, markPrice: null, nextFundingTime: null, openInterest: null,
    }
    render(<StatsBar stats={{ ...EMPTY, price: 65000 }} />)
    const el = screen.getByRole('region')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('ReplayBar：region 语义 + 全树审计无 error', () => {
    render(
      <ReplayBar
        replay={createReplay(100, 10)}
        cursorTime={1786797540}
        onToggle={vi.fn()}
        onSpeed={vi.fn()}
        onSeek={vi.fn()}
        onExit={vi.fn()}
      />,
    )
    const el = screen.getByRole('region')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('VolumeProfileChart：region 语义 + 全树审计无 error（最小合法 props）', () => {
    // 无既有测试文件：按 VolumeProfileChartProps 构造最小合法 candles
    const candles: Candle[] = Array.from({ length: 40 }, (_, i) => ({
      time: 1_700_000_000 + i * 60,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100.5 + i,
      volume: 10 + (i % 5),
      isClosed: true,
    }))
    render(<VolumeProfileChart symbol="BTCUSDT" candles={candles} />)
    const el = screen.getByRole('region')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('TradeHistoryPanel：region 语义 + 全树审计无 error（空态）', () => {
    const props: Parameters<typeof TradeHistoryPanel>[0] = {
      trades: [] as TradeRecord[],
      stats: tradeStats([]),
      takerFeeRatePct: 0.1,
      makerFeeRatePct: 0.02,
      slippagePct: 0.02,
      profitTarget: 0,
      snapshots: [],
      onClose: vi.fn(),
      onClear: vi.fn(),
      onExport: vi.fn(),
      onExportEquity: vi.fn(),
      onReset: vi.fn(),
      onTakerFeeRatePctChange: vi.fn(),
      onSlippagePctChange: vi.fn(),
      onMakerFeeRatePctChange: vi.fn(),
      onProfitTargetChange: vi.fn(),
      onSaveSnapshot: vi.fn(() => true),
      onLoadSnapshot: vi.fn(),
      onDeleteSnapshot: vi.fn(),
      onExportJson: vi.fn(),
      onImportJson: vi.fn(() => true),
    }
    render(<TradeHistoryPanel {...props} />)
    const el = screen.getByTestId('trade-history-panel')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('TradeHistoryPanel（有流水态）：展开按钮 aria-expanded 合法 + 全树审计无 error', () => {
    const trades: TradeRecord[] = [
      { id: '1', at: Date.now(), symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 100, qty: 2, fee: 0.2 },
    ]
    const props: Parameters<typeof TradeHistoryPanel>[0] = {
      trades,
      stats: tradeStats(trades),
      takerFeeRatePct: 0.1,
      makerFeeRatePct: 0.02,
      slippagePct: 0.02,
      profitTarget: 0,
      snapshots: [],
      onClose: vi.fn(),
      onClear: vi.fn(),
      onExport: vi.fn(),
      onExportEquity: vi.fn(),
      onReset: vi.fn(),
      onTakerFeeRatePctChange: vi.fn(),
      onSlippagePctChange: vi.fn(),
      onMakerFeeRatePctChange: vi.fn(),
      onProfitTargetChange: vi.fn(),
      onSaveSnapshot: vi.fn(() => true),
      onLoadSnapshot: vi.fn(),
      onDeleteSnapshot: vi.fn(),
      onExportJson: vi.fn(),
      onImportJson: vi.fn(() => true),
    }
    render(<TradeHistoryPanel {...props} />)
    const el = screen.getByTestId('trade-history-panel')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })

  it('SentimentPanel：region 语义 + 全树审计无 error（空数据四块 loading）', () => {
    const EMPTY: SentimentData = { globalRatio: [], topTraderRatio: [], takerRatio: [], oiHistory: [] }
    render(<SentimentPanel data={EMPTY} />)
    const el = screen.getByTestId('sentiment-panel')
    expect(auditRegion(el)).toEqual([])
    expectAuditClean(el)
  })
})
