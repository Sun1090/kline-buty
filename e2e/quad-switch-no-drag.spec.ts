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
 *
 * 容差的量纲要说清楚：`drift` 是 `|Δfrom| + |Δto|`（两边之和），所以对**纯平移**而言
 * 真实容忍度只有 900/2 = 450s = **1.5 根** 5m，不是字面读起来的 3 根。这里刻意不把
 * 指标改成单边 —— 单边会漏掉「两边反向动 = 跨度被压」那一类缺陷，而压跨度正是 #199
 * 的原始形态。宁可紧，不可漏；但判词会把平移距离与跨度变化分开报，免得读日志的人再乘一次二。
 *
 * 观测窗的结束时机是**落位**而不是墙钟：换周期那一格连续几拍区间一字不变才算完，原来的 14s
 * 降级成**下限**（一秒都不少采，只可能更久）。理由是墙钟只能造成一种错：CI 高负载下装载迟到、
 * 14s 先到期，缺陷还没发生就宣布无罪。落位的判据只能落在换周期那一格自己身上 —— 用「其余三格
 * 没动」当结束条件是本末倒置，没被挪走的格子本来就静止，窗口会在广播到来前就收工。
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

  // 这里**故意去掉了**原先的 `test.skip(browserName === 'firefox', 'firefox 下合成拖拽平移不可用')`，
  // 为的是在 CI 上量一次它到底还成不成立。那条措辞已被 #227 否掉一半：以「视角确实被拖走了」
  // 为前提的合成拖拽（smoke-mobile 的「回看历史 → 回到最新」「触屏轻扫后恢复平移」）在 CI 的
  // firefox 上是绿的，仓库里另有 5 个进 CI 的文件零 skip 地跑 `mouse.down()` 拖拽 ——
  // 所以「firefox 拖不动」不能当既成事实用。本机 firefox 起不来（juggler 报
  // `Could not find profile folder`，与用例无关，连 docs.spec 也一样失败），CI 是唯一取证面。
  // 绿 = 这条 skip 是多余的，A4c 白得一个浏览器；红 = 真实口径大概是「四格联动的拖拽不可靠」
  // 而不是「拖不动」，把实测结果记回来再恢复 skip。两种结果都算收获。
  //
  // **裁定：绿，skip 已永久去掉（2026-09-24，PR #229）。** 定案的不是「跑绿了」，而是两次同清单
  // 运行的计数对照 —— #227（skip 还在）`Running 744 / 56 skipped / 687 passed / 1 flaky`，
  // #229（去掉 skip）`Running 744 / 55 skipped / 687 passed / 2 flaky`：总数与通过数一字不动，
  // skipped 正好少 1，就是 firefox 这一例从「跳过」搬进「执行」。它也不在 flaky 名单里
  // （那两条都是 `[webkit]` 的 smoke-depth / smoke-drawings），所以是 attempt 1 直接过的。
  // 之所以要这样对照：本条的前提是**观测量**（四格都出现「回到最新」才继续），拖不动会红在前提
  // 那一步、不会静默放行 —— 真正需要排除的是「firefox 压根没跑这一例」，而那只看得动计数。
  test('三格 5m 视角定在历史中段，把第四格换成 1h：它们的起止一秒都不该变', async ({ page }) => {
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
    //
    // 窗口的**下限**是墙钟（14s，沿用原写法，一秒都不少采），**结束时机**则改看落位：
    // 换周期那一格连续 SETTLE_STABLE 拍一字不变，才认为它那两拍（先按新 period 压一遍、
    // 再整窗换成真数据重落一遍）都走完了。只要它还在变，就继续采，最多到 CAP。
    // 这么改只可能比原来观测得**更久**，绝不会更短 —— 因为原值被留作下限了。
    // 反过来的旧风险是实的：CI 高负载下装载迟到而 14s 先到期，缺陷还没发生就宣布无罪（假绿），
    // 而 issue #222 实测同一份代码本地 10/10 绿、CI 红，说明 CI 上这条时间线确实会挪。
    const FLOOR_MS = 14_000
    const CAP_MS = 45_000
    const SETTLE_STABLE = 3
    const SAMPLE_MS = 700
    const startedAt = Date.now()
    let worst = 0
    let detail = ''
    let samples = 0
    let solMoved = 0
    let solWindow: { from: number; to: number } | null = null
    let solStable = 0
    let solPrev: { from: number; to: number } | null = null
    let solMissing = 0
    let solSettledSample: number | null = null
    // do-while 的条件在循环体之后，初值必然先被覆盖，所以这里不给初值
    let settled: boolean
    let capped = false
    do {
      const now = await cellWindows(page)
      samples++
      let solNow: { from: number; to: number } | null = null
      for (const sym of CELLS) {
        const w = now[sym]
        if (w.from === null || w.to === null) {
          if (!detail) detail = `${sym} 的可视区间在观测中消失了`
          continue
        }
        const drift = Math.abs(w.to - base[sym].to!) + Math.abs(w.from - base[sym].from!)
        if (sym === SWITCHED) {
          solNow = { from: w.from, to: w.to }
          if (drift > 0) solMoved++
          continue
        }
        if (drift > worst) {
          worst = drift
          // 判词必须把「两条边之和」与「实际挪走了多久」分开写：drift 是 |Δfrom|+|Δto|，
          // 一次纯平移会被读成两倍量级（CI 上那次报 2400s，实际整片只平移了 1200s）。
          // span 是否为 0 决定这是「整片平移」还是「视角被压/涨」，两者修法完全不同。
          const fromShift = w.from - base[sym].from!
          const toShift = w.to - base[sym].to!
          const span = w.to - w.from
          const baseSpan = base[sym].to! - base[sym].from!
          const shape =
            fromShift === toShift
              ? `整片平移 ${Math.abs(fromShift)}s（跨度未变，${baseSpan}s）`
              : `跨度 ${baseSpan}s→${span}s（起偏 ${fromShift}s、止偏 ${toShift}s）`
          detail = `${sym} ${shape}；drift=${drift}s（=|Δfrom|+|Δto|，非平移距离）起 ${base[sym].from}→${w.from}，止 ${base[sym].to}→${w.to}`
        }
      }
      const elapsed = Date.now() - startedAt
      // 落位判据只看换周期那一格自己：它连续 SETTLE_STABLE 次采样与上一拍一字不差 = 两拍都落定了。
      // 拿「其余三格没动」当结束条件是本末倒置 —— 没被挪走的格子天然静止，
      // 那会让窗口在广播到来之前就收工。
      // 这一格读不到区间时必须把稳定计数清零：装载过程中 data-visible-from 会短暂消失，
      // 若沿用上一次的读数当基线，闪烁会被当成「一直没变」，落位于是被提前判定。
      if (!solNow) {
        solMissing++
        solStable = 0
        solPrev = null
      } else {
        if (solPrev && solPrev.from === solNow.from && solPrev.to === solNow.to) solStable++
        else solStable = 0
        solPrev = solNow
        solWindow = solNow
      }
      if (solStable >= SETTLE_STABLE && solSettledSample === null) solSettledSample = samples
      settled = elapsed >= FLOOR_MS && solWindow !== null && solStable >= SETTLE_STABLE
      if (!settled && elapsed >= CAP_MS) {
        capped = true
        break
      }
      await page.waitForTimeout(SAMPLE_MS)
    } while (!settled)

    // 观测窗本身要证明它测到了东西：换周期那一格在整个窗口里至少报出过一次与换之前不同的区间
    // （一次都没变 = 这一步什么都没发生，那「别人没动」就不算证据）
    expect(samples, '观测窗一次都没采到').toBeGreaterThan(3)
    expect(solMoved, `${SWITCHED} 换周期后一格里可视区间始终没变过：本例的前提（真的换了周期、重落了视角）没有成立`).toBeGreaterThan(0)
    // 截断必须是显式的红：CAP 到点而观测没收尾 = 这一格的装载从没稳过，
    // 「其余三格没动」这个结论根本没机会被检验（不是它绿了，是窗没看完）。
    // 判词只报「没收尾」+ 两个判据各自的实测值，不猜原因：到点可能是连续一致拍数不够，
    // 也可能是早稳了但没到墙钟下限 —— 两种的修法完全不同，写成「始终没落位」会带偏方向。
    const solReport =
      `${samples} 拍、${Date.now() - startedAt}ms，末次起连续 ${solStable} 拍与上一拍一致（需 ≥${SETTLE_STABLE}）` +
      `、区间缺失 ${solMissing} 拍`
    expect(capped, `观测窗跑到 CAP=${CAP_MS}ms 仍未收尾（下限 ${FLOOR_MS}ms；${solReport}）`).toBe(false)
    expect(
      worst,
      `其余三格中挪得最远的一格：${detail}；观测窗跑了 ${solReport}，${SWITCHED} 于第 ${solSettledSample ?? samples} 拍落位`,
    ).toBeLessThanOrEqual(BASE_SECONDS * 3)

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
