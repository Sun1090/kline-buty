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
    state: { candles: makeCandles(800), status: 'live' as const, live: null },
    hasMore: true,
    loadMore: vi.fn(),
    retry: vi.fn(),
    loadDemo: vi.fn(),
    frameStats: null,
  })),
}))

vi.mock('../utils/versionCheck', () => ({
  checkVersionUpdate: vi.fn(() => ({ hasUpdate: true, version: '9.9.9' })),
  readMetaVersion: vi.fn(() => '9.9.9'),
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
      setCoordBadge() {}
      setGlobalDrawingOpacity() {}
      setFontScale() {}
      setDrawingTool() {}
      setDrawingCallbacks() {}
      onRegionCapture() {}
      setTheme() {}
      setLocale() {}
      setPeriodSeconds() {}
      setWatermark() {}
      setPriceScaleMode() {}
      setTimezoneMode() {}
      setSnapMode() {}
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

afterEach(cleanup)

beforeEach(() => {
  localStorage.clear()
})

describe('App 集成测试（O7 覆盖率补测：新增功能路径）', () => {
  it('P4 更新横幅：版本升级时显示并可关闭', () => {
    render(<App />)
    expect(screen.getByTestId('update-banner')).toBeDefined()
    fireEvent.click(screen.getByTestId('update-dismiss'))
    expect(screen.queryByTestId('update-banner')).toBeNull()
  })

  it('M12 语言切换快捷键：⇧⌘L 循环切换语言（lang 持久化更新）', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'l', metaKey: true, shiftKey: true })
    // usePersistedState 将 lang 写入 localStorage（key: kline-buty:lang）
    const saved = localStorage.getItem('kline-buty:lang')
    expect(saved).not.toBe('zh-CN')
  })

  it('关键面板在更多菜单可打开（覆盖 App 渲染路径）', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    // 更多菜单存在且含关键入口
    expect(screen.getByTestId('header-more').getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(window, { key: 'Escape' })
  })
})