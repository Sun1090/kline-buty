import { expect, test, type Page } from '@playwright/test'
import { openDrawing, waitCandlesRendered } from './helpers/smoke'
import { DRAWING_TOOLS } from '../src/components/headerOptions'
import type { DrawingTool } from '../src/drawings/logic'

/**
 * 画线工具全表契约：遍历选择器里的每一个工具，用同一套手势驱动它，断言落库的锚点满足该工具的契约
 * ——数量、时间随 x 递增、价格随 y 递减、坐标全部有限。
 *
 * 为什么按表驱动而不是逐条手写：40 条实时数据用例各自判像素，工具契约反而没人统一把关；
 * 一次偶发的「手势被吞」在实时数据下表现为某条用例莫名红，在这里表现为具体某个工具的锚点不对。
 * 数据走 ?perf 合成（离线、确定性），吸附关掉，让锚点就是落点，方向断言才有意义。
 *
 * 这张表**故意不引用** `requiredPoints`：手势和断言都以人写的表为准，代码里改了某个工具的锚点数、
 * 排序方向或收尾条件，这里就会以「点了 N 下只落 M 个锚点 / 落了 2 条线」的形式红出来。
 * polyline 的 4 是「点 3 下 + 双击收尾」的实际锚点数（代码里那个数是上限，不是需求）。
 */
const ANCHORS: Partial<Record<DrawingTool, number>> = {
  horizontal: 1,
  vertical: 1,
  cross: 1,
  text: 1,
  note: 1,
  pricelabel: 1,
  trend: 2,
  extended: 2,
  angle: 2,
  channel: 2,
  fib: 2,
  rect: 2,
  ellipse: 2,
  circle: 2,
  arc: 2,
  ray: 2,
  hray: 2,
  vray: 2,
  fibchannel: 2,
  fibfan: 2,
  fibtimed: 2,
  cycle: 2,
  fibtz: 2,
  timerange: 2,
  pband: 2,
  pricerange: 2,
  forecast: 2,
  daterange: 2,
  gann: 2,
  gannbox: 2,
  arrow: 2,
  measure: 2,
  speedlines: 2,
  regchan: 2,
  hchannel: 2,
  triangle: 3,
  wedge: 3,
  bezier: 3,
  parray: 3,
  pchannel: 3,
  fibext: 3,
  rr: 3,
  position: 3,
  pitchfork: 3,
  xabcd: 5,
  elliott: 5,
  polyline: 4,
}

type Stored = { type: string; points: { time: number; price: number }[] }

const ANCHOR_COUNT = (tool: DrawingTool) => ANCHORS[tool] ?? 0

/**
 * `normalizePoints` 把这三件按价格升序存（其余两件按时间升序、射线族按点击顺序），
 * 所以锚点的方向断言对它们要反过来——断言的是工具的落库契约，不是点击顺序。
 */
const PRICE_ORDERED = new Set<DrawingTool>(['hchannel', 'pband', 'pricerange'])

/** 多段线靠 `pointerdown.detail >= 2` 收尾，而 Playwright 合成点击的 detail 恒为 0，只能派发合成事件 */
async function finishPolyline(page: Page, x: number, y: number) {
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y) ?? document.body
    const opts = (detail: number) => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
      pointerId: 99,
      pointerType: 'mouse',
      isPrimary: true,
      detail,
    })
    el.dispatchEvent(new PointerEvent('pointerdown', opts(2)))
    el.dispatchEvent(new PointerEvent('pointerup', opts(2)))
  }, { x, y })
}

async function openPerfChart(page: Page) {
  await page.addInitScript(() => localStorage.setItem('kline-buty:drawingSnap', '"off"'))
  await page.goto('/?perf=600')
  await waitCandlesRendered(page)
}

/** 选择器里的按钮顺序就是 DRAWING_TOOLS 顺序；按顺序配对拿到 value → 中文标签，避免测试侧写死文案 */
async function toolLabels(page: Page): Promise<Record<string, string>> {
  await openDrawing(page)
  const names = await page
    .locator('[data-testid="desktop-drawing-panel"] button[aria-pressed]:not([data-testid])')
    .allInnerTexts()
  expect(names).toHaveLength(DRAWING_TOOLS.length)
  const map: Record<string, string> = {}
  DRAWING_TOOLS.forEach((o, i) => {
    map[o.value] = (names[i] ?? '').trim()
  })
  return map
}

/** 从左到右、从上到下铺开锚点：x 递增 → 时间递增，y 递增 → 价格递减 */
function anchorAt(box: { x: number; y: number; width: number; height: number }, i: number, n: number) {
  const f = n <= 1 ? 0.5 : i / (n - 1)
  return { x: box.x + box.width * (0.25 + 0.5 * f), y: box.y + box.height * (0.25 + 0.4 * f) }
}

async function drive(page: Page, box: { x: number; y: number; width: number; height: number }, tool: DrawingTool) {
  const n = ANCHOR_COUNT(tool)
  if (n === 1) {
    const p = anchorAt(box, 0, 1)
    await page.mouse.click(p.x, p.y)
    return
  }
  if (n === 2) {
    const a = anchorAt(box, 0, 2)
    const b = anchorAt(box, 1, 2)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y, { steps: 6 })
    await page.mouse.up()
    return
  }
  for (let i = 0; i < n; i++) {
    const p = anchorAt(box, i, n)
    if (tool === 'polyline' && i === n - 1) await finishPolyline(page, p.x, p.y)
    else await page.mouse.click(p.x, p.y)
  }
}

const readDrawings = (page: Page) =>
  page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, Stored[]>
    return Object.values(all).flat()
  })

test.describe('画线工具全表契约', () => {
  test('选择器覆盖 DRAWING_TOOLS 全表，且每个工具都有契约条目', async ({ page }) => {
    await openPerfChart(page)
    const labels = await toolLabels(page)
    for (const o of DRAWING_TOOLS) {
      expect(labels[o.value]).not.toBe('')
      if (o.value === 'none') continue
      expect(ANCHORS[o.value], `${o.value} 缺契约条目`).toBeGreaterThan(0)
    }
  })

  for (const entry of DRAWING_TOOLS) {
    const tool = entry.value
    if (tool === 'none') continue
    test(`${tool}：手势 → 锚点契约`, async ({ page }) => {
      test.setTimeout(45_000)
      await openPerfChart(page)
      const labels = await toolLabels(page)
      await page.getByRole('button', { name: labels[tool] ?? tool, exact: true }).click()
      await expect(page.getByTestId('desktop-drawing-panel')).toHaveCount(0)

      const box = await page.locator('.chart-container').first().boundingBox()
      expect(box).not.toBeNull()
      await drive(page, box!, tool)

      await expect
        .poll(() => readDrawings(page).then((d) => d.length), { message: `${tool} 未提交画线`, timeout: 5_000 })
        .toBe(1)
      const [drawing] = await readDrawings(page)
      expect(drawing?.type).toBe(tool)
      const points = drawing?.points ?? []
      expect(points).toHaveLength(ANCHOR_COUNT(tool))
      for (const p of points) {
        expect(Number.isFinite(p.time)).toBe(true)
        expect(Number.isFinite(p.price)).toBe(true)
        expect(p.price).toBeGreaterThan(0)
      }
      const byPrice = PRICE_ORDERED.has(tool)
      for (let i = 1; i < points.length; i++) {
        if (byPrice) {
          expect(points[i].price).toBeGreaterThan(points[i - 1].price)
          expect(points[i].time).toBeLessThan(points[i - 1].time)
        } else {
          expect(points[i].time).toBeGreaterThan(points[i - 1].time)
          expect(points[i].price).toBeLessThan(points[i - 1].price)
        }
      }
    })
  }
})
