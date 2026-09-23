import { expect, test, type Page } from '@playwright/test'

/**
 * #193 十字光标的落点必须始终落在**本格当前那份数据**的网格上。
 *
 * quad 的多图同步只广播「时刻」，接收格要把它吸附成本格周期里的那根 K 线。
 * 吸附是拿**当下装载的那份数据**算的，而换周期时这两件事会错开：广播落在新数据到位**之前**，
 * 吸附结果就是按旧序列算的（1m 的 `1790188080` 原样留在 5m 格里），新序列到位后
 * 没有任何一条路径把它重算一遍 —— 实测冻结指针 20s 都不自愈，只有让指针再挪一根才纠正。
 *
 * 于是这条规格的全部价值在「指针不再动」这个前提上：
 * 广播链路上有两处按值去重（`useChartSync` 的 `crosshairExternalRef.current[i] === time`
 * 与 `ChartView` 的 `externalCrosshairTime === lastReportedCrosshairRef.current`），
 * 源格再报同一个时刻也不会重发，所以**只有本格自己**知道自己该按新数据重算。
 * 让指针挪一根就把这一点掩盖掉了。
 *
 * 断言形式取「不变量」而不是「前后对比」：每格报出的时刻必须是它自己周期的整数倍。
 * 陈旧值恰恰表现为「分钟刻度留在 5m/15m/1h 格上」，一眼可辨；
 * 而「离源格有多近」在混周期下只能放宽到一根周期，既测不出错也容易被视角漂移误伤。
 */

const CELLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

const PERIOD_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
}

/** 四格拉开成混周期：细到粗，源格 1m */
const MIXED: Record<string, string> = { BTCUSDT: '1m', ETHUSDT: '5m', SOLUSDT: '15m', BNBUSDT: '1h' }

/** 每格当前的十字光标时刻（秒；未激活为 null）与其周期 */
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
      out[sym] = { time: raw ? Number(raw) : null, period: sel?.value ?? '?' }
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

/** 进 quad 布局（默认四格同为 1m），并确认此刻四格都没有十字光标 */
async function enterQuad(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/?perf=1500')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('header-more').click()
  await page.getByTestId('layout-toggle').click()
  await page.getByTestId('layout-toggle').click()
  await expect(page.locator('[data-testid^="quad-period-"]')).toHaveCount(4, { timeout: 15_000 })
  await closeMorePanel(page)
  await expect
    .poll(async () => Object.values(await cellCrosshair(page)).filter((v) => v.time !== null).length, { timeout: 10_000 })
    .toBe(0)
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
      if (!best || r.width * r.height > best.width * r.height) best = r
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

/** 一次采样：把「哪一格报出的时刻不在自己周期网格上」写成判词 */
async function offGridVerdict(page: Page) {
  const now = await cellCrosshair(page)
  const bad: string[] = []
  let reporting = 0
  const src = now[CELLS[0]]?.time ?? null
  for (const sym of CELLS) {
    const t = now[sym]?.time
    if (t === null || t === undefined) continue
    reporting++
    const own = PERIOD_SECONDS[now[sym].period]
    if (own === undefined) continue
    if (t % own !== 0) bad.push(`${sym}=${t}（${now[sym].period} 网格应为 ${own} 的倍数）`)
    // 光看「是不是自己周期的整数倍」不够：源格那根只要恰好也是 5m/15m 的整点，
    // 「把源格原值抄过来」和「按本格数据吸附」就长得一模一样。再加一条离源格不过两根周期，
    // 才把「吸附过一次但之后再没跟上新数据」的陈旧值也判出来。
    else if (src !== null && Math.abs(t - src) > 2 * own) bad.push(`${sym}=${t} 离源格 ${src} 超过两根 ${now[sym].period}`)
  }
  if (reporting < CELLS.length) return `只有 ${reporting}/4 格在报十字光标`
  return bad.length === 0 ? 'on-grid' : bad.join(' ')
}

/**
 * 冻结指针后的稳定判定：连采三次、每次隔 700ms，三次都必须干净。
 * 为什么不能只采一次：装载中的那一刻本来就可能是旧序列的落点，**能自愈**才算对；
 * 而实测不自愈的形态是「钉住 20s 不变」，1.4s 的稳定窗口足以把两者分开，
 * 又不至于把「等一次数据装载」的正常时延误判成缺陷。
 */
async function settledOnGrid(page: Page) {
  let verdict = ''
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(700)
    verdict = await offGridVerdict(page)
    if (verdict !== 'on-grid') return verdict
  }
  return verdict
}

/**
 * 让源格报出一个时刻，且这个时刻**不落在比 1m 更粗的任何网格上**（`avoidMod` 取在粗的那一档）。
 * 这一步是这条规格能成立的前提：源格那一根只要恰好是 5m/15m 的整点，
 * 「把源格原值抄过来」和「按本格数据重新吸附」在 DOM 上就完全一样，断言等于没有断言。
 * 1m 刻度里 4/5 都不满足 5m 整点，扫几个位置就有。
 * 摆动也要扫开多个位置：源格一格约 0.34px（1500 根挤在 ~500px 里），
 * 只在两三个像素上蹭等于一直在同一根 K 线上。
 */
async function sweepUntilSourceReports(page: Page, at: { cx: number; cy: number }, avoidMod: number) {
  let ticks = 0
  await expect
    .poll(
      async () => {
        await page.mouse.move(at.cx - 30 + ((ticks * 17) % 61), at.cy)
        ticks++
        const t = (await cellCrosshair(page))[CELLS[0]]?.time
        if (t === null || t === undefined) return '源格未上报十字光标时刻'
        if (t % avoidMod === 0) return `源格落点 ${t} 是 ${avoidMod} 的整倍数，抄原值和吸附分不开`
        return 'ready'
      },
      { timeout: 20_000, message: '源格要先报出一个不落在粗网格上的时刻' },
    )
    .toBe('ready')
}

test.describe('A4b 十字光标落点必须贴着本格当前的数据（quad）', () => {
  test.setTimeout(120_000)

  test('四格混周期后指针冻结：每格报出的时刻都必须是它自己周期的整数倍', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await enterQuad(page)
    for (const sym of CELLS) await page.selectOption(`[data-testid="quad-period-${sym}"]`, MIXED[sym])

    const at = await cellCanvasCenter(page, CELLS[0])
    expect(at, 'BTC 格内应能找到画布').not.toBeNull()
    if (!at) return
    await sweepUntilSourceReports(page, at, PERIOD_SECONDS['5m'])

    // 指针到此不动：换完周期的四格必须各自把落点重算到自己新的网格上
    await expect
      .poll(() => settledOnGrid(page), { timeout: 25_000, message: '冻结指针后，落点必须贴着本格自己的网格' })
      .toBe('on-grid')

    expect(errors, `pageerror: ${errors.slice(0, 2).join(' | ')}`).toHaveLength(0)
  })

  test('指针不动，把一格从 15m 换成 1h：它要按新序列重算，别的光标也不该被这一换打散', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await enterQuad(page)
    for (const sym of CELLS) await page.selectOption(`[data-testid="quad-period-${sym}"]`, MIXED[sym])

    const at = await cellCanvasCenter(page, CELLS[0])
    expect(at, 'BTC 格内应能找到画布').not.toBeNull()
    if (!at) return
    await sweepUntilSourceReports(page, at, PERIOD_SECONDS['5m'])
    await expect.poll(() => settledOnGrid(page), { timeout: 25_000 }).toBe('on-grid')

    // 只换 SOLUSDT 的周期，指针一动不动
    await page.selectOption(`[data-testid="quad-period-${CELLS[2]}"]`, '1h')
    await expect
      .poll(() => settledOnGrid(page), { timeout: 25_000, message: '换周期后不动指针，那一格也要把落点重算到新网格上' })
      .toBe('on-grid')

    expect(errors, `pageerror: ${errors.slice(0, 2).join(' | ')}`).toHaveLength(0)
  })

  /**
   * 同一件事发生在**源格**身上：指针就停在 BTC 格里，改的是它自己的周期。
   * 十字光标跟着像素走，而像素底下换了一批 K 线 —— 落点若还是按 1m 序列算出的分钟刻度，
   * 它在新序列里根本不存在，却还在被 `data-crosshair-time` 广播给其余三格。
   */
  test('指针停在源格里换它自己的周期：落点必须按新序列重算', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await enterQuad(page)

    const at = await cellCanvasCenter(page, CELLS[0])
    expect(at, 'BTC 格内应能找到画布').not.toBeNull()
    if (!at) return
    await sweepUntilSourceReports(page, at, PERIOD_SECONDS['1h'])

    await page.selectOption(`[data-testid="quad-period-${CELLS[0]}"]`, '1h')
    await expect
      .poll(() => settledOnGrid(page), { timeout: 25_000, message: '源格换自己的周期后，指针不动也必须重算落点' })
      .toBe('on-grid')

    expect(errors, `pageerror: ${errors.slice(0, 2).join(' | ')}`).toHaveLength(0)
  })
})
