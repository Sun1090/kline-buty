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

  it('L5 字号切换按钮在更多菜单：点击循环切换并持久化', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    const btn = screen.getByTestId('fontscale-toggle')
    const before = btn.textContent ?? ''
    expect(before).toMatch(/\d+%/)
    fireEvent.click(btn)
    const after = btn.textContent ?? ''
    expect(after).not.toBe(before) // 循环切换
    expect(localStorage.getItem('kline-buty:fontScale')).toBeTruthy() // 已持久化
  })

  it('L3 对比模式按钮在更多菜单：循环切换 compareSymbol 持久化', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    const btn = screen.getByTestId('compare-toggle')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    const saved = localStorage.getItem('kline-buty:compareSymbol')
    expect(saved).toBeTruthy()
  })

  it('快捷键帮助：? 打开帮助面板，再按关闭', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByTestId('shortcuts-help')).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('shortcuts-help')).toBeNull()
  })

  it('更多菜单打开仓位/提醒/参数浮动面板（覆盖 App 浮动面板渲染路径）', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('仓位'))
    expect(screen.getByText('暂无持仓')).toBeDefined() // PositionPanel 空态

    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('提醒'))
    expect(screen.getByTestId('alert-sound-toggle')).toBeDefined() // AlertPanel

    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('参数'))
    expect(screen.getByTestId('indicator-import')).toBeDefined() // IndicatorSettings
  })

  it('模拟交易：仓位面板开仓 → 持仓行出现 → 平仓回到空态', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('仓位'))
    const panel = screen.getByRole('region', { name: '模拟仓位' })
    const inputs = panel.querySelectorAll('input')
    // 开仓价 + 数量 → 开仓
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '开仓' }))
    const posRow = screen.getByTestId('position-row-long')
    expect(posRow).toBeDefined()
    expect(posRow.textContent).toMatch(/-?\d+(\.\d+)?/) // 浮动盈亏数值
    // 平仓（行内唯一按钮）
    const closeBtn = posRow.querySelector('button')
    expect(closeBtn).not.toBeNull()
    fireEvent.click(closeBtn!)
    expect(screen.queryByTestId('position-row-long')).toBeNull()
    expect(screen.getByText('暂无持仓')).toBeDefined()
  })

  it('价格提醒：创建提醒 → 列表出现 → 删除', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('提醒'))
    const priceInput = screen.getByPlaceholderText(/[\d.,]+/)
    fireEvent.change(priceInput, { target: { value: '99999' } })
    fireEvent.click(screen.getByRole('button', { name: '添加提醒' }))
    expect(screen.getByTestId('alert-row')).toBeDefined()
    // 删除
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.queryByTestId('alert-row')).toBeNull()
  })

  it('设置流：水印开关持久化 + 高对比 + 时区切换', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    // 水印：默认开 → 点击关闭 → localStorage 持久化 false
    const wm = screen.getByTestId('watermark-toggle')
    expect(wm.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(wm)
    expect(wm.getAttribute('aria-pressed')).toBe('false')
    expect(localStorage.getItem('kline-buty:watermark')).toBe('false')
    // 高对比：点击 → 持久化
    const hc = screen.getByTestId('high-contrast-toggle')
    expect(hc.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(hc)
    expect(hc.getAttribute('aria-pressed')).toBe('true')
    expect(localStorage.getItem('kline-buty:highContrast')).toBeTruthy()
    // 时区：默认 utc（未激活）→ 点击切 local
    const tz = screen.getByTestId('tz-toggle')
    expect(tz.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(tz)
    expect(tz.getAttribute('aria-pressed')).toBe('true')
  })

  it('布局循环：更多面板 layout-toggle 切换 1→2→4 格并持久化', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    const layout = screen.getByTestId('layout-toggle')
    const before = layout.getAttribute('aria-pressed')
    fireEvent.click(layout)
    expect(layout.getAttribute('aria-pressed')).not.toBe(before)
    expect(localStorage.getItem('kline-buty:layout')).toBeTruthy()
  })

  it('快捷键帮助 → 配置入口打开 ShortcutsSettings', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByTestId('shortcuts-help')).toBeDefined()
    fireEvent.click(screen.getByTestId('shortcuts-configure'))
    expect(screen.getByTestId('shortcuts-settings')).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'Escape' })
  })

  it('WS 面板打开渲染空态：盘口/深度/情绪（jsdom 无连接，覆盖面板渲染路径）', () => {
    render(<App />)
    // 注意：More 面板内「面板排序」区也显示 盘口/深度 等文案，须用 button role + exact 命中开关按钮
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '盘口' }))
    expect(screen.getByTestId('order-book')).toBeDefined()

    // 深度/情绪为 lazy 组件：断言 Suspense fallback（加载中…）即证明面板路径已进入；
    // lazy chunk 实际渲染由其组件级单测 + E2E 覆盖，避免全量并行负载下动态导入超时抖动
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '深度' }))
    expect(screen.getAllByText('加载中…').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '情绪' }))
    expect(screen.getAllByText('加载中…').length).toBeGreaterThan(0)
  })

  it('模拟交易→流水：开仓→平仓产生流水 → 清空按钮出现 → 点击清空', async () => {
    render(<App />)
    // 开仓（PositionPanel）
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('仓位'))
    const panel = screen.getByRole('region', { name: '模拟仓位' })
    const inputs = panel.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '开仓' }))
    // 平仓（行内唯一按钮）→ recordClose 写入流水
    const posRow = screen.getByTestId('position-row-long')
    fireEvent.click(posRow.querySelector('button')!)
    // 交易流水面板出现清空按钮（有历史）
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '交易流水' }))
    const clear = await screen.findByTestId('trade-history-clear')
    fireEvent.click(clear)
    expect(screen.queryByTestId('trade-history-clear')).toBeNull() // 清空后按钮消失
  })

  it('回放：更多菜单开始回放（ReplayBar 出现）→ 退出回到实时', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '回放' }))
    // ReplayBar 渲染（replay 状态非空）
    expect(screen.getByTestId('replay-seek')).toBeDefined()
    // 退出回放
    fireEvent.click(screen.getByRole('button', { name: '退出回放' }))
    expect(screen.queryByTestId('replay-seek')).toBeNull()
  })
})