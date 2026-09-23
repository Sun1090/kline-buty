// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react'
import type { Candle } from '../../chart/types'
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'

function makeCandles(n: number): Candle[] {
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

// 装载后图表是否还「补发一次当前可见区间」由这里控制：mock 的 subscribeVisibleRange 从不触发回调，
// 正好复现「整窗 setData 之后不再有变化事件」的真实形态（lightweight-charts 只在区间真的变了才发）
const harness = vi.hoisted(() => ({
  range: null as { from: number; to: number } | null,
  /** 图表侧的可见区间变化入口（ChartView 挂载时注册进来，测试用它模拟一次拖动落地） */
  fire: null as ((from: number, to: number, trusted?: boolean) => void) | null,
  /** 本图被要求写入的可视区间（ setVisibleRange 的调用记录 ） */
  views: [] as { from: number; to: number }[],
  /** 本图被要求落的十字光标时刻（setCrosshairTime 的调用记录） */
  cross: [] as (number | null)[],
  /** 十字光标回调（真 adapter 由图表驱动，测试用它模拟一次指针上报） */
  crossCb: null as ((time: number | null, x: number | null, y: number | null, fromExternalWrite?: boolean) => void) | null,
  /** 整窗装载（setCandles）与逐根增量（updateCandle）的调用记录 */
  sets: [] as { len: number; first: number | null }[],
  updates: [] as number[],
  /**
   * 置为 true 时，`setVisibleRange` 像真图表那样**同步补发**一次可见区间事件。
   * 不开这个开关，「程序化落位不该广播」永远测不到 —— mock 默认不补发，
   * 于是断言在改动前后都成立（假绿）。
   */
  echo: false,
}))

vi.mock('../../chart/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../chart/adapter')>()
  return {
    ...actual,
    LightweightChartAdapter: class {
      setCandles = vi.fn((d: Candle[]) => {
        harness.sets.push({ len: d.length, first: d[0]?.time ?? null })
      })
      updateCandle = vi.fn((c: Candle) => {
        harness.updates.push(c.time)
      })
      setChartType = vi.fn()
      setMainIndicator = vi.fn()
      setSubIndicator = vi.fn()
      setSubScaleRange = vi.fn()
      setPositionLines = vi.fn()
      setReferencePrice = vi.fn()
      setMarkerPrice = vi.fn()
      setSessionHighLow = vi.fn()
      setTradeMarkers = vi.fn()
      setPositionDragHandler = vi.fn()
      setDrawings = vi.fn()
      setCoordBadge = vi.fn()
      setGlobalDrawingOpacity = vi.fn()
      setFontScale = vi.fn()
      setDrawingTool = vi.fn()
      setDrawingCallbacks = vi.fn()
      setSelectedDrawing = vi.fn()
      setNotesHidden = vi.fn()
      setSnapMode = vi.fn()
      setTheme = vi.fn()
      setLocale = vi.fn()
      setWatermark = vi.fn()
      setPeriodSeconds = vi.fn()
      setPriceScaleMode = vi.fn()
      setTimezoneMode = vi.fn()
      fitContent = vi.fn()
      scrollToRealTime = vi.fn()
      nudgeCrosshair = vi.fn()
      keyboardPlaceAnchor = vi.fn()
      keyboardPlaceAnchorAtCrosshair = vi.fn()
      takeScreenshot = vi.fn(() => null)
      priceAt = vi.fn(() => ({ time: 1786797540, price: 50766.61229625584 }))
      startRegionSelect = vi.fn()
      cancelRegionSelect = vi.fn()
      onRegionCapture = vi.fn()
      subscribeCrosshairMove(cb: (time: number | null, x: number | null, y: number | null, fromExternalWrite?: boolean) => void) {
        harness.crossCb = cb
        return () => {}
      }
      setCrosshairTime = vi.fn((t: number | null) => {
        harness.cross.push(t)
      })
      clearCrosshair = vi.fn()
      setVisibleRange = vi.fn((r: { from: number; to: number }) => {
        harness.views.push(r)
        if (harness.echo) harness.fire?.(r.from, r.to, true)
      })
      subscribeVisibleRange(cb: (from: number, to: number, trusted?: boolean) => void) {
        harness.fire = cb
        return () => {}
      }
      visibleRange() {
        return harness.range
      }
      destroy() {}
    },
  }
})

import { ChartView } from '../ChartView'

afterEach(cleanup)

const oneMinBase = makeCandles(1)

const base = {
  symbol: 'BTCUSDT',
  period: '1h' as const,
  chartType: 'candlestick' as const,
  mainIndicator: 'ma' as const,
  subIndicator: 'volume' as const,
  indicatorParams: DEFAULT_INDICATOR_PARAMS,
  replay: null,
  hasMore: false,
  onLoadMore: vi.fn(),
  status: 'live' as const,
}

describe('ChartView 渲染路径（O7）', () => {
  it('loading 态：显示骨架屏与加载文案', () => {
    render(<ChartView {...base} candles={[]} status="loading" />)
    expect(screen.getByText('加载历史数据…')).toBeDefined()
  })

  it('error 态：显示错误 + 重试按钮', () => {
    render(<ChartView {...base} candles={[]} status="error" onRetry={vi.fn()} />)
    expect(screen.getByText(/行情数据加载失败/)).toBeDefined()
    expect(screen.getByTestId('chart-retry')).toBeDefined()
    fireEvent.click(screen.getByTestId('chart-retry'))
  })

  it('error 态：演示数据降级按钮（N15）', () => {
    const onLoadDemo = vi.fn()
    render(<ChartView {...base} candles={[]} status="error" onLoadDemo={onLoadDemo} />)
    fireEvent.click(screen.getByTestId('chart-load-demo'))
    expect(onLoadDemo).toHaveBeenCalledTimes(1)
  })

  it('正常渲染：数据装载不抛错，截图/分辨率按钮存在（N5）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} />)
    expect(screen.getByTestId('screenshot-scale-toggle')).toBeDefined()
    expect(screen.getByText(/\d+x$/)).toBeDefined()
  })

  it('整窗装载后不再有可见区间变化事件时，A11 可视范围仍必须出现', () => {
    // 回归：装载期间作废的那次通知，此后 lightweight-charts 不会再补发（区间没「变」）。
    // 数据量低于裁剪阈值（200 根，即日常量级）时之后再没有别的事件，A11 条就永远不渲染
    harness.range = { from: 0, to: 199 }
    try {
      render(<ChartView {...base} candles={makeCandles(200)} />)
      const strip = screen.getByTestId('chart-visible-range')
      expect(strip.textContent).toContain('—')
    } finally {
      harness.range = null
    }
  })

  it('丢帧率 >10% 时显示角标（N14）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} frameStats={{ rate: 0.4, dropped: 4, total: 10 }} />)
    expect(screen.getByTestId('frame-drop-badge')).toBeDefined()
    expect(screen.getByText(/40%/)).toBeDefined()
  })

  it('丢帧率低时不显示角标（N14）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} frameStats={{ rate: 0.02, dropped: 1, total: 50 }} />)
    expect(screen.queryByTestId('frame-drop-badge')).toBeNull()
  })

  it('回放态进入：不抛出（replay 数据切片路径）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} replay={{ cursor: 50 }} />)
    expect(screen.queryByTestId('chart-retry')).toBeNull()
  })

  it('VOL 副图的均量线走成交量缩写：图例不出现 11 位原始数字', () => {
    const heavy = Array.from({ length: 60 }, (_, i) => ({
      time: 1786797540 + i * 60,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 12_750_000_000,
      isClosed: true,
    }))
    render(<ChartView {...base} candles={heavy} />)
    const badge = screen.getByTestId('chart-indicator-last')
    expect(badge.textContent).toContain('VOL-MA: 12750.00M')
    expect(badge.textContent).not.toContain('12750000000')
  })

  it('O7：RSI 副图时显示指标末尾值一览 + 副图 Y 轴固定切换按钮（H12）', () => {
    render(<ChartView {...base} candles={makeCandles(200)} subIndicator="rsi" />)
    // 指标末尾值一览（chart-indicator-last）在数据存在时显示
    const badge = screen.queryByTestId('chart-indicator-last')
    if (badge) {
      expect(badge).toBeDefined()
    }
    // RSI 为有界指标 → sub-scale-toggle 出现
    const toggle = screen.queryByTestId('sub-scale-toggle')
    if (toggle) {
      expect(toggle.getAttribute('aria-pressed')).toBe('false')
    }
  })
})

// 右键菜单的三个出口（复制 / 提醒 / 挂单）共用同一份 ctxMenu.price：
// 光标价是像素反算的浮点值，收口不到位就会把 50766.61229625584 送进下单面板
describe('ChartView 右键菜单价位口径', () => {
  function openMenu() {
    const { container } = render(<ChartView {...base} candles={makeCandles(200)} />)
    fireEvent.contextMenu(container.firstElementChild as HTMLElement, { clientX: 120, clientY: 200 })
  }

  it('「买入限价」交出的挂单价已收口到展示精度', () => {
    openMenu()
    const seen: { price: number }[] = []
    const listener = (e: Event) => seen.push((e as CustomEvent<{ price: number }>).detail)
    window.addEventListener('chart-request-limit-order', listener)
    fireEvent.click(screen.getByTestId('ctx-limit-buy'))
    window.removeEventListener('chart-request-limit-order', listener)
    // 未收口时这里会是 50766.61229625584
    expect(seen).toHaveLength(1)
    expect(seen[0].price).toBe(50766.61)
  })

  it('「添加提醒」交出的触发价同样收口', () => {
    openMenu()
    const seen: { price: number }[] = []
    const listener = (e: Event) => seen.push((e as CustomEvent<{ price: number }>).detail)
    window.addEventListener('chart-request-alert', listener)
    fireEvent.click(screen.getByTestId('ctx-add-alert'))
    window.removeEventListener('chart-request-alert', listener)
    expect(seen).toHaveLength(1)
    expect(seen[0].price).toBe(50766.61)
  })

  it('「复制价格」写入剪贴板的是收口后的字符串', () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    openMenu()
    fireEvent.click(screen.getByTestId('ctx-copy-price'))
    expect(writeText).toHaveBeenCalledWith('50766.61')
  })
})

describe('多图视角同步的单位（issue #186）', () => {
  afterEach(() => {
    harness.views.length = 0
    harness.fire = null
  })

  it('本格视角落地时上报的是秒，不是逻辑索引', () => {
    const candles = makeCandles(800)
    const onViewRangeChange = vi.fn()
    render(<ChartView {...base} period="1m" candles={candles} onViewRangeChange={onViewRangeChange} />)
    expect(harness.fire, 'ChartView 应订阅可见区间变化').not.toBeNull()
    // 视角得先由用户接管（issue #199：程序化落位不广播），否则这条就是在测「不广播」
    fireEvent.pointerDown(screen.getByTestId('chart-root'))
    act(() => harness.fire!(10, 50, true))
    expect(onViewRangeChange).toHaveBeenCalledWith({ from: candles[10].time, to: candles[50].time })
  })

  it('外部指令给的是秒：按本格自己的周期换算成索引再落位', () => {
    const oneMin = makeCandles(800)
    const range = { from: oneMin[10].time, to: oneMin[50].time }
    // 本格是 5m 数据：这一小时只能落在索引 2..10。旧实现把秒当索引硬套，视角直接飞出数据之外
    const fiveMin = Array.from({ length: 150 }, (_, i) => ({ ...oneMin[i * 5] }))
    const { rerender } = render(<ChartView {...base} period="5m" candles={fiveMin} />)
    rerender(<ChartView {...base} period="5m" candles={fiveMin} externalRange={range} />)
    expect(harness.views).toContainEqual({ from: 2, to: 10 })
  })

  it('窗口比本格周期还窄时撑开到至少两根，不落退化视角', () => {
    const oneMin = makeCandles(800)
    // 本格是 1h：50 分钟的窗口两端都吸附到同一根（索引 0），按索引硬算会落 {0,0}
    const oneHour = Array.from({ length: 13 }, (_, i) => ({ ...oneMin[i * 60] }))
    const { rerender } = render(<ChartView {...base} period="1h" candles={oneHour} />)
    rerender(<ChartView {...base} period="1h" candles={oneHour} externalRange={{ from: oneMin[0].time, to: oneMin[0].time + 50 * 60 }} />)
    expect(harness.views).toContainEqual({ from: 0, to: 1 })
  })

  it('程序化落位（执行兄弟格指令）不再广播回去', () => {
    const oneMin = makeCandles(800)
    const onViewRangeChange = vi.fn()
    harness.echo = true
    try {
      const { rerender } = render(<ChartView {...base} period="1m" candles={oneMin} onViewRangeChange={onViewRangeChange} />)
      // 用户在自己这一格里平移：这一次必须广播
      fireEvent.pointerDown(screen.getByTestId('chart-root'))
      act(() => harness.fire!(200, 240, true))
      expect(onViewRangeChange).toHaveBeenCalledTimes(1)
      // 兄弟格的指令落地：mock 按真图表的形态同步补发了落位事件，这一次不能再传出去
      // （各格网格不同，吸附值和请求差几根，传回去就是一条越收越窄的乒乓链）
      onViewRangeChange.mockClear()
      rerender(
        <ChartView
          {...base}
          period="1m"
          candles={oneMin}
          externalRange={{ from: oneMin[100].time, to: oneMin[160].time }}
          onViewRangeChange={onViewRangeChange}
        />,
      )
      expect(harness.views[harness.views.length - 1]).toEqual({ from: 100, to: 160 })
      expect(onViewRangeChange).not.toHaveBeenCalled()
    } finally {
      harness.echo = false
      harness.views.length = 0
    }
  })
})

describe('换周期落的视角必须还是同一段时间（issue #199）', () => {
  afterEach(() => {
    harness.echo = false
    harness.views.length = 0
    harness.fire = null
  })

  it('数据晚一拍时，两拍都按这片数据自己的间距锚定', () => {
    const oneMin = makeCandles(300)
    const fiveMin = Array.from({ length: 60 }, (_, i) => ({ ...oneMin[0], time: oneMin[299].time - (59 - i) * 300 }))
    const report = vi.fn()
    harness.echo = true
    const { rerender } = render(<ChartView {...base} period="1m" candles={oneMin} onViewRangeChange={report} />)
    // 用户把视角定在 [240,270]：30 分钟，右缘 = oneMin[270]
    fireEvent.pointerDown(screen.getByTestId('chart-root'))
    act(() => harness.fire!(240, 270, true))
    expect(report).toHaveBeenCalledTimes(1)
    report.mockClear()
    harness.views.length = 0

    // 第一拍：period 已经是 5m，可传进来的还是 1m 那一片。
    // 根数必须按这片数据的 60 秒间距算（30 分钟 = 30 根）；按 PERIOD_MS['5m'] 算只有 6 根，
    // 视角当场被压成 1/5（这就是四格里那一格「换了周期图没怎么变、别人却被甩走」的起点）。
    rerender(<ChartView {...base} period="5m" candles={oneMin} onViewRangeChange={report} />)
    expect(harness.views[harness.views.length - 1]).toEqual({ from: 241, to: 270 })
    // 换周期是本格的内部重排，不是用户对本格的改动：一次都不该广播
    expect(report).not.toHaveBeenCalled()

    // 第二拍：5m 的数据到位，整窗装载后图表按**逻辑索引**保视图 —— 不重落就把同一个索引区间
    // 解释成 5m 的 30 根 = 2.5 小时。右缘时间和时间跨度都要留住，才叫「还是那一段时间」。
    harness.views.length = 0
    rerender(<ChartView {...base} period="5m" candles={fiveMin} onViewRangeChange={report} />)
    expect(harness.views[harness.views.length - 1]).toEqual({ from: 48, to: 53 })
    expect(report).not.toHaveBeenCalled()
  })

  it('停在最新处从粗换到细：右缘要贴住新序列的尾沿，不许凭空算成回看', () => {
    // A2 的契约：停在最新一根上换周期，换完仍算「在最新」（「回到最新」按钮必须保持隐藏）。
    // 只按「旧那根的开盘时刻」在新序列里 floor 会落到尾沿之前：1h 的最后一根是 19:00，
    // 而 5m 的最后一根已经走到 19:55 —— 差出 11 根，atLatest 判成回看，按钮凭空出现。
    const T0 = 1786797540
    const bar = { open: 100, high: 101, low: 99, close: 100, volume: 10, isClosed: true }
    const coarse = Array.from({ length: 60 }, (_, i) => ({ ...bar, time: T0 + i * 3600 }))
    const fine = Array.from({ length: 720 }, (_, i) => ({ ...bar, time: T0 + i * 300 }))
    const report = vi.fn()
    harness.echo = true
    const { rerender } = render(<ChartView {...base} period="1h" candles={coarse} onViewRangeChange={report} />)
    fireEvent.pointerDown(screen.getByTestId('chart-root'))
    // 视角右缘就贴在最后一根上（50..59，9 根 1h）
    act(() => harness.fire!(50, 59, true))
    expect(report).toHaveBeenCalledTimes(1) // 这一次是指针驱动的平移，该广播
    report.mockClear()
    harness.views.length = 0
    rerender(<ChartView {...base} period="5m" candles={coarse} onViewRangeChange={report} />)
    expect(harness.views[harness.views.length - 1]).toEqual({ from: 51, to: 59 })
    harness.views.length = 0
    rerender(<ChartView {...base} period="5m" candles={fine} onViewRangeChange={report} />)
    const v = harness.views[harness.views.length - 1]
    expect(v.to, '换到更细的周期后右缘必须仍贴在新序列的最后一根上').toBe(fine.length - 1)
    // 跨度按时间算：9 根 1h = 108 根 5m
    expect(v.from).toBe(fine.length - 108)
    expect(report).not.toHaveBeenCalled()
    harness.echo = false
  })
})
describe('多图十字光标落点与本格数据的一致性（issue #193）', () => {
  afterEach(() => {
    harness.cross.length = 0
    harness.crossCb = null
  })

  const oneMin = makeCandles(200)
  const fiveMin = Array.from({ length: 40 }, (_, i) => ({ ...oneMin[i * 5] }))
  const T = oneMin[10].time

  /** 先空挂一次再给外部指令：adapter 是在挂载 effect 里创建的，同一批 effect 里它排在后面 */
  const mountWithExternal = (rerender: (ui: React.ReactElement) => void) => {
    rerender(<ChartView {...base} period="1m" candles={oneMin} externalCrosshairTime={T} />)
    expect(harness.cross).toEqual([T])
  }

  it('外部指令落过笔之后整窗换了数据，必须按新数据再落一次', () => {
    const { rerender } = render(<ChartView {...base} period="1m" candles={oneMin} />)
    mountWithExternal(rerender)
    // 换周期：外部时刻**没变**（广播侧两处都按值去重，源格再报也不会重发），
    // 但本格序列整窗换成了 5m —— 上一笔是按 1m 吸附的，那个时刻在 5m 序列里根本不存在。
    // 落点是「外部时刻 + 本格数据」的函数，数据换了就得就地重落。
    rerender(<ChartView {...base} period="5m" candles={fiveMin} externalCrosshairTime={T} />)
    expect(harness.cross).toEqual([T, T])
  })

  it('尾沿长一根的增量装载不该重落（那一笔还贴在新数据上）', () => {
    const { rerender } = render(<ChartView {...base} period="1m" candles={oneMin} />)
    mountWithExternal(rerender)
    rerender(<ChartView {...base} period="1m" candles={[...oneMin, { ...oneMin[199], time: oneMin[199].time + 60 }]} externalCrosshairTime={T} />)
    expect(harness.cross).toHaveLength(1)
  })

  it('指针接管本格之后，换数据不再把陈旧的指令值落回去', () => {
    const { rerender } = render(<ChartView {...base} period="1m" candles={oneMin} />)
    mountWithExternal(rerender)
    // 本格被指针驱动（fromExternalWrite=false）：这一格的落点此后由图表按像素自己算，
    // 换数据时它会重发事件 —— 外部那个值可能早就陈旧了，不该再落
    harness.crossCb?.(oneMin[120].time, 300, 200, false)
    harness.cross.length = 0
    rerender(<ChartView {...base} period="5m" candles={fiveMin} externalCrosshairTime={T} />)
    expect(harness.cross).toEqual([])
  })
})

describe('装载路径按序列形状判定（issue #193 的真身）', () => {
  afterEach(() => {
    harness.sets.length = 0
    harness.updates.length = 0
  })

  /**
   * 15m 与 1h 两片**等长**数据，末根时刻恰好重合（对齐过的序列常这样：15m 的最后一根
   * 正落在整点上）。此时「只比末根」会把换周期认成「同一批数据尾沿长了一根」，
   * 于是走增量路径：图表里装着的还是 15m 那一片，只有最后一根被 1h 的盖掉。
   * 界面上看是「换了周期图没怎么变」，十字光标则永远按旧序列吸附（旧值还继续被广播）。
   */
  it('末根时刻重合的换周期必须整窗换新数据，不能只盖最后一根', () => {
    const end = 1786797540 + 29 * 900
    const fifteen = Array.from({ length: 30 }, (_, i) => ({
      ...oneMinBase[0],
      time: end - (29 - i) * 900,
    }))
    const hour = Array.from({ length: 30 }, (_, i) => ({
      ...oneMinBase[0],
      time: end - (29 - i) * 3600,
    }))
    expect(fifteen[29].time).toBe(hour[29].time)
    expect(fifteen[28].time).not.toBe(hour[28].time)

    // 第一拍：周期先变，本格数据还是 15m 那一片（真机上 1h 要再等一次异步装载）
    const { rerender } = render(<ChartView {...base} period="15m" candles={fifteen} />)
    rerender(<ChartView {...base} period="1h" candles={fifteen} />)
    harness.sets.length = 0
    harness.updates.length = 0

    // 第二拍：1h 数据到位。此刻 keyRef 已经是 SOLUSDT:1h，「换周期」这条判据已经用掉了 ——
    // 只剩「这片数据是不是只长了尾沿」在决定走不走整窗装载。
    rerender(<ChartView {...base} period="1h" candles={hour} />)
    // 装载的必须**是新的那一片**（首根时刻换了周期），而不是旧 15m 序列盖一根尾巴
    expect(harness.sets).toEqual([{ len: 30, first: hour[0].time }])
  })
})
