import { expect, test, type Page } from '@playwright/test'

/**
 * A4 ★ 多周期同屏十字光标时间同步（quad）：四格十字光标按时间同步。
 *
 * 断言（DOM 观测面，不看像素）：quad 布局下 hover BTC 格 →
 * ① 源格上报该时刻；② 其余三格把十字光标落在**自己数据里最接近的那根 K 线**上；
 * ③ 指针换一根，接收格跟着搬；④ 移出后四格都清零。
 * 接收侧走 `setCrosshairPosition`，它不触发 subscribeCrosshairMove，所以格内没有任何 DOM 产物——
 * 于是 adapter 把当前十字光标时刻写进容器的 `data-crosshair-time`（与 `data-candles` 同一类观测钩子）。
 *
 * 为什么不再比画布像素指纹：本规格原先 hover 前后各取一次 canvas 内容指纹，要求「变了」。
 * 而 ?perf 合成数据每 1.5s 追加一根 K 线、每格都在重画 —— 把 `externalCrosshairTime` 恒置为 null
 * （多图同步完全断开）它照样通过。像素指纹在这种数据下等于没有断言。
 *
 * 已知没吃到的分辨力：quad 默认四格同为 1m，此时「按时间」与「按索引」对齐结果一模一样。
 * 把四格显式设成 1m/5m/15m/1h 才能分开两者，但实测那样会让下面两个真实问题浮出来（已各自立单）：
 * 指针移出后 15m/1h 两格不再清零，以及源格左移 60px 后四格时刻一动不动。
 */

const CELLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

/** 每格的十字光标时刻（秒；未激活为 null）与其周期 */
function cellCrosshair(page: Page): Promise<Record<string, { time: number | null; period: string }>> {
  return page.evaluate((syms) => {
    const out: Record<string, { time: number | null; period: string }> = {}
    for (const sym of syms) {
      const sel = document.querySelector(`[data-testid="quad-period-${sym}"]`) as HTMLSelectElement | null
      let node: HTMLElement | null = sel ? (sel.parentElement as HTMLElement | null) : null
      let el: Element | null = null
      while (node && !el) {
        el = node.querySelector('.chart-container')
        if (!el) node = node.parentElement
      }
      const raw = el?.getAttribute('data-crosshair-time') ?? null
      out[sym] = { time: raw ? Number(raw) : null, period: sel?.value ?? '1m' }
    }
    return out
  }, CELLS)
}

/**
 * 关掉「更多」面板：它是浮在图表上的下拉层，面板自己的按钮就压在格中心那块像素上
 * （elementFromPoint 实测命中 watermark-toggle）。开着它 hover 等于在 hover 面板。
 */
async function closeMorePanel(page: Page) {
  const more = page.getByTestId('header-more')
  if ((await more.getAttribute('aria-expanded')) === 'true') {
    await page.keyboard.press('Escape')
    await expect(more).toHaveAttribute('aria-expanded', 'false', { timeout: 5_000 })
  }
}

/** 格内面积最大的画布即主图面板；顺带确认落点没有被浮层挡住 */
async function cellCanvasCenter(page: Page, symbol: string) {
  const box = await page.evaluate((sym) => {
    const sel = document.querySelector(`[data-testid="quad-period-${sym}"]`)
    let node: HTMLElement | null = sel ? (sel.parentElement as HTMLElement | null) : null
    while (node && !node.querySelector('canvas')) node = node.parentElement
    let best: DOMRect | null = null
    for (const c of node?.querySelectorAll('canvas') ?? []) {
      const r = c.getBoundingClientRect()
      if (!best || r.width * r.height > best.width * best.height) best = r
    }
    return best ? { x: best.x, y: best.y, w: best.width, h: best.height } : null
  }, symbol)
  expect(box, `${symbol} 格内应能找到主图画布`).not.toBeNull()
  if (!box) return null
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const onCanvas = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('canvas') !== null, [cx, cy])
  expect(onCanvas, `${symbol} 格中心应直接命中画布（被浮层挡住就测不到十字光标）`).toBe(true)
  return { cx, cy, w: box.w }
}

const PERIOD_SECONDS: Record<string, number> = {
  '1s': 1,
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '2h': 7200,
  '4h': 14400,
  '12h': 43200,
  '1d': 86400,
}

test.describe('A4 多周期十字光标时间同步（quad）', () => {
  test.setTimeout(120_000)

  test('hover 一格十字光标 → 其余格按时间同步出现绘制', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=1500')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })

    // 「更多」菜单里切布局：single → pair → quad
    await page.getByTestId('header-more').click()
    await page.getByTestId('layout-toggle').click()
    await page.getByTestId('layout-toggle').click()
    await expect(page.locator('[data-testid^="quad-period-"]')).toHaveCount(4, { timeout: 15_000 })
    await closeMorePanel(page)

    // 前置：还没 hover，任何一格都不该有十字光标 —— 否则「其余三格也亮了」可以白拿
    await expect
      .poll(async () => Object.values(await cellCrosshair(page)).filter((v) => v.time !== null).length, { timeout: 10_000 })
      .toBe(0)

    const center = await cellCanvasCenter(page, CELLS[0])
    expect(center).not.toBeNull()
    if (!center) return

    /**
     * 一次 evaluate 读全四格 = 同一帧快照；比较对象取**源格当前的时刻**，不取先前冻结的常量。
     *
     * 容差 = 本格两个周期 + 源格一个周期，而不是「半个周期」。源格的 DOM 属性跟着指针实时更新，
     * 接收格要走一次 React 往返才落下，实测就有一次「源 1790168160 / 接收格还在 1790167800」
     * ——差恰好一格，属正常管线时延；四格同周期时半周期容差等于要求逐字相等，
     * CI 的 webkit 就是这么偶发红（三格彼此完全一致，只差源格一格）。
     * 这个量级仍然分得开「同步断了」（接收格会变 null）与「卡住不跟」（换一根后仍差这么远）。
     */
    const syncState = async (px: number, py: number) => {
      const onCanvas = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('canvas') !== null, [px, py])
      expect(onCanvas, `落点 (${Math.round(px)}, ${Math.round(py)}) 应直接命中画布`).toBe(true)
      await page.mouse.move(px, py)
      await page.mouse.move(px + 3, py)
      await expect
        .poll(
          async () => {
            const now = await cellCrosshair(page)
            const src = now[CELLS[0]]
            const srcTime = src?.time ?? null
            if (srcTime === null) return '源格未上报十字光标时刻'
            const lagging = CELLS.slice(1).filter((sym) => {
              const v = now[sym]
              if (!v || v.time === null) return true
              const own = PERIOD_SECONDS[v.period] ?? 60
              const srcOwn = PERIOD_SECONDS[src.period] ?? 60
              return Math.abs(v.time - srcTime) > 2 * own + srcOwn
            })
            return lagging.length === 0 ? 'synced' : `未跟上：${lagging.map((s) => `${s}=${JSON.stringify(now[s])} src=${srcTime}`).join(' ')}`
          },
          { timeout: 15_000, message: '其余三格的十字光标应被广播到源格时刻' },
        )
        .toBe('synced')
      return cellCrosshair(page)
    }

    // ① + ② 源格上报、其余三格按时间跟上
    const atCenter = await syncState(center.cx, center.cy)
    // ③ 左移本格宽度的四分之一：接收格必须跟着搬，不是一次巧合对上。
    //    「换一根」本身也要断言 —— 指针若原地不动，「跟上源格」在零位移下白拿（漂移除外，
    //    而合成行情每 1.5s 追加一根只会让同一像素的时刻**变晚**，方向断言把它排除了）。
    const atLeft = await syncState(center.cx - center.w / 4, center.cy)
    for (const sym of CELLS) {
      const before = atCenter[sym]?.time
      const after = atLeft[sym]?.time
      expect(after, `${sym} 左移后应有十字光标`).not.toBeNull()
      expect(before, `${sym} 左移前应有十字光标`).not.toBeNull()
      expect(after!, `${sym} 左移后应指向更早的 K 线（时刻必须变小）`).toBeLessThan(before!)
    }

    // ④ 指针移出图表 → 四格都不该残留十字光标。曾经移不掉：接收侧 `setCrosshairPosition` 会从
    //    `subscribeCrosshairMove` 回流成一次新的上报，回流再广播，把「移出」那条 null 永久盖掉
    //    （实测离开后仍有三格挂着幻影十字光标）。修的是 ChartView 的 lastAppliedCrosshairRef
    await page.mouse.move(6, 700)
    await expect
      .poll(
        async () => Object.values(await cellCrosshair(page)).filter((v) => v.time !== null).length,
        { timeout: 8_000, message: '指针移出后不应残留十字光标' },
      )
      .toBe(0)

    expect(errors).toHaveLength(0)
  })
})
