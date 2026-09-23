import { expect, test, type Page } from '@playwright/test'

/**
 * A4 ★ 多周期同屏十字光标时间同步（quad）：四格十字光标按时间同步。
 *
 * 断言（DOM 观测面，不看像素）：quad 布局下 hover BTC 格 →
 * ① 源格上报该时刻；② 其余三格把十字光标落在**自己数据里最接近的那根 K 线**上。
 * 接收侧走 `setCrosshairPosition`，它不触发 subscribeCrosshairMove，所以格内没有任何 DOM 产物——
 * 于是 adapter 把当前十字光标时刻写进容器的 `data-crosshair-time`（与 `data-candles` 同一类观测钩子）。
 *
 * 为什么不再比画布像素指纹：本规格原先 hover 前后各取一次 canvas 内容指纹，要求「变了」。
 * 而 ?perf 合成数据每 1.5s 追加一根 K 线、每格都在重画 —— 把 `externalCrosshairTime` 恒置为 null
 * （多图同步完全断开）它照样通过。像素指纹在这种数据下等于没有断言。
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
  return { cx, cy }
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
    // 四格周期保持各不相同（默认就是混周期）：跨周期才验得出「按时间」而不是「按索引」对齐
    await closeMorePanel(page)

    // 前置：还没 hover，任何一格都不该有十字光标 —— 否则「其余三格也亮了」可以白拿
    await expect
      .poll(async () => Object.values(await cellCrosshair(page)).filter((v) => v.time !== null).length, { timeout: 10_000 })
      .toBe(0)

    const center = await cellCanvasCenter(page, CELLS[0])
    expect(center).not.toBeNull()
    if (!center) return
    // 鼠标落位后再微移，确保 mousemove 真的派发到图表
    await page.mouse.move(center.cx, center.cy)
    await page.mouse.move(center.cx + 3, center.cy)

    // ① 源格上报它自己的时刻
    await expect
      .poll(async () => (await cellCrosshair(page))[CELLS[0]].time, { timeout: 10_000 })
      .not.toBeNull()
    const source = (await cellCrosshair(page))[CELLS[0]].time as number

    // ② 其余三格按**时间**跟上：各自落在自己周期里最接近该时刻的那根 K 线上，
    //    所以允许的偏差是本格周期的一半（变异：externalCrosshairTime 恒 null → 三格都没有属性 → 红）
    await expect
      .poll(
        async () => {
          const now = await cellCrosshair(page)
          const lagging = CELLS.slice(1).filter((sym) => {
            const v = now[sym]
            if (!v || v.time === null) return true
            const half = (PERIOD_SECONDS[v.period] ?? 60) / 2
            return Math.abs(v.time - source) > half
          })
          return lagging.length === 0 ? 'synced' : `未跟上：${lagging.map((s) => `${s}=${JSON.stringify(now[s])}`).join(' ')}`
        },
        { timeout: 15_000, message: '其余三格的十字光标应被广播到同一时刻' },
      )
      .toBe('synced')

    // ③ 指针移出图表 → 四格都不该残留十字光标。曾经移不掉：接收侧 `setCrosshairPosition` 会从
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
