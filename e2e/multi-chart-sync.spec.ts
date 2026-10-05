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
 * 那格逐字相等（各格合成数据等长、同周期 → 同一段时间）。
 *
 * 第二条用例把四格拉开成 1m/5m/15m/1h：广播必须按**时间**换算（issue #186）。按索引广播时
 * 兄弟格的窗口会被硬套到 1m 格上，实测把它的可视跨度压到一两分钟——所以那条用例先问
 * 「换完周期每一格还看得见一段吗」，再问「拖一把之后四格是否仍在同一段时间」。
 */

const CELLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
const PERF_COUNT = 1_500
/** 每格周期折算分钟：混周期下允许各格停在自己网格上，取整误差不能超过一根 */
const PERIOD_MINUTES: Record<string, number> = { '1m': 1, '5m': 5, '15m': 15, '1h': 60 }

/** A11 文本 → 视角起止分钟数（同一天的相对分钟，只用来比距离，不去解析绝对日期） */
function edgeMinutes(text: string): [number, number] | null {
  const hits = [...text.matchAll(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/g)].map(
    (m) => (Number(m[1]) * 31 + Number(m[2])) * 1440 + Number(m[3]) * 60 + Number(m[4]),
  )
  return hits.length >= 2 ? [hits[0], hits[hits.length - 1]] : null
}

/** A11 文本 → 跨度分钟数（只用来判「这是一次真平移」，不去解析绝对时间） */
async function spanMinutes(page: Page, symbol: string): Promise<number> {
  const t = (await cellRangeTexts(page))[symbol] ?? ''
  const e = edgeMinutes(t)
  return e ? e[1] - e[0] : -1
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
    // 跨度断言看**落定态**而不是文本一变就单次读数：平移若触发窗格迁移（cull），
    // 重载是两拍过渡——beat-1 按旧间距换算会瞬时压缩、beat-2 才纠正（#199 同族形态，
    // CI webkit 实测读到过 1490→55 分钟的瞬态）。轮询跨度进带；持续压缩（真缺陷）
    // 会超时红且 Received 带实测值。判词附拖前文本与数据根数。
    const candles = await page.evaluate(() =>
      Number(document.querySelector('.chart-container')?.getAttribute('data-candles') ?? -1),
    )
    await expect
      .poll(
        async () => {
          const s = await spanMinutes(page, CELLS[0])
          return s >= beforeSpan * 0.6 && s <= beforeSpan * 1.6 ? 'in-band' : `out:${s}`
        },
        {
          timeout: 10_000,
          message: `拖后跨度未落回量级（拖前 ${beforeSpan} 分钟；拖前文本 ${before[CELLS[0]]}；data-candles ${candles}）`,
        },
      )
      .toBe('in-band')

    // 其余三格跟上：① 每格都得相对自己「动过」——只比相等会被假绿钻空子（四格一动不动也相等）；
    // ② 四格的视角起止落在同一段，按**分钟**比而不是逐字比文本。容差放一根周期起步：接收格现在要把
    //    时间吸附到自己数据的第几根（floor）+ 根数四舍五入 + webkit 的像素取整，实测每缘会差到三四根；
    //    而联动真断掉时差的是几百根（变异：externalRange 恒 null / onViewRangeChange 空实现 → 「同段 1/4」）
    await expect
      .poll(async () => {
        const now = await cellRangeTexts(page)
        const anchor = now[CELLS[0]]
        if (!anchor || anchor === before[CELLS[0]]) return `源格未平移：${JSON.stringify(now)}`
        const moved = CELLS.slice(1).filter((sym) => now[sym] !== before[sym]).length
        const a = edgeMinutes(anchor)
        if (!a) return `源格文本解析失败：${anchor}`
        const off = CELLS.filter((sym) => {
          const e = edgeMinutes(now[sym])
          return !e || Math.abs(e[0] - a[0]) > 5 || Math.abs(e[1] - a[1]) > 5
        }).length
        // 判词带上「每格相对锚点的两缘位移 + 自己的跨度」，红的时候直接分得出两种病：
        //   Δ0..0 跨53 三格 + 一格 Δ6..4 跨51 ⇒ 只有某个接收格落地偏窄 = 回声往返（issue #194 实测形态）
        //   四缘齐刷刷同向偏 ⇒ 锚点自己被人挪走 = 广播侧的问题，该去查发起格
        // 只写「跑偏 N/4」时这两种是同一句话，而它们该修的地方完全不同。
        const detail = CELLS.map((sym) => {
          const e = edgeMinutes(now[sym])
          return e ? `${sym.slice(0, 3)} Δ${e[0] - a[0]}..${e[1] - a[1]} 跨${e[1] - e[0]}` : `${sym.slice(0, 3)} 无文本`
        }).join(' | ')
        return moved === CELLS.length - 1 && off === 0 ? 'synced' : `动了 ${moved}/3，跑偏 ${off}/4 ⇒ ${detail}`
      }, { timeout: 20_000, message: '四格可视时间范围应被广播到同一段' })
      .toBe('synced')

    expect(errors).toHaveLength(0)
  })

  test('混周期 1m/5m/15m/1h：视角广播按时间换算，1m 那格不被挤成两三根', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'firefox 下合成鼠标拖拽平移不可用（Playwright+轻量级图表限制）')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    // #222 诊断：同步链路两写点（上报逃逸 / 接收应用）的门控日志，收进失败判词——
    // 混周期这条红过三次（CI webkit），每次都只带得出「哪格跑偏」，读不出「谁写的」。
    const viewWrites: string[] = []
    page.on('console', (msg) => {
      const t = msg.text()
      if (t.startsWith('debugViewWrites:')) viewWrites.push(t)
    })

    await page.addInitScript(() => localStorage.clear())
    await page.goto(`/?perf=${PERF_COUNT}&debugViewWrites`)
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('header-more').click()
    const layout = page.getByTestId('layout-toggle')
    await layout.click()
    await layout.click()
    await expect(page.locator('[data-testid^="quad-period-"]')).toHaveCount(4, { timeout: 20_000 })

    const MIXED: Record<string, string> = { BTCUSDT: '1m', ETHUSDT: '5m', SOLUSDT: '15m', BNBUSDT: '1h' }
    for (const sym of CELLS) await page.getByTestId(`quad-period-${sym}`).selectOption(MIXED[sym])
    await closeMorePanel(page)
    await expect
      .poll(async () => Object.values(await cellRangeTexts(page)).filter((t) => t.length > 0).length, { timeout: 20_000 })
      .toBe(CELLS.length)

    // 换周期本身就不许把任何一格挤扁：issue #186 的实测症状是 1m 那格 600px 里只剩两三根
    // （可视跨度约 1 分钟），因为兄弟格广播过来的是**逻辑索引**窗口。
    // 按收敛断言而不是抓瞬时快照：每次换周期都会引发一次广播 + 视角重排，稳定下来要一两秒。
    await expect
      .poll(
        async () => {
          const now = await cellRangeTexts(page)
          const thin = CELLS.map((sym) => [sym, edgeMinutes(now[sym])] as const)
            .filter(([, e]) => !e || e[1] - e[0] < 10)
            .map(([sym, e]) => `${sym}(${MIXED[sym]})跨度=${e ? e[1] - e[0] : '解析失败'}`)
          return thin.length === 0 ? 'ok' : `被挤扁：${thin.join(' ')}`
        },
        { timeout: 20_000, message: '混周期下每格都该看得见一段时间，而不是被索引窗口压扁' },
      )
      .toBe('ok')

    // 拖一把之后仍要收敛回同一段：源格确实平移，且比视角细的格子跟到同一分钟附近
    // （粗于视角一半的格子表示不了这么窄的段，只能停在自己柱子边界上，故不参与比对）
    const before = await cellRangeTexts(page)
    await panCell(page, CELLS[0], 260)

    await expect
      .poll(async () => {
        const now = await cellRangeTexts(page)
        const a = edgeMinutes(now[CELLS[0]])
        if (!a) return `源格文本解析失败：${now[CELLS[0]]}`
        if (now[CELLS[0]] === before[CELLS[0]]) return `源格未平移：${now[CELLS[0]]}`
        const span = a[1] - a[0]
        const tracked = CELLS.slice(1).filter((sym) => PERIOD_MINUTES[MIXED[sym]] * 2 <= span)
        const off = tracked.filter((sym) => {
          const e = edgeMinutes(now[sym])
          const slack = PERIOD_MINUTES[MIXED[sym]] + 2
          return !e || Math.abs(e[0] - a[0]) > slack || Math.abs(e[1] - a[1]) > slack
        })
        if (off.length === 0) return 'synced'
        // 判词必须能分出两种病，它们该修的地方完全不同（与上面那条同源判据）：
        //   各接收格两缘**同向**偏（Δ0、Δ1 同号且量级接近彼此周期）= 锚点自己被挪走了，
        //     该去查发起格为什么停在非广播出去的那个位置（CI 三次 retry 的实测形态：
        //     ETH/SOL 恰好各自停在自己的网格上、且相对锚点同向平移一整个身位）。
        //   两缘**反向**偏（跨度被压窄/撑宽）= 某个接收格落地偏窄，是回声往返（issue #194 形态）。
        // 只列「跑偏 SYM=文本」时这两种是同一句话，红了也不知道该读哪条链路。
        const detail = CELLS.map((sym) => {
          const e = edgeMinutes(now[sym])
          const tag = sym === CELLS[0] ? '锚' : `Δ${e ? e[0] - a[0] : '?'}..${e ? e[1] - a[1] : '?'}`
          return e ? `${sym.slice(0, 3)}(${MIXED[sym]}) ${tag} 跨${e[1] - e[0]}` : `${sym.slice(0, 3)} 无文本`
        }).join(' | ')
        // 写点日志（#222 门控）：下一次红要能读出「到底有没有广播出去过」。
        // 计数比尾部若干条更管用：只列最后几条时，看不出「全程一条 owned:true 都没有」
        //（= 一次都没广播，接收格停在拖前）与「广播过、之后锚点自己又挪走」这两种病的分别。
        const owned = viewWrites.filter((w) => w.includes('"owned":true')).length
        const applied = viewWrites.filter((w) => w.startsWith('debugViewWrites: apply')).length
        const tail = viewWrites.slice(-3).join(' ; ')
        return (
          `跑偏 ${off.length}/${tracked.length} ⇒ ${detail}` +
          ` ‖锚跨${span} 写点[共${viewWrites.length} 放行${owned} 接收${applied} 尾:${tail}]`
        )
      }, { timeout: 20_000, message: '混周期下比视角细的格子应停在同一段时间（各自周期取整）' })
      .toBe('synced')

    expect(errors).toHaveLength(0)
  })
})
