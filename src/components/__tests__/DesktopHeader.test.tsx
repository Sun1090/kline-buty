// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { DesktopHeader } from '../DesktopHeader'
import type { Period } from '../../chart/types'
import type { ChartType, MainIndicatorKind, SubIndicatorKind } from '../ChartView'
import type { DrawingTool } from '../../drawings/logic'

afterEach(cleanup)

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
  render(<DesktopHeader {...props} />)
  return handlers
}

describe('DesktopHeader（桌面顶栏）', () => {
  it('画线弹层：点击展开 → 选择工具 → 回调', () => {
    const h = setup()
    fireEvent.click(screen.getByTestId('drawing-toggle'))
    expect(screen.getByTestId('desktop-drawing-panel')).toBeDefined()
    // 选趋势线（DrawingToolPicker 内有「趋势线」文案）
    fireEvent.click(screen.getByText('趋势线'))
    expect(h.onDrawingTool).toHaveBeenCalledWith('trend')
  })

  it('弹层打开时 Esc 收起（一次只关一层，不冒泡到 App 全局 Esc）', () => {
    setup()
    fireEvent.click(screen.getByTestId('drawing-toggle'))
    expect(screen.getByTestId('desktop-drawing-panel')).toBeDefined()
    // 模拟 App 全局 Esc 监听：若收到事件说明冒泡冲突
    const appEscSpy = vi.fn()
    window.addEventListener('keydown', appEscSpy)
    try {
      fireEvent.keyDown(window, { key: 'Escape' })
      // 弹层收起
      expect(screen.queryByTestId('desktop-drawing-panel')).toBeNull()
      // App 全局 Esc 不应被触发（capture 阶段 stopImmediatePropagation）
      expect(appEscSpy).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', appEscSpy)
    }
  })

  it('布局/坐标轴/主题切换按钮有 aria-label + aria-pressed', () => {
    setup({ layout: 'pair' as const, priceScaleMode: 'log' as const })
    fireEvent.click(screen.getByTestId('header-more'))
    const layout = screen.getByTestId('layout-toggle')
    expect(layout.getAttribute('aria-label')).toBeTruthy()
    expect(layout.getAttribute('aria-pressed')).toBe('true') // pair 非 single → 激活
    const scale = screen.getByTestId('scale-toggle')
    expect(scale.getAttribute('aria-label')).toBeTruthy()
    expect(scale.getAttribute('aria-pressed')).toBe('true') // log → 激活
  })

  it('I9 坐标角标开关：点击触发 onToggleCoordBadge + aria-pressed', () => {
    const h = setup()
    fireEvent.click(screen.getByTestId('drawing-toggle'))
    const btn = screen.getByTestId('drawing-coord-badge-toggle')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    expect(h.onToggleCoordBadge).toHaveBeenCalledTimes(1)
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

  it('escChainActive（App 更高层打开）时弹层不劫持 Esc，让路给全局链路', () => {
    setup({ escChainActive: true })
    fireEvent.click(screen.getByTestId('drawing-toggle'))
    expect(screen.getByTestId('desktop-drawing-panel')).toBeDefined()
    const appEscSpy = vi.fn()
    window.addEventListener('keydown', appEscSpy)
    try {
      fireEvent.keyDown(window, { key: 'Escape' })
      // 弹层保持打开：Esc 归 App 全局链路处理（快捷键浮层/画线进度等更高层）
      expect(screen.queryByTestId('desktop-drawing-panel')).not.toBeNull()
      expect(appEscSpy).toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', appEscSpy)
    }
  })

  it('I5 文字底色：编辑态显示底色选择器，点击触发 onTextBgChange', () => {
    const onTextBgChange = vi.fn()
    setup({ editingTextId: 'd1', onTextBgChange })
    const btn = screen.getByTestId('text-bg-blue')
    expect(btn).toBeDefined()
    fireEvent.click(btn)
    expect(onTextBgChange).toHaveBeenCalled()
  })
})
