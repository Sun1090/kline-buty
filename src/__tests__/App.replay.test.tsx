// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, act, cleanup } from '@testing-library/react'

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
  })),
}))

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
    setPriceScaleMode() {}
    setTimezoneMode() {}
    setSnapEnabled() {}
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
  vi.useFakeTimers()
  mockUseKlineData.mockReturnValue({
    state: { candles: makeCandles(800), status: 'live', live: null },
    hasMore: true,
    loadMore: vi.fn(),
    retry: vi.fn(),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('回放集成', () => {
  it('点击回放 → 控制条出现（游标从倒数 300 根开始）', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('回放'))
    expect(screen.getByText('播放')).toBeDefined()
    expect(screen.getByText('501 / 800')).toBeDefined()
  })

  it('播放推进游标，到末尾自动暂停', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('回放'))
    fireEvent.click(screen.getByText('播放'))
    act(() => {
      vi.advanceTimersByTime(500 * 20) // 20 tick × 5 根/次
    })
    expect(screen.getByText('601 / 800')).toBeDefined()
    act(() => {
      vi.advanceTimersByTime(500 * 100)
    })
    expect(screen.getByText('800 / 800')).toBeDefined()
    expect(screen.getByText('播放')).toBeDefined() // 播完自动暂停
  })

  it('拖动进度条 seek', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('回放'))
    const range = screen.getByRole('slider') as HTMLInputElement
    fireEvent.change(range, { target: { value: '100' } })
    expect(screen.getByText('101 / 800')).toBeDefined()
  })

  it('退出回放 → 控制条消失', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('回放'))
    fireEvent.click(screen.getByText('退出回放'))
    expect(screen.queryByText('播放')).toBeNull()
  })

  it('数据不足时回放按钮禁用', () => {
    mockUseKlineData.mockReturnValue({
      state: { candles: makeCandles(10), status: 'live', live: null },
      hasMore: true,
      loadMore: vi.fn(),
      retry: vi.fn(),
    })
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    const btn = screen.getByText('回放') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
