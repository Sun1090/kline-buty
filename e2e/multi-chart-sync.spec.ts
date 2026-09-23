import { expect, test, type Page } from '@playwright/test'

/**
 * 多图视角同步 ★ 四图时间轴联动：拖动一格，其余格跟着走到同一段时间。
 *
 * 已有覆盖只到「十字光标按时间同步」（period-crosshair.spec.ts）；视角广播
 * （onViewRangeChange → 兄弟格 externalRange → setVisibleRange）从没被断言过，
 * 而它正是双图/四图最显眼的一处联动，也是裁剪窗口下「全局索引 ↔ 本格局部索引」
 * 换算最容易错位的地方。
 *
 * 断言杠杆是 A11 的可视时间范围文本：四格设成同一周期后，同步成立时三格文本与被拖
 * 那格逐字相等（各格合成数据等长、同周期 → 同一段全局索引即同一段时间）。
 */

const CELLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
const PERF_COUNT = 1_500

/** A11 文本 → 跨度分钟数（只用来判「这是一次真平移」，不去解析绝对时间） */
async function spanMinutes(page: Page, symbol: string): Promise<number> {
  const t = (await cellRangeTexts(page))[symbol] ?? ''
  const hits = [...t.matchAll(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/g)].map(
    (m) => (Number(m[1]) * 31 + Number(m[2])) * 1440 + Number(m[3]) * 60 + Number(m[4]),
  )
  return hits.length >= 2 ? hits[hits.length - 1] - hits[0] : -1
}

/** 每格的 A11 可视时间范围文本（格内查，避免拿到别的格/别的图表） */
function cellRangeTexts(page: Page): Promise<Record<string, string>> {
  return page.evaluate((syms) => {
    const out: Record<string, string> = {}
    for (const sym of syms) {
      const sel = document.querySelector(`[data-testid="quad-period-${sym}"]`)
      let node: HTMLElement | null = sel ? (sel.parentElement as HTMLElement | null) : null
      let el: Element | null = null
      while (node && !el) {
        el = node.querySelector('[data-testid="chart-visible-range"]')
        if (!el) node = node.parentElement
      }
      out[sym] = el?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    }
    return out
  }, CELLS)
}

/** 把四格周期统一到 1m（默认可能各不相同，索引空间不同就没法逐字比） */
async function unifyPeriod(page: Page) {
  for (const sym of CELLS) {
    await page.getByTestId(`quad-period-${sym}`).selectOption('1m')
  }
}

/**
 * 关掉「更多」面板：它是浮在图表上的下拉层，面板自己的按钮就压在格中心那块像素上
 * （elementFromPoint 实测命中 watermark-toggle）。开着它拖图表等于在拖面板。
 */
async function closeMorePanel(page: Page) {
  const more = page.getByTestId('header-more')
  if ((await more.getAttribute('aria-expanded')) === 'true') {
    await page.keyboard.press('Escape')
    await expect(more).toHaveAttribute('aria-expanded', 'false', { timeout: 5_000 })
  }
}

/**
 * 在某一格主面板拖一段 → 该格视角平移进历史。dx 必须为正：向右拖才是回看，向左拖立刻撞上
 * 尾沿被 clamp 成「右缘不动、左缘前进」的假平移（文本照样变，断言就空了）。
 * 取格内面积最大的画布即主图面板，并确认落点没有被浮层挡住。
 */
async function panCell(page: Page, symbol: string, dx: number) {
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
  if (!box) return
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  // 落点必须是图表画布：被任何浮层（更多面板/停靠面板）挡住时，拖的就不是图表
  const onTop = await page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py)
    return el?.closest('canvas') !== null
  }, [cx, cy])
  expect(onTop, `${symbol} 格中心应直接命中画布（被浮层挡住就测不到平移）`).toBe(true)
  const step = Math.max(6, Math.round(dx / 24))
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  // lightweight-charts 靠 pressedMouseMove 平移，一次到位的 move 会被合成事件时序吃掉
  for (let i = 1; i <= 24; i++) await page.mouse.move(cx + i * step, cy, { steps: 2 })
  await page.mouse.up()
}

test.describe('多图视角同步（四图时间轴联动）', () => {
  test.setTimeout(120_000)

  test('拖动一格 → 其余三格的可视时间范围跟到同一段', async ({ page, browserName }) => {
    // firefox：Playwright 合成鼠标事件与 lightweight-charts 的 pressedMouseMove 不兼容（真机正常），
    // 本例要靠拖拽改变视角，故与 period-anchor 同样只在 chromium/webkit 上跑
    test.skip(browserName === 'firefox', 'firefox 下合成鼠标拖拽平移不可用（Playwright+轻量级图表限制）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.addInitScript(() => localStorage.clear())
    await page.goto(`/?perf=${PERF_COUNT}`)
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })

    // 切到四图布局（更多 → 布局：单图 → 双图 → 四图）
    await page.getByTestId('header-more').click()
    const layout = page.getByTestId('layout-toggle')
    await layout.click()
    await layout.click()
    await expect(page.locator('[data-testid^="quad-period-"]')).toHaveCount(4, { timeout: 20_000 })

    await unifyPeriod(page)
    await closeMorePanel(page)
    // 每格都要有非空的可视范围（A11 接线正常）
    await expect
      .poll(
        async () => Object.values(await cellRangeTexts(page)).filter((t) => t.length > 0).length,
        { timeout: 20_000 },
      )
      .toBe(CELLS.length)

    const before = await cellRangeTexts(page)
    const beforeSpan = await spanMinutes(page, CELLS[0])
    expect(beforeSpan).toBeGreaterThan(0)
    await panCell(page, CELLS[0], 260)

    // 被拖那格确实平移进了历史：文本变了，且跨度仍是同一个量级
    await expect
      .poll(async () => (await cellRangeTexts(page))[CELLS[0]], { timeout: 15_000 })
      .not.toBe(before[CELLS[0]])
    const draggedSpan = await spanMinutes(page, CELLS[0])
    expect(draggedSpan).toBeGreaterThan(beforeSpan * 0.6)
    expect(draggedSpan).toBeLessThan(beforeSpan * 1.6)

    // 其余三格跟上：不仅四格文本逐字相等，而且每格都得相对于自己「动过」——
    // 只比相等会被假绿钻空子（四格一动不动也是相等）
    await expect
      .poll(async () => {
        const now = await cellRangeTexts(page)
        const anchor = now[CELLS[0]]
        if (!anchor || anchor === before[CELLS[0]]) return `源格未平移：${JSON.stringify(now)}`
        const moved = CELLS.slice(1).filter((sym) => now[sym] !== before[sym]).length
        const same = CELLS.filter((sym) => now[sym] === anchor).length
        return moved === CELLS.length - 1 && same === CELLS.length ? 'synced' : `动了 ${moved}/3，同段 ${same}/4`
      }, { timeout: 20_000, message: '四格可视时间范围应被广播到同一段' })
      .toBe('synced')

    expect(errors).toHaveLength(0)
  })
})
