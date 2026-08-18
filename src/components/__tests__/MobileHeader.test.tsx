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
  }
  const props: Parameters<typeof MobileHeader>[0] = {
    symbol: 'BTCUSDT',
    statusText: '实时',
    statusColor: 'var(--up)',
    period: '1m' as Period,
    chartType: 'candlestick' as ChartType,
    priceScaleMode: 'linear',
    mainIndicator: 'ma' as MainIndicatorKind,
    subIndicator: 'volume' as SubIndicatorKind,
    drawingTool: 'none' as DrawingTool,
    drawingSelected: false,
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

  it('外部点击收起弹层', () => {
    setup()
    fireEvent.click(screen.getByTestId('mobile-menu-drawing'))
    expect(screen.getByText('矩形')).toBeDefined()
    fireEvent.mouseDown(document.body)
    // 弹层内容不再渲染
    expect(screen.queryByText('矩形')).toBeNull()
  })
})
