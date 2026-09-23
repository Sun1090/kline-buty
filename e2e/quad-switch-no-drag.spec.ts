import { expect, test, type Page } from '@playwright/test'

/**
 * #199 换掉一格的周期，不许把其余三格的视角挪走。
 *
 * quad 的立身之本是「四格看同一段时间」，而换周期是**单格**的操作：那一格只是把自己
 * 装着的切片换成新周期那一片。旧实现里这一步会广播两次 ——
 *  ① 换周期的第一拍按 `PERIOD_MS[新周期]` 在**旧序列**上算根数，视角当场被压成 1/比值；
 *  ② 第二拍整窗换成真数据后图表按逻辑索引保视图，同一个索引区间又涨回比值倍的时间，
 *     装载收尾那次「不可信补读」还会报出 `t=同一根` 的零宽区间。
 * 两次都算「本格视角变了」而广播出去，接收格按索引换算时撞到自己的数据边界被 clamp，
 * 于是整组被甩走数小时 —— 实测指针一动不动，源格报出的时刻却跳了 2 小时（issue 里有采样）。
 *
 * 判词写成「其余三格的窗口一动不许动」，而不是「四格仍在同一段」：后者会把「联动照常」
 * 这件事一起放宽成要求，而本条要守的恰恰是**不联动**。容差给三根本格的 K 线（900s），
 * 缺陷量级是小时到天，不存在把红判成绿的余地；前提是视角已经被拖离最新（离了尾沿，
 * 实时补根就不会合法地挪动任何一格），并由「四格都看得到回到最新」把这个前提钉住。
 */

const CELLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
/** 四格统一到 5m：同周期才允许逐秒比，换周期那格随后单独改成 1h（比值 12） */
const BASE_PERIOD = '5m'
const BASE_SECONDS = 300
const SWITCHED = 'SOLUSDT'

/** 每格可视区间的**原始秒**（A11 条上的 data-visible-from/to）；拿不到为 null */
function cellWindows(page: Page): Promise<Record<string, { from: number | null; to: number | null }>> {
  return page.evaluate((syms) => {
    const out: Record<string, { from: number | null; to: number | null }> = {}
    for (const sym of syms) {
      const sel = document.querySelector(`[data-testid="quad-period-${sym}"]`)
      let node: HTMLElement | null = sel ? (sel.parentElement as HTMLElement | null) : null
      let el: Element | null = null
      while (node && !el) {
        el = node.querySelector('[data-testid="chart-visible-range"]')
        if (!el) node = node.parentElement
      }
      const f = el?.getAttribute('data-visible-from') ?? null
      const t = el?.getAttribute('data-visible-to') ?? null
      out[sym] = { from: f === null ? null : Number(f), to: t === null ? null : Number(t) }
    }
    return out
  }, CELLS)
}

async function closeMorePanel(page: Page) {
  const more = page.getByTestId('header-more')
  if ((await more.getAttribute('aria-expanded')) === 'true') {
    await page.keyboard.press('Escape')
    await expect(more).toHaveAttribute('aria-expanded', 'false', { timeout: 5_000 })
  }
}

/** 格内面积最大的画布 = 主图面板；浮层压在上面时命中就不是图表 */
async function cellCanvasCenter(page: Page, symbol: string) {
  const box = await page.evaluate<{ x: number; y: number; w: number; h: number } | null, string>((sym) => {
    const sel = document.querySelector(`[data-testid="quad-period-${sym}"]`)
    let node: HTMLElement | null = sel ? (sel.parentElement as HTMLElement | null) : null
    let best: { x: number; y: number; w: number; h: number } | null = null
    while (node && !best) {
      for (const c of node.querySelectorAll('canvas')) {
        const r = c.getBoundingClientRect()
        if (!best || r.width * r.height > best.w * best.h) best = { x: r.x, y: r.y, w: r.width, h: r.height }
      }
      if (!best) node = node.parentElement
    }
    return best
  }, symbol)
  expect(box, `${symbol} 格内应能找到主图画布`).not.toBeNull()
  if (!box) return null
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const onCanvas = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('canvas') !== null, [cx, cy])
  expect(onCanvas, `${symbol} 格中心应直接命中画布（被浮层挡住就是在拖面板）`).toBe(true)
  return { cx, cy }
}

/** 向右拖 → 视角进入历史（离开尾沿；lightweight-charts 靠 pressedMouseMove 平移） */
async function panIntoHistory(page: Page, at: { cx: number; cy: number }) {
  await page.mouse.move(at.cx, at.cy)
  await page.mouse.down()
  for (let i = 1; i <= 24; i++) await page.mouse.move(at.cx + i * 11, at.cy, { steps: 2 })
  await page.mouse.up()
}

test.describe('A4c 换一格周期不许挪走其余三格的视角（quad）', () => {
  test.setTimeout(150_000)

  test('三格 5m 视角定在历史中段，把第四格换成 1h：它们的起止一秒都不该变', async ({ page, browserName }) => {
    // 本用例靠拖拽定视角，firefox 下 Playwright 合成鼠标事件与 pressedMouseMove 不兼容（真机正常）
    test.skip(browserName === 'firefox', 'firefox 下合成拖拽平移不可用（Playwright + 轻量级图表）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=1500')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('header-more').click()
    await page.getByTestId('layout-toggle').click()
    await page.getByTestId('layout-toggle').click()
    await expect(page.locator('[data-testid^="quad-period-"]')).toHaveCount(4, { timeout: 15_000 })
    await closeMorePanel(page)

    for (const sym of CELLS) await page.getByTestId(`quad-period-${sym}`).selectOption(BASE_PERIOD)
    await expect
      .poll(async () => Object.values(await cellWindows(page)).filter((w) => w.from !== null && w.to !== null).length, {
        timeout: 20_000,
        message: '四格都要发布出自己的可视区间（A11 接线）',
      })
      .toBe(CELLS.length)

    const at = await cellCanvasCenter(page, CELLS[0])
    expect(at, 'BTC 格内应能找到画布').not.toBeNull()
    if (!at) return
    await panIntoHistory(page, at)
    // 前提：视角确实离开了尾沿 —— 四格都该出现「回到最新」。不然实时补根会合法地挪动格子，
    // 下面那句「一秒都不该变」就成了一个随时序抖动的断言。
    await expect(page.getByTestId('back-to-latest')).toHaveCount(CELLS.length, { timeout: 20_000 })

    const base = await cellWindows(page)
    for (const sym of CELLS) {
      const w = base[sym]
      expect(w.to! - w.from!, `${sym} 的可视跨度必须大于一根（被压成退化视角就没有可挪动的量）`).toBeGreaterThan(BASE_SECONDS)
    }
    const baseSwitched = base[SWITCHED]
    const baseSwitchedSpan = baseSwitched.to! - baseSwitched.from!

    await page.getByTestId(`quad-period-${SWITCHED}`).selectOption('1h')

    // **观测窗**，不是「采样一次看是否干净」：换周期引发的广播落在那之后的几百毫秒～数秒
    // （数据要晚一拍才到，第二拍整窗装载才是甩走别人的那一下）。变异实测把广播门整个撤掉
    // （= 回到 #199 的形态）后一次性采样照样绿，因为 t=0 那一刻确实还没动。
    const OBSERVE_MS = 14_000
    const deadline = Date.now() + OBSERVE_MS
    let worst = 0
    let detail = ''
    let samples = 0
    let solMoved = 0
    let solWindow: { from: number; to: number } | null = null
    do {
      const now = await cellWindows(page)
      samples++
      for (const sym of CELLS) {
        const w = now[sym]
        if (w.from === null || w.to === null) {
          if (!detail) detail = `${sym} 的可视区间在观测中消失了`
          continue
        }
        const drift = Math.abs(w.to - base[sym].to!) + Math.abs(w.from - base[sym].from!)
        if (sym === SWITCHED) {
          solWindow = { from: w.from, to: w.to }
          if (drift > 0) solMoved++
          continue
        }
        if (drift > worst) {
          worst = drift
          detail = `${sym} 被挪走 ${drift}s（起 ${base[sym].from}→${w.from}，止 ${base[sym].to}→${w.to}）`
        }
      }
      await page.waitForTimeout(700)
    } while (Date.now() < deadline)

    // 观测窗本身要证明它测到了东西：换周期那一格在整个窗口里至少报出过一次与换之前不同的区间
    // （一次都没变 = 这一步什么都没发生，那「别人没动」就不算证据）
    expect(samples, '观测窗一次都没采到').toBeGreaterThan(3)
    expect(solMoved, `${SWITCHED} 换周期后一格里可视区间始终没变过：本例的前提（真的换了周期、重落了视角）没有成立`).toBeGreaterThan(0)
    expect(worst, `其余三格中挪得最远的一格：${detail}`).toBeLessThanOrEqual(BASE_SECONDS * 3)

    // 换的那一格自己：右缘仍锚在换之前那附近（一根新周期 K 线以内），
    // 跨度不许按周期比值涨（旧实现 5m→1h 实测把视角涨到十几倍）
    expect(solWindow, `${SWITCHED} 的可视区间采不到`).not.toBeNull()
    if (!solWindow) return
    const solSpan = solWindow.to - solWindow.from
    expect(solSpan, `${SWITCHED} 换周期后的可视跨度从 ${baseSwitchedSpan}s 涨到了 ${solSpan}s`).toBeLessThanOrEqual(
      baseSwitchedSpan * 1.5 + BASE_SECONDS * 12,
    )
    expect(solSpan, `${SWITCHED} 换周期后不该把视角压没`).toBeGreaterThanOrEqual(BASE_SECONDS * 12)
    expect(
      Math.abs(solWindow.to - baseSwitched.to!),
      `${SWITCHED} 的右缘从 ${baseSwitched.to} 跳到了 ${solWindow.to}：换周期必须锚在原来那段时间上`,
    ).toBeLessThanOrEqual(BASE_SECONDS * 12)

    expect(errors, `pageerror: ${errors.slice(0, 2).join(' | ')}`).toHaveLength(0)
  })
})
