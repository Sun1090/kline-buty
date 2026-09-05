// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { OrderBook } from '../OrderBook'
import { MarketList } from '../MarketList'
import { PeriodBar } from '../PeriodBar'
import { AlertPanel } from '../AlertPanel'
import { PositionPanel } from '../PositionPanel'
import { DesktopHeader } from '../DesktopHeader'
import type { Period } from '../../chart/types'
import type { ChartType, MainIndicatorKind, SubIndicatorKind } from '../ChartView'
import type { DrawingTool } from '../../drawings/logic'
import type { AlertsApi } from '../../hooks/usePriceAlerts'
import type { PriceAlert } from '../../alerts/engine'
import type { Position } from '../../position/pnl'
import {
  BUTTON_SELECTOR,
  auditPressedGroup,
  auditRegion,
  runA11yAudit,
  type A11yAuditOptions,
} from '../../utils/a11yAudit'

afterEach(cleanup)

function expectAuditClean(container: Element, opts: A11yAuditOptions = {}) {
  const r = runA11yAudit(container, opts)
  const detail = r.errors.map((f) => `- [${f.rule}] ${f.target}: ${f.message}`).join('\n')
  expect(r.errors, detail).toEqual([])
}

/** M1 全面板 Tab 可达性审计：主要面板容器需 role=region + aria-label + tabIndex=0（键盘可聚焦滚动） */
describe('M1 面板 Tab 可达性审计', () => {
  it('订单簿容器：role=region + aria-label + tabIndex=0，全树审计无 error', () => {
    const { container } = render(
      <OrderBook
        symbol="BTCUSDT"
        depth={{ bids: [], asks: [] }}
        onHoverPrice={vi.fn()}
        onMarkPrice={vi.fn()}
        onQuickOrder={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )
    const el = screen.getByTestId('order-book')
    expect(auditRegion(el)).toEqual([])
    expect(el.getAttribute('tabindex')).toBe('0')
    expectAuditClean(container)
  })

  it('市场列表容器：role=region + aria-label + tabIndex=0，全树审计无 error', () => {
    const { container } = render(<MarketList symbol="BTCUSDT" onSelectSymbol={vi.fn()} open onToggle={vi.fn()} />)
    const el = screen.getByTestId('market-list')
    expect(auditRegion(el)).toEqual([])
    expect(el.getAttribute('tabindex')).toBe('0')
    expectAuditClean(container)
  })
})

/** O9 纯函数断言库对按钮交互控件的系统化审计：aria-pressed 一致性 / 唯一 aria-label / tabindex 范围 / 可访问名称 */
describe('O9 组件 a11y 审计：PeriodBar', () => {
  it('工具栏按钮：全可访问名称 + 互斥 pressed 恰一个 + roving tabindex 恰一个 0', () => {
    const { container } = render(<PeriodBar value="1m" onChange={vi.fn()} />)
    const bar = screen.getByTestId('period-bar')
    expectAuditClean(container, { pressedGroups: [bar] })
    // 工具栏语义
    expect(bar.getAttribute('role')).toBe('toolbar')
    expect(bar.getAttribute('aria-label')).toBeTruthy()
    // 互斥切换组：恰一个按下，且为当前选中周期
    const pressed = bar.querySelectorAll('button[aria-pressed="true"]')
    expect(pressed).toHaveLength(1)
    expect(pressed[0].getAttribute('data-testid')).toBe('period-1m')
    // roving tabindex：恰一个按钮可 Tab 到
    expect(bar.querySelectorAll('button[tabindex="0"]')).toHaveLength(1)
  })

  it('选中周期变化 → aria-pressed 唯一跟随（互斥一致性随状态迁移）', () => {
    const { rerender } = render(<PeriodBar value="1m" onChange={vi.fn()} />)
    const bar = screen.getByTestId('period-bar')
    rerender(<PeriodBar value="1h" onChange={vi.fn()} />)
    const pressed = bar.querySelectorAll('button[aria-pressed="true"]')
    expect(pressed).toHaveLength(1)
    expect(pressed[0].getAttribute('data-testid')).toBe('period-1h')
    expect(auditPressedGroup(bar)).toEqual([])
  })
})

function makeAlertsApi(overrides: Partial<AlertsApi> = {}): AlertsApi {
  const alert: PriceAlert = { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false }
  return {
    alerts: [alert],
    permission: 'granted',
    addAlert: vi.fn(),
    removeAlert: vi.fn(),
    resetAlert: vi.fn(),
    soundEnabled: true,
    setSoundEnabled: vi.fn(),
    soundKind: 'beep',
    setSoundKind: vi.fn(),
    history: [],
    clearHistory: vi.fn(),
    requestPermission: vi.fn(async () => 'granted' as const),
    ...overrides,
  }
}

/** O9 组件 a11y 审计：AlertPanel */
describe('O9 组件 a11y 审计：AlertPanel', () => {
  it('区域语义 + 按钮可访问名称 + 排序互斥组', () => {
    const { container } = render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeAlertsApi()} />)
    const panel = container.firstChild as HTMLElement
    expectAuditClean(container, { regions: [panel], pressedGroups: [screen.getByTestId('alert-sort')] })
    expect(panel.getAttribute('role')).toBe('region')
    expect(panel.getAttribute('aria-label')).toContain('BTC')
  })

  it('声音开关 aria-pressed 与 soundEnabled 一致', () => {
    const { rerender } = render(
      <AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeAlertsApi({ soundEnabled: true })} />,
    )
    expect(screen.getByTestId('alert-sound-toggle').getAttribute('aria-pressed')).toBe('true')
    rerender(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeAlertsApi({ soundEnabled: false })} />)
    expect(screen.getByTestId('alert-sound-toggle').getAttribute('aria-pressed')).toBe('false')
  })
})

const longPosition: Position = { entry: 100, quantity: 2, direction: 'long', takeProfit: 103, stopLoss: 98 }
const shortPosition: Position = { entry: 100, quantity: 3, direction: 'short', takeProfit: 97, stopLoss: 103 }

/** O9 组件 a11y 审计：PositionPanel */
describe('O9 组件 a11y 审计：PositionPanel', () => {
  it('区域语义 + 杠杆/模式互斥组 + 平仓按钮可访问名称', () => {
    const { container } = render(
      <PositionPanel
        positions={{ long: longPosition, short: shortPosition }}
        currentPrice={105}
        onChange={vi.fn()}
        otherSymbols={{ ETHUSDT: { long: longPosition, short: null } }}
        onSwitchSymbol={vi.fn()}
        onSettleSymbol={vi.fn()}
      />,
    )
    const panel = container.firstChild as HTMLElement
    const leverageRoot = screen.getByText('1x').closest('div')!
    const modeRoot = screen.getByText('百分比').closest('div')!
    // 输入框（quantity/tpPct/slPct）暂缺程序化 <label>，本轮聚焦按钮控件（E11 残余项）
    expectAuditClean(container, {
      interactiveSelector: BUTTON_SELECTOR,
      regions: [panel],
      pressedGroups: [leverageRoot, modeRoot],
    })
    expect(panel.getAttribute('role')).toBe('region')
    expect(panel.getAttribute('aria-label')).toBeTruthy()
  })

  it('多/空平仓按钮 aria-label 唯一（读屏可区分方向）', () => {
    render(<PositionPanel positions={{ long: longPosition, short: shortPosition }} currentPrice={105} onChange={vi.fn()} />)
    const labels = screen.getAllByText('平仓').map((b) => b.getAttribute('aria-label'))
    expect(labels).toEqual(['平仓 开多', '平仓 开空'])
  })
})

/** DesktopHeader 渲染 props（与 DesktopHeader.test.tsx 一致的 setup） */
function setup(overrides: Record<string, unknown> = {}) {
  const handlers = {
    onSymbol: vi.fn(),
    onPeriod: vi.fn(),
    onChartType: vi.fn(),
    onMainIndicator: vi.fn(),
    onSubIndicator: vi.fn(),
    onDrawingTool: vi.fn(),
    onDeleteSelectedDrawing: vi.fn(),
    onCycleLayout: vi.fn(),
    compareSymbol: null,
    onCycleCompare: vi.fn(),
    fontScale: 1,
    onCycleFontScale: vi.fn(),
    onToggleTheme: vi.fn(),
    onColorPreset: vi.fn(),
    onTogglePosition: vi.fn(),
    onToggleAlerts: vi.fn(),
    onToggleDepth: vi.fn(),
    onToggleOrderBook: vi.fn(),
    onToggleVp: vi.fn(),
    onToggleSentiment: vi.fn(),
    onReplay: vi.fn(),
    onToggleSettings: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onToggleShortcuts: vi.fn(),
    onCycleLang: vi.fn(),
    onShare: vi.fn(),
    onExport: vi.fn(),
    onToggleScale: vi.fn(),
    onToggleWatermark: vi.fn(),
    onTextDraftChange: vi.fn(),
    onTextFontSizeChange: vi.fn(),
    onTextColorChange: vi.fn(),
    onTextBgChange: vi.fn(),
    onConfirmText: vi.fn(),
    onCancelText: vi.fn(),
    onToggleCoordBadge: vi.fn(),
    onGlobalOpacityChange: vi.fn(),
  }
  const props = {
    symbol: 'BTCUSDT',
    statusText: '实时',
    statusColor: 'var(--up)',
    period: '1m' as Period,
    chartType: 'candlestick' as ChartType,
    priceScaleMode: 'linear' as const,
    timezoneMode: 'utc' as const,
    onToggleTimezone: vi.fn(),
    mainIndicator: 'ma' as MainIndicatorKind,
    subIndicator: 'volume' as SubIndicatorKind,
    drawingTool: 'none' as DrawingTool,
    drawingColor: '',
    onDrawingColor: vi.fn(),
    drawingSelected: false,
    drawings: [],
    selectedDrawingId: null,
    onSelectDrawing: vi.fn(),
    onToggleDrawingHidden: vi.fn(),
    onToggleDrawingLocked: vi.fn(),
    onSetDrawingOpacity: vi.fn(),
    onSetDrawingFollowLatest: vi.fn(),
    onRenameDrawing: vi.fn(),
    undoDepth: 60,
    onUndoDepthChange: vi.fn(),
    onGroupHidden: vi.fn(),
    onGroupLocked: vi.fn(),
    onDeleteDrawing: vi.fn(),
    onClearDrawings: vi.fn(),
    onSetAllDrawingsHidden: vi.fn(),
    drawingSnap: 'off' as const,
    onToggleDrawingSnap: vi.fn(),
    tradesActive: false,
    onToggleTrades: vi.fn(),
    onExportDrawings: vi.fn(),
    onImportDrawings: vi.fn(),
    drawingCanUndo: false,
    drawingCanRedo: false,
    onUndoDrawing: vi.fn(),
    onRedoDrawing: vi.fn(),
    drawingTemplates: [],
    onSaveDrawingTemplate: vi.fn(),
    onApplyDrawingTemplate: vi.fn(),
    onDeleteDrawingTemplate: vi.fn(),
    drawingCanPaste: false,
    onCopyDrawing: vi.fn(),
    onPasteDrawing: vi.fn(),
    notesHidden: false,
    onToggleNotesHidden: vi.fn(),
    coordBadge: false,
    globalOpacity: 1,
    drawingImportError: null,
    layout: 'single' as const,
    themeMode: 'dark' as const,
    colorPreset: 'classic' as const,
    showWatermark: true,
    positionActive: false,
    alertsActive: false,
    depthActive: false,
    orderBookActive: false,
    vpActive: false,
    sentimentActive: false,
    replayActive: false,
    replayDisabled: false,
    settingsActive: false,
    isFullscreen: false,
    shortcutsActive: false,
    langLabel: '中文',
    copied: false,
    exported: false,
    editingTextId: null,
    textDraft: '',
    textFontSize: 14,
    textColor: '',
    textBg: '',
    ...handlers,
    ...overrides,
  }
  const { container } = render(<DesktopHeader {...props} />)
  return { handlers, container }
}

/** O9 组件 a11y 审计：DesktopHeader */
describe('O9 组件 a11y 审计：DesktopHeader', () => {
  it('默认态：全按钮可访问名称 + aria 状态合法 + tabindex 范围，无 error', () => {
    const { container } = setup()
    expectAuditClean(container)
  })

  it('更多面板展开/收起：aria-expanded 一致性 + 全树审计无 error', () => {
    const { container } = setup()
    const more = screen.getByTestId('header-more')
    expect(more.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(more)
    expect(more.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('desktop-more-panel')).toBeDefined()
    expectAuditClean(container)
    // 收起后回 false
    fireEvent.click(more)
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('desktop-more-panel')).toBeNull()
  })

  it('画线面板展开：工具网格恰一个选中 + 全树审计无 error', () => {
    const { container } = setup({ drawingTool: 'trend' as DrawingTool })
    fireEvent.click(screen.getByTestId('drawing-toggle'))
    expect(screen.getByTestId('desktop-drawing-panel')).toBeDefined()
    // 工具网格（OptionGrid 根）：互斥选择恰一个 aria-pressed=true
    const grid = screen.getByText('趋势线').closest('div')!
    expect(auditPressedGroup(grid)).toEqual([])
    expectAuditClean(container)
  }, 10000)
})
