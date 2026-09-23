// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup, waitFor, act } from '@testing-library/react'
import { WARN_THRESHOLD_KB } from '../utils/storageMonitor'

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
    setSessionHighLow() {}
      setTradeMarkers() {}
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
      visibleRange() {
        return null
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

  it('N11 容量横幅：占用越过警告阈值才出现，文案带用量，✕ 只收横幅', () => {
    render(<App />)
    // 阈值以下（App 自己的持久化写入只有几 KB）不该打扰用户
    expect(screen.queryByTestId('storage-banner')).toBeNull()
    cleanup()

    localStorage.setItem('bulk', 'x'.repeat(WARN_THRESHOLD_KB * 1024 + 1))
    render(<App />)
    const banner = screen.getByTestId('storage-banner')
    expect(banner.getAttribute('role')).toBe('status')
    expect(banner.textContent).toMatch(/\d+(\.\d+)?\s?(KB|MB)/)
    fireEvent.click(screen.getByTestId('storage-dismiss'))
    expect(screen.queryByTestId('storage-banner')).toBeNull()
  })

  it('F14 侧栏拖拽调宽：手柄 pointer 跟踪改宽度并持久化，两端夹在 240~720', () => {
    render(<App />)
    // 手柄只在侧栏（有面板打开）时存在
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '深度' }))
    const handle = screen.getByTestId('side-panel-resize')
    expect(handle.getAttribute('role')).toBe('separator')

    const width = () => Number(localStorage.getItem('kline-buty:sidePanelWidth'))
    // 起点 380：手柄左移 40px → 侧栏宽 420
    fireEvent.pointerDown(handle, { clientX: 500 })
    fireEvent.pointerMove(window, { clientX: 460 })
    fireEvent.pointerUp(window)
    expect(width()).toBe(420)
    // 再右移 1000px：不能拖成负宽，夹在下限 240
    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 1100 })
    fireEvent.pointerUp(window)
    expect(width()).toBe(240)
    // 左移过头：夹在上限 720
    fireEvent.pointerDown(handle, { clientX: 900 })
    fireEvent.pointerMove(window, { clientX: -900 })
    fireEvent.pointerUp(window)
    expect(width()).toBe(720)
    // 拖完松开后，窗口的后续移动不再改宽度（监听器必须被摘掉）
    fireEvent.pointerMove(window, { clientX: 0 })
    expect(width()).toBe(720)
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
    // 平仓（行内按钮，用 testid 而不依赖顺序：全平/减仓/反手/价位 四个按钮同排）
    const closeBtn = screen.getByTestId('position-close-long')
    fireEvent.click(closeBtn)
    expect(screen.queryByTestId('position-row-long')).toBeNull()
    expect(screen.getByText('暂无持仓')).toBeDefined()
  })

  it('部分平仓：减仓 50% → 剩余仓位保留、流水记一条净额 close', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('仓位'))
    const panel = screen.getByRole('region', { name: '模拟仓位' })
    const inputs = panel.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '开仓' }))

    fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
    // 默认预填一半
    expect((screen.getByTestId('position-reduce-qty-long') as HTMLInputElement).value).toBe('1')
    // 超量直接报错、不回调
    fireEvent.change(screen.getByTestId('position-reduce-qty-long'), { target: { value: '5' } })
    fireEvent.click(screen.getByTestId('position-reduce-confirm-long'))
    expect(screen.getByTestId('position-reduce-error')).toBeTruthy()
    expect(screen.getByTestId('position-row-long')).toBeTruthy()

    fireEvent.change(screen.getByTestId('position-reduce-qty-long'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('position-reduce-confirm-long'))
    expect(screen.queryByTestId('position-reduce-editor-long')).toBeNull()
    // 剩余仓位仍在，数量减半
    const stored = JSON.parse(localStorage.getItem('kline-buty:positionsBySymbol') ?? '{}') as {
      BTCUSDT: { long: { quantity: number; entry: number } }
    }
    expect(stored.BTCUSDT.long.quantity).toBe(1)
    expect(stored.BTCUSDT.long.entry).toBe(100)
    // 流水：一条 close，qty 为减仓量（开仓那条是 open）
    const trades = JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]') as {
      kind: string
      qty: number
      side: string
    }[]
    const closes = trades.filter((r) => r.kind === 'close')
    expect(closes).toHaveLength(1)
    expect(closes[0]).toMatchObject({ qty: 1, side: 'buy' })
  })

  it('减仓比例芯片：编辑器内点 25% 直接按量减掉并收起', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('仓位'))
    const panel = screen.getByRole('region', { name: '模拟仓位' })
    const inputs = panel.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: '开仓' }))

    // 芯片在编辑器内：先展开（防误触：减仓是直接下单动作，不是一键即发）
    fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
    fireEvent.click(screen.getByTestId('position-reduce-ratio-long-25'))
    const stored = JSON.parse(localStorage.getItem('kline-buty:positionsBySymbol') ?? '{}') as {
      BTCUSDT: { long: { quantity: number } }
    }
    expect(stored.BTCUSDT.long.quantity).toBe(3)
    expect(screen.queryByTestId('position-reduce-editor-long')).toBeNull()
  })

  it('减到全量等价于全平：清空槽位且只记一条 close', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('仓位'))
    const panel = screen.getByRole('region', { name: '模拟仓位' })
    const inputs = panel.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '100' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '开仓' }))

    fireEvent.click(screen.getByTestId('position-reduce-toggle-long'))
    fireEvent.change(screen.getByTestId('position-reduce-qty-long'), { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('position-reduce-confirm-long'))
    expect(screen.queryByTestId('position-row-long')).toBeNull()
    const trades = JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]') as { kind: string; qty: number }[]
    const closes = trades.filter((r) => r.kind === 'close')
    expect(closes).toHaveLength(1)
    expect(closes[0].qty).toBe(2)
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

  it('图表右键挂限价单：事件 → 快捷下单预填挂单价 → 确认写入挂单存储', async () => {
    render(<App />)
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('chart-request-limit-order', { detail: { symbol: 'BTCUSDT', price: 60000, side: 'sell' } }),
      )
    })
    await waitFor(() => expect(screen.getByTestId('quick-order')).toBeTruthy())
    // 右键入口直接进入限价模式，价格即点击价位
    expect((screen.getByTestId('qo-type-limit') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true')
    expect((screen.getByTestId('qo-price') as HTMLInputElement).value).toBe('60000')
    fireEvent.change(screen.getByTestId('qo-qty'), { target: { value: '0.001' } })
    fireEvent.click(screen.getByTestId('qo-confirm'))
    expect(screen.queryByTestId('quick-order')).toBeNull()
    // 现价（mock 蜡烛 ≈ 100）远低于卖单挂价 → 不触价，挂单原样入队
    const orders = JSON.parse(localStorage.getItem('kline-buty:paperOrders') ?? '[]') as {
      symbol: string
      side: string
      price: number
      qty: number
    }[]
    expect(orders).toHaveLength(1)
    expect(orders[0]).toMatchObject({ symbol: 'BTCUSDT', side: 'sell', price: 60000, qty: 0.001 })
    expect((JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]') as unknown[]).length).toBe(0)
  })

  it('图表右键挂单事件：缺价格或方向非法时不打开下单面板', async () => {
    render(<App />)
    await act(async () => {
      window.dispatchEvent(new CustomEvent('chart-request-limit-order', { detail: { symbol: 'BTCUSDT', side: 'sell' } }))
      window.dispatchEvent(
        new CustomEvent('chart-request-limit-order', { detail: { symbol: 'BTCUSDT', price: 100, side: 'long' } }),
      )
    })
    expect(screen.queryByTestId('quick-order')).toBeNull()
  })

  it('持仓止盈止损编辑：面板改价 → 写回 positionsBySymbol', () => {
    localStorage.setItem(
      'kline-buty:positionsBySymbol',
      JSON.stringify({ BTCUSDT: { long: { entry: 100, quantity: 1, direction: 'long', takeProfit: 103, stopLoss: 98 }, short: null } }),
    )
    render(<App />)
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByText('仓位'))
    fireEvent.click(screen.getByTestId('position-edit-levels-long'))
    fireEvent.change(screen.getByTestId('position-level-tp-long'), { target: { value: '150' } })
    fireEvent.click(screen.getByTestId('position-level-save-long'))
    const saved = JSON.parse(localStorage.getItem('kline-buty:positionsBySymbol') ?? '{}') as {
      BTCUSDT: { long: { takeProfit: number; stopLoss: number; entry: number } }
    }
    expect(saved.BTCUSDT.long).toMatchObject({ entry: 100, takeProfit: 150, stopLoss: 98 })
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

  it('WS 面板打开渲染空态：盘口/深度/情绪（jsdom 无连接，覆盖面板渲染路径）', async () => {
    render(<App />)
    // 注意：More 面板内「面板排序」区也显示 盘口/深度 等文案，须用 button role + exact 命中开关按钮
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '盘口' }))
    expect(screen.getByTestId('order-book')).toBeDefined()

    // lazy 面板不能断 Suspense 的「加载中…」：同一 worker 里只要别的用例先打开过这个面板，
    // chunk 已经热了，挂载直接出真组件、根本不经过 fallback（用例顺序一改就红）。
    // 改成等它落定后断言面板自己独有的钩子/文案。
    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '深度' }))
    // jsdom 量不到容器宽度 → DepthChart 停在「等数据」分支
    expect(await screen.findByText('加载盘口深度…')).toBeDefined()

    fireEvent.click(screen.getByTestId('header-more'))
    fireEvent.click(screen.getByRole('button', { name: '情绪' }))
    expect(await screen.findByTestId('sentiment-panel')).toBeDefined()
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