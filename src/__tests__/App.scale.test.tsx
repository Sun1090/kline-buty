// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'

function makeCandles(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    time: 1786797540 + i * 60,
    open: 100,
    high: 101,
    low: 99,
    close: 100 + Math.sin(i / 10),
    volume: 10,
    isClosed: true,
  }))
}

vi.mock('../hooks/useKlineData', () => ({
  useKlineData: vi.fn(() => ({
    state: { candles: [], status: 'live' as const },
    hasMore: true,
    loadMore: vi.fn(),
    retry: vi.fn(),
    loadDemo: vi.fn(),
  })),
}))

const scaleModes: string[] = []
vi.mock('../chart/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../chart/adapter')>()
  return {
    ...actual,
    LightweightChartAdapter: class {
    setCandles() {}
    updateCandle() {}
    setChartType() {}
    setMainIndicator() {}
    setSubIndicator() {}
    setSubScaleRange() {}
    setPositionLines() {}
    setReferencePrice() {}
    setMarkerPrice() {}
    setPositionDragHandler() {}
    setDrawings() {}
    setDrawingTool() {}
    setDrawingCallbacks() {}
    onRegionCapture() {}
    setTheme() {}
    setLocale() {}
    setPeriodSeconds() {}
    setWatermark() {}
    setTimezoneMode() {}
    setSnapEnabled() {}
    setPriceScaleMode(mode: string) {
      scaleModes.push(mode)
    }
    fitContent() {}
    scrollToRealTime() {}
    subscribeCrosshairMove() {
      return () => {}
    }
    subscribeVisibleRange() {
      return () => {}
    }
    destroy() {}
  },
  }
})

import { App } from '../App'
import { useKlineData } from '../hooks/useKlineData'

const mockUseKlineData = vi.mocked(useKlineData)

afterEach(cleanup)

beforeEach(() => {
  localStorage.clear()
  scaleModes.length = 0
  vi.useFakeTimers()
  mockUseKlineData.mockReturnValue({
    state: { candles: makeCandles(800), status: 'live', live: null },
    hasMore: true,
    loadMore: vi.fn(),
    retry: vi.fn(),
    loadDemo: vi.fn(),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('价格坐标轴（线性/对数）', () => {
  it('桌面：默认线性 → 点击切对数 → adapter 生效 + 文案切换 + 持久化', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    const btn = screen.getByTestId('scale-toggle')
    expect(btn.textContent).toBe('线性')
    fireEvent.click(btn)
    expect(btn.textContent).toBe('对数')
    expect(scaleModes).toContain('log')
    expect(localStorage.getItem('kline-buty:priceScale')).toBe('"log"')
  })

  it('桌面：刷新后保持对数（localStorage 持久化）', () => {
    localStorage.setItem('kline-buty:priceScale', '"log"')
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    const btn = screen.getByTestId('scale-toggle')
    expect(btn.textContent).toBe('对数')
    // 挂载即应用对数模式
    expect(scaleModes).toContain('log')
  })

  it('移动端：更多面板可切坐标轴（线性 → 对数）', () => {
    // 模拟 390px 视口 → MobileHeader 分支
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true })
    render(<App />)
    fireEvent.click(screen.getByTestId('mobile-more'))
    const toggle = screen.getByText('线性')
    expect(toggle).toBeDefined()
    fireEvent.click(toggle)
    expect(localStorage.getItem('kline-buty:priceScale')).toBe('"log"')
    // 面板再次打开显示「对数」
    fireEvent.click(screen.getByTestId('mobile-more'))
    expect(screen.getByText('对数')).toBeDefined()
  })
})
