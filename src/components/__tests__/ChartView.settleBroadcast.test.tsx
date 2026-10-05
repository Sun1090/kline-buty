// @vitest-environment jsdom
/**
 * #222 第二层：`settle`（手势结束落定广播）的**整段 kind 计数**判据。
 *
 * ## 这条测试存在的理由：一次自我推翻留下的
 *
 * #280 把失败判词里的写点取样从 `slice(-6)` 改成整段摘要之后，本机读到过
 * `settle×0`（claim×1/release×1 配平、锚格放行 46 次），于是被读成
 * 「`settleOnce` 从未跑起来 / #270 第二层惰性」。**这个读法是错的**，本文件就是它的证伪。
 *
 * ## 错在哪：把「去重生效」读成了「路径没执行」
 *
 * `settle` 的设计是**只在有差量时发**：`release` 里落定那一拍读 `api.visibleRange()`，
 * 换算成 from/to，与 `lastBroadcastRef` 相同就跳过。而 `report` 路径
 * （`ChartView` 可见区间回调里的放行分支）**也会写** `lastBroadcastRef`，
 * 所以手势途中那几帧 report 已经把最终落点播出去了，落定那一拍自然相同 → 被去重跳过。
 *
 * 于是「末次 report 区间 == 落定时读到的区间」这种设法下 `settle×0` 是**恒真的**：
 * 它**证明不了「settle 是死代码」**。要证明它活着，必须构造一个**有差量**的手势：
 * 末次 report 之后图表又挪到了别处（cull 迁移稍后才落地就是这种形态），落定才有话可说。
 *
 * ## 为什么用整段计数而不是尾部取样
 *
 * 取尾部若干条曾把 `settle` 挤出窗口，导致「没看见」被当成「没发生」。
 * 本文件一律按 kind 计数整段：`settle:0` 在这里只可能来自**明确的预期**，
 * 每条断言都写清「为什么这条必须是 0」或「为什么这条必须 ≥1」。
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

const harness = vi.hoisted(() => ({
  /** 图表此刻真实的可见区间（`visibleRange()` 的返回值，落定那一拍读的就是它） */
  range: null as { from: number; to: number } | null,
  /** 图表侧的可见区间变化入口（= 「拖动途中某一帧落定在某段上」） */
  fire: null as ((from: number, to: number, trusted?: boolean) => void) | null,
  /** 本图被要求写入的可视区间 */
  views: [] as { from: number; to: number }[],
  /**
   * 置为 true 时 `setVisibleRange` 像真图表那样**同步补发**一次可见区间事件。
   * 真实 lightweight-charts 只有在区间真的变了时才发，这里必须照做，
   * 否则「程序化落位不广播」那条判据在改动前后都成立（恒真的判据比没有判据更坏）。
   */
  echo: false,
}))

vi.mock('../../chart/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../chart/adapter')>()
  return {
    ...actual,
    LightweightChartAdapter: class {
      setCandles = vi.fn()
      updateCandle = vi.fn()
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
      subscribeCrosshairMove() {
        return () => {}
      }
      setCrosshairTime = vi.fn()
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
import { DEFAULT_INDICATOR_PARAMS } from '../../indicators/params'

afterEach(() => {
  cleanup()
  harness.range = null
  harness.fire = null
  harness.views.length = 0
  harness.echo = false
  vi.useRealTimers()
})

/** 起点固定，1m 一根（与 e2e `?perf` 的合成数据同构） */
function makeCandles(count: number) {
  const start = 1786797540
  return Array.from({ length: count }, (_, i) => ({
    time: start + i * 60,
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: 105 + i,
    volume: 1000 + i,
    isClosed: true,
  }))
}

const base = {
  symbol: 'BTCUSDT',
  period: '1m' as const,
  chartType: 'candlestick' as const,
  mainIndicator: 'ma' as const,
  subIndicator: 'volume' as const,
  indicatorParams: DEFAULT_INDICATOR_PARAMS,
  replay: null,
  hasMore: false,
  onLoadMore: vi.fn(),
  status: 'live' as const,
}

/**
 * 整段抓 `debugViewWrites:` 日志并**按 kind 计数**。
 * 刻意不取尾部样本 —— 见文件头「为什么用整段计数而不是尾部取样」。
 */
function captureKinds(run: () => void): Record<string, number> {
  const counts: Record<string, number> = {}
  const spy = vi.spyOn(console, 'debug').mockImplementation((...args: unknown[]) => {
    const line = String(args[0] ?? '')
    if (!line.startsWith('debugViewWrites: ')) return
    const kind = line.slice('debugViewWrites: '.length).split(' ')[0]
    counts[kind] = (counts[kind] ?? 0) + 1
  })
  try {
    run()
  } finally {
    spy.mockRestore()
  }
  return counts
}

/** 门控 `debugViewWritesEnabled()` 在模块加载时求值一次，所以要在 import 之前打开 */
beforeAll(() => {
  window.history.replaceState({}, '', '/?debugViewWrites')
})
afterAll(() => {
  window.history.replaceState({}, '', '/')
})

describe('#222 第二层：settle 落定广播的整段计数判据', () => {
  it('有差量时必发：末次 report 之后图表又挪走了，落定那一拍要把它播出去', () => {
    // 这条是「#270 第二层不是死代码」的**唯一**硬判据。
    // 构造：手势途中 report 停在 180..220（report 路径已把它写进 lastBroadcastRef），
    // 随后图表的真实可见区间挪到 300..340（cull 迁移稍后才落地的形态）。
    // 落定那一拍读到的区间与上次广播不同 ⇒ 必须有一条 settle。
    vi.useFakeTimers()
    const counts = captureKinds(() => {
      render(<ChartView {...base} candles={makeCandles(800)} onViewRangeChange={vi.fn()} />)
      harness.range = { from: 200, to: 240 }
      fireEvent.pointerDown(screen.getByTestId('chart-root'))
      act(() => {
        harness.fire!(200, 240, true)
        harness.fire!(180, 220, true)
      })
      harness.range = { from: 300, to: 340 }
      fireEvent.pointerUp(window)
      act(() => {
        vi.runAllTimers()
      })
    })

    expect(counts.claim, '一次手势一次 claim').toBe(1)
    expect(counts.release, 'claim 必须成对归还').toBe(1)
    expect(counts.report, '手势途中放行了 2 帧').toBe(2)
    expect(
      counts.settle ?? 0,
      '落定读到的区间与末次 report 不同 ⇒ 必须发出落定广播（这条变 0 就是第二层死了）',
    ).toBe(1)
  })

  it('无差量时必须去重：末次 report 的区间就是最终落点，不再补一条', () => {
    // 上一条的**反面**，也是 #270 那条既有判词（ChartView.render 里「与末次广播不同才发」）
    // 想守住的那一半。只守「有差量要发」不守「无差量不发」，一次手势就会多播一条，
    // 而多播的那条落点与用户手势无关，正是把兄弟格拽偏的形状。
    vi.useFakeTimers()
    const counts = captureKinds(() => {
      render(<ChartView {...base} candles={makeCandles(800)} onViewRangeChange={vi.fn()} />)
      harness.range = { from: 200, to: 240 }
      fireEvent.pointerDown(screen.getByTestId('chart-root'))
      act(() => {
        harness.fire!(200, 240, true)
        harness.fire!(180, 220, true)
        harness.fire!(160, 200, true)
      })
      harness.range = { from: 160, to: 200 } // 与末次 report 完全相同
      fireEvent.pointerUp(window)
      act(() => {
        vi.runAllTimers()
      })
    })

    expect(counts.report, '手势途中放行了 3 帧').toBe(3)
    expect(
      counts.settle ?? 0,
      '末次 report 已经把最终落点播出去了，落定那一拍必须去重（这条变 ≥1 就是去重没了）',
    ).toBe(0)
  })

  it('无位移手势：按下即抬手也要走完 claim→release，落定读到的就是初始区间', () => {
    // 守住 `if (!wasOwned) return` 之外的那半：手势即使没挪动，
    // release 仍会跑一次落定（首帧 report 已经把初始区间播出过，所以按设计去重）。
    // 这条同时给出「settle 的入口在 release 上、而不是靠 report 顺带触发」的读数：
    // 报告里 report×0 而 settle 路径确实被走到过（去掉去重后本用例的 settle 会变成 1）。
    vi.useFakeTimers()
    const counts = captureKinds(() => {
      render(<ChartView {...base} candles={makeCandles(800)} onViewRangeChange={vi.fn()} />)
      harness.range = { from: 200, to: 240 }
      fireEvent.pointerDown(screen.getByTestId('chart-root'))
      fireEvent.pointerUp(window)
      act(() => {
        vi.runAllTimers()
      })
    })

    expect(counts.claim, '一次手势一次 claim').toBe(1)
    expect(counts.release, 'claim 必须成对归还').toBe(1)
    expect(counts.report ?? 0, '无位移手势没有新的可见区间帧').toBe(0)
  })

  it('裁剪窗口迁移途中：迁移重落照旧静默，但手势结束时仍能落定', () => {
    // fixture **必须**超过 `CULL_THRESHOLD`（2000），否则裁剪迁移根本不发生、这条就是空转
    // ——第一版写 800 根时迁移后仍然全绿，恒真的判据比没有判据更坏。
    //
    // 同时守两件事：① 迁移那一拍不夺走归属（余下拖动继续广播 = 第一层）；
    // ② 手势结束时落定仍然能发（第二层），也就是第一层不会把第二层的入口一起掐掉。
    vi.useFakeTimers()
    const oneMin = makeCandles(2600)
    const counts = captureKinds(() => {
      const { rerender } = render(
        <ChartView {...base} candles={oneMin} onViewRangeChange={vi.fn()} />,
      )
      harness.echo = true
      harness.range = { from: 1800, to: 1840 }
      fireEvent.pointerDown(screen.getByTestId('chart-root'))
      act(() => {
        harness.fire!(1800, 1840, true)
        harness.fire!(2400, 2460, true) // 拖出已装载窗口 → cull 迁移 → 整窗重落
      })
      rerender(<ChartView {...base} candles={oneMin} onViewRangeChange={vi.fn()} />)
      act(() => {
        harness.fire!(2410, 2470, true) // 迁移之后、手势仍未结束
      })
      // 落定那一拍 `visibleRange()` 必须落在**当前装载切片内**才能换算出真实时间。
      // 迁移后装载区间是 [2400, 2600]，所以这里取片内一段，且与末次 report 的
      // 退化落点（被 clamp 成单根 t=1786953480，见下）不同 ⇒ 落定有差量。
      //
      // 顺带钉住一处**真实换算**行为：迁移后图表被保视图逻辑按「上一片切片的索引」
      // 重落到 `from=500,to=560`（末次 setVisibleRange 记录），落定那一拍读到的是
      // 装载后的 [0,100] 而不是它 —— 两者换算出的时间区间不同，落定因此把真实落点播出去。
      harness.range = { from: 0, to: 100 }
      fireEvent.pointerUp(window)
      act(() => {
        vi.runAllTimers()
      })
    })

    expect(
      (counts.report ?? 0) >= 2,
      '迁移不得夺走归属：迁移那一拍之后仍要继续放行（第一层，CI 实测 `放行 0`）',
    ).toBe(true)
    expect(counts.release, 'claim 必须成对归还').toBe(1)
    expect(
      counts.settle ?? 0,
      '迁移拖动结束时落定广播仍要发出（第二层没被第一层掐掉）',
    ).toBe(1)
  })
})