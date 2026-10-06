/**
 * #279：判词改走**原始秒**之后，判据仍必须能读出「谁被挪走」——
 * 本文件是那条换口径的回归防护。
 *
 * ## 三条必须同时成立的性质（缺一条就是假绿）
 *
 * 1. **跨日界/跨月界不失效** —— 跨度与 Δ 全部按秒算差，不再依赖 `DD*31` 的跳变。
 * 2. **判据没有因此被放松成恒真** —— 真实同向平移仍判红；同周期四格同步仍为 `synced`。
 * 3. **旧口径仍可复算旧判词** —— 保留 `edgeMinutesLegacy`，让 #283 那次红的
 *    `Δ55..56 跨450` 还能被反解（见 `cell-range-parsing.test.ts`）。
 *
 * 第 2 条是本项目反复栽过的地方：**修好一个判据的同时很容易把它改成恒真**。
 * 所以每条换口径的 PR 都必须同时给出「变异转红」与「反向变异也转红」。
 */
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  edgeDeltaMinutes,
  edgeMinutesLegacy,
  formatCellRanges,
  readCellRanges,
  spanMinutes,
  type CellRange,
  type CellRanges,
} from './cell-range'

const sec = (min: number) => min * 60

/** 与 `ChartView.fmtRangeTime` 同形的文本（不跨年时不带年份） */
function fmtUtc(t: number): string {
  const d = new Date(t * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

/**
 * 构造一次 `:114` 那样的拖动结果：锚格与三格接收者。
 * `shiftMin` 是三格相对锚格的**共模平移**量（CI 实测三格 Δ 逐项相同）。
 */
function syncScenario(shiftMin: number): Record<string, CellRange> {
  const anchor: CellRange = { from: 1_791_205_400, to: 1_791_232_340 } // 跨 449 分钟
  const mk = (d0: number, d1: number): CellRange => ({
    from: anchor.from + sec(d0),
    to: anchor.to + sec(d1),
  })
  return {
    BTCUSDT: anchor,
    ETHUSDT: mk(shiftMin, shiftMin + 1),
    SOLUSDT: mk(shiftMin, shiftMin + 1),
    BNBUSDT: mk(shiftMin, shiftMin + 1),
  }
}

/**
 * 四格的真实秒值。跨度 449 分钟（`:114` 的量级），含一格故意跨月界 ——
 * 文本口径在那格会给 1560，按秒必须给 120。
 */
const CELLS: ReadonlyArray<readonly [string, number, number]> = [
  ['BTCUSDT', 1_791_205_400, 1_791_232_340],
  ['ETHUSDT', 1_791_205_400 + 3300, 1_791_232_340 + 3360],
  ['SOLUSDT', Date.UTC(2026, 5, 30, 22, 0) / 1000, Date.UTC(2026, 6, 1, 0, 0) / 1000],
  ['BNBUSDT', 1_791_205_400, 1_791_232_340],
]

/**
 * 真实 DOM 形态（照 `ChartView` 的渲染顺序）：
 * 每个 cell 是一个容器，里面**并排**放 period 选择器和 A11 条，
 * 四格再放进同一个外层。`skip` 里的格子模拟「还没上报区间」（A11 条根本不渲染）。
 */
function renderCells(rows: ReadonlyArray<readonly [string, number | null, number | null]>): void {
  // 容器不带 data-testid：`*.test.ts` 在 src/ 下时会被 `testid-usage` 账本当成**生产**
  // 文件扫描（它只排除 `__tests__/` 目录），在夹具里写钩子会被算成零引用生产钩子。
  document.body.innerHTML =
    '<div class="quad-grid">' +
    rows
      .map(
        ([sym, from, to]) =>
          `<div class="cell">` +
          `<select data-testid="quad-period-${sym}"></select>` +
          (from == null || to == null
            ? ''
            : `<div data-testid="chart-visible-range" data-visible-from="${from}" data-visible-to="${to}"></div>`) +
          `</div>`,
      )
      .join('') +
    '</div>'
}

/** 跑真实的浏览器侧实现（`page.evaluate` 的回调就在 jsdom 里执行） */
function readViaDom(symbols: string[]): Promise<CellRanges> {
  const page = {
    evaluate: (fn: never, syms: string[]) =>
      (fn as unknown as (s: string[]) => CellRanges)(syms),
  }
  return readCellRanges(page as never, symbols)
}

/** 与 `multi-chart-sync.spec.ts:114` 同形的判定（`off === 0` 才算 synced） *//** 与 `multi-chart-sync.spec.ts:114` 同形的判定（`off === 0` 才算 synced） */
function offCount(ranges: Record<string, CellRange | null>, anchorSym: string, toleranceMin: number): number {
  const anchor = ranges[anchorSym]
  if (!anchor) return Number.MAX_SAFE_INTEGER
  return Object.entries(ranges).filter(([sym, r]) => {
    if (sym === anchorSym || !r) return false
    const [d0, d1] = edgeDeltaMinutes(r, anchor)
    return Math.abs(d0) > toleranceMin || Math.abs(d1) > toleranceMin
  }).length
}

describe('#279：按原始秒读 A11 区间', () => {
  it('同周期四格同步 → 跨度一致、off=0（换口径不许把判据放松）', () => {
    const ranges = syncScenario(0)
    expect(spanMinutes(ranges.BTCUSDT)).toBe(449)
    expect(spanMinutes(ranges.ETHUSDT)).toBe(450) // 两缘各 +1 分钟，与 CI 判词同形
    expect(offCount(ranges, 'BTCUSDT', 5)).toBe(0)
  })

  it('共模平移 55 分钟 → 三格全部判偏，且偏量按秒算得准', () => {
    const ranges = syncScenario(55)
    expect(offCount(ranges, 'BTCUSDT', 5)).toBe(3)
    expect(edgeDeltaMinutes(ranges.ETHUSDT, ranges.BTCUSDT)).toEqual([55, 56])
  })

  it('同月跨日：旧口径本来就精确（先量出它的真实失效面，别把缺陷写大）', () => {
    // `DD*31` 对 DD 单调 ⇒ 同月内跨任意天都精确。这条是**反向**护栏：
    // 把「旧口径跨日就废」写成结论是错的（我写错过一次，见 progress 规则 3）。
    const from = Date.UTC(2026, 5, 10, 22, 0) / 1000
    for (const mins of [60, 120, 240, 449]) {
      const to = from + sec(mins)
      const legacy = edgeMinutesLegacy(`${fmtUtc(from)} — ${fmtUtc(to)}`)!
      expect(legacy[1] - legacy[0], `${fmtUtc(from)} 跨 ${mins} 分钟`).toBe(mins)
    }
  })

  it('跨月界：旧口径作废（真实失效面），按秒仍精确', () => {
    // 06/30 22:00 — 07/01 00:00：真实跨度 120 分钟，旧口径读成 1560
    const from = Date.UTC(2026, 5, 30, 22, 0) / 1000
    const to = Date.UTC(2026, 6, 1, 0, 0) / 1000 // -> 07/01 00:00（真实 120 分钟）
    expect(spanMinutes({ from, to })).toBe(120)
    const legacy = edgeMinutesLegacy(`${fmtUtc(from)} — ${fmtUtc(to)}`)!
    expect(legacy[1] - legacy[0]).toBe(1560)
    expect(legacy[1] - legacy[0]).not.toBe(120)
  })

  it('跨月界下按秒的 Δ 仍然正确，且判据不会误报 synced', () => {
    // 锚格与接收格真的在同一段（秒相等），文本解析却会读出巨大 Δ
    const from = Date.UTC(2026, 5, 30, 22, 0) / 1000
    const to = Date.UTC(2026, 6, 1, 0, 0)
    const anchor: CellRange = { from, to }
    const cell: CellRange = { from, to } // 同一段
    expect(edgeDeltaMinutes(cell, anchor)).toEqual([0, 0])
    expect(offCount({ BTCUSDT: anchor, ETHUSDT: cell }, 'BTCUSDT', 5)).toBe(0)
    // 旧口径把「同一段」读成 d=0（两边同月时恰好也对），但窗口跨月那一刻就不对了
    const legacy = edgeMinutesLegacy(`${fmtUtc(from)} — ${fmtUtc(to)}`)!
    expect(legacy[1] - legacy[0]).toBeGreaterThan(120)
  })

  it('判词形状与旧判词逐字同形，便于新旧对读', () => {
    const line = formatCellRanges(syncScenario(55), 'BTCUSDT')
    // 接收格两缘各多 1 分钟 → 跨度 450，与 CI 判词里 ETH/SOL 的「跨450」逐字一致
    expect(line).toBe('BTC 锚 跨449 | ETH Δ55..56 跨450 | SOL Δ55..56 跨450 | BNB Δ55..56 跨450')
  })

  it('readCellRanges 真的从 DOM 读 data-visible-from/to 原始秒（口径换掉这件事本身要能验证）', async () => {
    // 上面几条验的是「按秒算出来的数对不对」，这条验的是**判词真的走按秒那条路**：
    // 在 jsdom 里摆出真实的 cell 结构，走 `readCellRanges` 里那段 `page.evaluate`
    // 的浏览器侧实现本身（不是复刻一份）。少了它，把读取改成永远 null 或退回解文本时
    // 全套仍绿 —— 规则 6 要防的正是这个。
    const rows = CELLS.map(([sym, from, to]) => [sym, from, to] as const)
    renderCells(rows)
    const state = await readViaDom(rows.map(([sym]) => sym))

    for (const [sym, from, to] of rows) {
      expect(state.ranges[sym], `${sym} 必须读出它自己那一格的原始秒`).toEqual({ from, to })
      expect(spanMinutes(state.ranges[sym]!), '跨度按秒算').toBe((to - from) / 60)
    }
    // 跨月界那格：文本口径会给 1560，按秒必须给 120
    expect(spanMinutes(state.ranges.SOLUSDT!)).toBe(120)
    expect(state.missingAttr, '四格都读到了秒属性').toEqual([])
    expect(edgeMinutesLegacy('06/30 22:00 — 07/01 00:00')![1]).toBeGreaterThan(120)
  })

  it('某一格还没上报区间 → 该格报 null，绝不捡邻格的区间（否则判词恒真）', async () => {
    // A11 条仅在 `visibleRange.from != null` 时渲染。四格里少一格时，
    // 「无上限地往祖先找」会捡到同一 grid 里**别的格**的 A11 条，
    // 于是这一格被判成 Δ=0（完全同步）—— 假绿。
    const rows: ReadonlyArray<readonly [string, number | null, number | null]> = [
      ['BTCUSDT', 1_791_205_400, 1_791_232_340],
      ['ETHUSDT', 1_791_205_400 + 3300, 1_791_232_340 + 3360],
      ['SOLUSDT', null, null], // 还没上报
      ['BNBUSDT', 1_791_205_400, 1_791_232_340],
    ]
    renderCells(rows)
    const state = await readViaDom(rows.map(([sym]) => sym))

    expect(state.ranges.SOLUSDT, '没上报区间必须显式为 null').toBeNull()
    expect(state.ranges.SOLUSDT, '不得等于邻格 BTC 的区间').not.toEqual({ from: 1_791_205_400, to: 1_791_232_340 })
    // 这是「正常瞬态」：不是接线坏了，所以 missingAttr 里不该有它
    expect(state.missingAttr, 'A11 条压根没渲染 ≠ 接线坏了').toEqual([])
    // 判词必须因此把它算成偏，而不是 synced
    expect(offCount(state.ranges, 'BTCUSDT', 5)).toBeGreaterThanOrEqual(1)
    expect(formatCellRanges(state.ranges, 'BTCUSDT')).toContain('SOL 无区间')
  })

  it('A11 条在但秒属性读不出来 → 单列成「接线坏了」，不许混进瞬态', async () => {
    // 变异：把属性名打错（模拟构建里 `data-visible-from` 被改名/漏写）。
    // 此时元素找得到、属性读不到 —— 与「这一格还没上报区间」在 DOM 上是两件事，
    // 判词必须分开：前者是**真缺陷**，后者等下一轮就好。
    document.body.innerHTML = CELLS.map(
      ([sym], i) =>
        `<div class="cell">` +
        `<select data-testid="quad-period-${sym}"></select>` +
        // 第 2 格故意写成别的属性名
        (i === 1
          ? '<div data-testid="chart-visible-range" data-visible-start="0"></div>'
          : `<div data-testid="chart-visible-range" data-visible-from="${CELLS[i][1]}" data-visible-to="${CELLS[i][2]}"></div>`) +
        `</div>`,
    ).join('')

    const state = await readViaDom(CELLS.map(([sym]) => sym))
    expect(state.ranges.ETHUSDT, '读不到秒属性时该格为 null').toBeNull()
    expect(state.missingAttr, '但它必须被单列成接线坏了，而不是和瞬态混在一起').toEqual(['ETHUSDT'])
    // 其余三格不受影响（不能因为一格坏就全盘报废）
    expect(state.ranges.BTCUSDT).not.toBeNull()
    expect(state.ranges.SOLUSDT).not.toBeNull()
  })

  it('属性缺失显式报「无区间」，不静默算成 0（否则会误诊成「被挤扁」）', () => {
    const line = formatCellRanges({ BTCUSDT: { from: 0, to: sec(60) }, ETHUSDT: null }, 'BTCUSDT')
    expect(line).toContain('ETH 无区间')
    // 跨度 0 会被 :202 的「被挤扁」判据当成失败 —— 所以这里必须是 null 而不是 {0,0}
    expect(line).not.toContain('ETH 跨0')
  })
})