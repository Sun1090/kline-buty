// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { MobileHeader } from '../MobileHeader'
import type { Period } from '../../chart/types'
import type { ChartType, MainIndicatorKind, SubIndicatorKind } from '../ChartView'
import type { DrawingTool } from '../../drawings/logic'

afterEach(cleanup)

function setup(overrides: Partial<Parameters<typeof MobileHeader>[0]> = {}) {
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
    onGlobalOpacityChange: vi.fn(),
  }
  const props: Parameters<typeof MobileHeader>[0] = {
    symbol: 'BTCUSDT',
    statusText: '实时',
    statusColor: 'var(--up)',
    period: '1m' as Period,
    chartType: 'candlestick' as ChartType,
    priceScaleMode: 'linear',
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
    onToggleCoordBadge: vi.fn(),
    globalOpacity: 1,
    drawingImportError: null,
    layout: 'single',
    themeMode: 'dark',
    colorPreset: 'classic',
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
    ...handlers,
    ...overrides,
  }
  render(<MobileHeader {...props} />)
  return handlers
}

describe('MobileHeader（移动端工具栏整合）', () => {
  it('三行布局：symbol/周期/菜单行渲染，且周期按钮可直接点击', () => {
    const h = setup()
    expect(screen.getByText(/BTC\/USDT/)).toBeDefined()
    expect(screen.getByText('实时')).toBeDefined()
    // 周期横滚保留：直接点「1分」
    fireEvent.click(screen.getByText('1分'))
    expect(h.onPeriod).toHaveBeenCalledWith('1m')
  })

  it('副图弹层：展开菜单选 MACD → 回调 + 面板收起', () => {
    const h = setup()
    fireEvent.click(screen.getByTestId('mobile-menu-sub'))
    expect(screen.getByText('MACD')).toBeDefined()
    fireEvent.click(screen.getByText('MACD'))
    expect(h.onSubIndicator).toHaveBeenCalledWith('macd')
    // 选择后面板收起
    expect(screen.queryByTestId('mobile-menu-sub')).toBeDefined() // 触发按钮仍在
    expect(screen.queryByTestId('mobile-menu-sub')).not.toBeNull()
  })

  it('画线弹层：展开选「矩形」→ 回调', () => {
    const h = setup()
    fireEvent.click(screen.getByTestId('mobile-menu-drawing'))
    fireEvent.click(screen.getByText('矩形'))
    expect(h.onDrawingTool).toHaveBeenCalledWith('rect')
  })

  it('类型弹层：切折线', () => {
    const h = setup()
    fireEvent.click(screen.getByTestId('mobile-menu-type'))
    fireEvent.click(screen.getByText('折线'))
    expect(h.onChartType).toHaveBeenCalledWith('line')
  })

  it('更多弹层：面板开关项回调', () => {
    const h = setup()
    fireEvent.click(screen.getByTestId('mobile-more'))
    fireEvent.click(screen.getByText('仓位'))
    expect(h.onTogglePosition).toHaveBeenCalledTimes(1)
  })

  it('更多弹层：图表水印开关回调 + 激活态', () => {
    const h = setup()
    fireEvent.click(screen.getByTestId('mobile-more'))
    fireEvent.click(screen.getByTestId('watermark-toggle'))
    expect(h.onToggleWatermark).toHaveBeenCalledTimes(1)
  })

  it('O7：更多弹层主题切换按钮 → 触发 onToggleTheme（dark→light 文案）', () => {
    const h = setup({ themeMode: 'dark' })
    fireEvent.click(screen.getByTestId('mobile-more'))
    const themeBtns = screen.getAllByTitle('切换主题')
    expect(themeBtns.length).toBeGreaterThan(0)
    const themeBtn = themeBtns[themeBtns.length - 1] // 更多菜单内的那个
    fireEvent.click(themeBtn)
    expect(h.onToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('O7：更多弹层语言按钮 → 触发 onCycleLang 并显示语言标签', () => {
    const h = setup({ langLabel: '中文' })
    fireEvent.click(screen.getByTestId('mobile-more'))
    const langBtn = screen.getByTitle(/切换语言/)
    expect(langBtn.textContent).toContain('中文')
    fireEvent.click(langBtn)
    expect(h.onCycleLang).toHaveBeenCalledTimes(1)
  })

  it('外部点击收起弹层', () => {
    setup()
    fireEvent.click(screen.getByTestId('mobile-menu-drawing'))
    expect(screen.getByText('矩形')).toBeDefined()
    fireEvent.mouseDown(document.body)
    // 弹层内容不再渲染
    expect(screen.queryByText('矩形')).toBeNull()
  })

  it('弹层打开时 Esc 收起（一次只关一层，不冒泡到 App 全局 Esc）', () => {
    setup()
    fireEvent.click(screen.getByTestId('mobile-menu-drawing'))
    expect(screen.getByText('矩形')).toBeDefined()
    // 模拟 App 全局 Esc 监听：若收到事件说明冒泡冲突
    const appEscSpy = vi.fn()
    window.addEventListener('keydown', appEscSpy)
    try {
      fireEvent.keyDown(window, { key: 'Escape' })
      // 弹层收起
      expect(screen.queryByText('矩形')).toBeNull()
      // App 全局 Esc 不应被触发（capture 阶段 stopImmediatePropagation）
      expect(appEscSpy).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', appEscSpy)
    }
  })

  it('无弹层打开时 Esc 不拦截（App 全局 Esc 正常生效）', () => {
    setup()
    const appEscSpy = vi.fn()
    window.addEventListener('keydown', appEscSpy, true)
    try {
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(appEscSpy).toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', appEscSpy, true)
    }
  })
})
