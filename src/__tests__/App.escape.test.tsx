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
  })),
}))

vi.mock('../chart/adapter', () => ({
  LightweightChartAdapter: class {
    setCandles() {}
    updateCandle() {}
    setChartType() {}
    setMainIndicator() {}
    setSubIndicator() {}
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
}))

import { App } from '../App'
import { useKlineData } from '../hooks/useKlineData'

const mockUseKlineData = vi.mocked(useKlineData)

afterEach(cleanup)

beforeEach(() => {
  localStorage.clear()
  mockUseKlineData.mockReturnValue({
    state: { candles: makeCandles(800), status: 'live', live: null },
    hasMore: true,
    loadMore: vi.fn(),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

/** 打开桌面「更多」面板并点击其中某个按钮 */
function openMoreAndClick(label: string) {
  fireEvent.click(screen.getByTestId('header-more'))
  fireEvent.click(screen.getByText(label))
}

describe('App 全局 Esc 链路（模态/侧栏面板）', () => {
  it('指标设置面板：Esc 关闭', () => {
    render(<App />)
    // 设置面板从更多菜单进入（或直接触发 settingsActive）
    openMoreAndClick('参数')
    expect(screen.getByText('指标参数')).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('指标参数')).toBeNull()
  })

  it('价格提醒面板：Esc 关闭', () => {
    render(<App />)
    openMoreAndClick('提醒')
    // 提醒面板渲染：标题「价格提醒 · BTCUSDT」
    expect(screen.getByText(/价格提醒 ·/)).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    // 提醒面板卸载
    expect(screen.queryByText(/价格提醒 ·/)).toBeNull()
  })

  it('仓位面板：Esc 关闭', () => {
    render(<App />)
    openMoreAndClick('仓位')
    expect(screen.getByText('模拟仓位')).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('模拟仓位')).toBeNull()
  })
})
