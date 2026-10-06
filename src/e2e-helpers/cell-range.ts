/**
 * #279：四格视角同步的判词解析——**按原始秒**读，不解格式化文本。
 *
 * ## 为什么要换口径（这不是「顺手优化」，是判词读不出结论的根因之一）
 *
 * `data-visible-from/to` 早就带着 A11 条那一对值的**原始秒**（见 `ChartView` 的注释：
 * 「文本按 locale 格式化，跨月/跨年做差不可靠」）。而旧判词去解 `MM-DD HH:MM` 文本，
 * 换算成 `(DD*31 + MM)*1440 + HH*60 + mm` 的「相对分钟」——
 * **这个换算的真实失效面比「跨日就废」窄得多，下面是实测出来的**（不是推演）：
 *
 * | 窗口 | 真实跨度 | 旧口径读出的跨度 |
 * |---|---|---|
 * | `06/10 12:00 — 06/10 19:29` | 449 min | 449 ✅ |
 * | `06/10 23:30 — 06/11 00:30` | 60 min | 60 ✅ |
 * | `06/30 22:00 — 07/01 00:00` | 120 min | 1560 ❌ |
 *
 * 原因：换算里的 `DD*31` 对 `DD` **单调**，所以同一个月内跨任意天都精确
 * （本机穷举一整年 1460 组，同月 0 例失配）。作废的只有 **`DD` 回绕的跨月界**，
 * 而那一行最阴险 —— 跨度被**部分抵消**，读出的 1560 看着像个正常跨度。
 *
 * 这里记下「我曾把失效面写成跨日界，那是错的」，是因为按 `docs/progress.md` 规则 3，
 * 一个被夸大的失效面会让下一个人以为跨日界已经修好，从而不去管真正的跨月界。
 *
 * 它仍然必须换掉：判词依赖「窗口不跨月」这个**未被断言的隐含前提**。
 * 窗口跨度约 449–480 分钟，压住月末那 12 天的概率约 449/(365*1440) ≈ 0.09%，
 * 频率低但性质是「门禁量程 < 坏的入口」：一旦压住，跨度和 Δ 同时作废而红照报。
 * A11 条本来就带着这一对值的原始秒，换口径零成本。
 *
 * 本模块把两种口径都实现，**判词只走原始秒**；旧口径保留是为了
 * 让「换口径之前那几次红」的判词仍可复算（`src/e2e-helpers/cell-range-parsing.test.ts`
 * 用它反解 CI 判词，见那里）。
 *
 * @see e2e/multi-chart-sync.spec.ts（消费方）
 * @see src/components/ChartView.tsx（`data-visible-from/to`）
 */

/** 一格的可视区间（秒，全局坐标） */
export interface CellRange {
  from: number
  to: number
}

/**
 * `readCellRanges` 的返回值。两种「拿不到」必须分得开：
 * - `ranges[sym] === null`：没找到这一格的 A11 条（正常瞬态 —— 该格还没上报区间，判词会重轮询）
 * - `missingAttr` 里列出的 symbol：元素在、但秒值属性读不出来（构建里属性被改名/没写
 *   ⇒ 该去查 A11 接线，不是等下一轮）。
 *
 * 两者合成一个 `null` 的后果不是「信息少一点」，而是**真缺陷被静默降级成瞬态**：
 * 判词会一直轮询到超时，最后只留一句「跑偏 N/4」，读不出「A11 接线坏了」。
 */
export interface CellRanges {
  ranges: Record<string, CellRange | null>
  missingAttr: string[]
}

/**
 * A11 文本 → 旧口径的相对分钟两缘。**只用于复算旧判词，判词本身走原始秒。**
 *
 * 失效面（实测，勿夸大）：`DD*31` 对 `DD` 单调 ⇒ 同月内跨任意天都精确。
 * 真正让它作废的只有一处：**跨月界**（`DD` 回绕，如 `06/30 22:00 — 07/01 00:00`
 * 把 120 分钟读成 1560）。
 *
 * 它仍然必须换掉：判词依赖「窗口不跨月」这个**未被断言的隐含前提**，
 * 一旦压住月末，跨度与 Δ 同时作废而红照报 —— 属于「门禁量程 < 坏的入口」。
 * A11 条本来就带着这一对值的原始秒，换口径零成本。
 */
export function edgeMinutesLegacy(text: string): [number, number] | null {
  const hits = [...text.matchAll(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/g)].map(
    (m) => (Number(m[1]) * 31 + Number(m[2])) * 1440 + Number(m[3]) * 60 + Number(m[4]),
  )
  return hits.length >= 2 ? [hits[0], hits[hits.length - 1]] : null
}

/**
 * 每格的可视区间（秒）：**只**读 A11 条上的 `data-visible-from/to` 原始秒。
 *
 * 两条硬要求，都是被变异逼出来的：
 *
 * 1. 属性缺失（老构建 / 属性被改名）时返回 `null`，**不退回解析文本、不静默算成 0**。
 *    算成 0 会被 `:202` 的「被挤扁」判据当成真失败（误诊）；退回解析文本则是把上面
 *    那套刚被证明只在同月内成立的换算又请回来（判词会静默退化成旧的错口径）。
 * 2. 向上找 A11 条时**必须有上界**，见函数体内注释。
 */
export function readCellRanges(
  page: import('@playwright/test').Page,
  symbols: readonly string[],
): Promise<CellRanges> {
  return page.evaluate((syms) => {
    const out: Record<string, { from: number; to: number } | null> = {}
    const missingAttr: string[] = []
    for (const sym of syms) {
      const sel = document.querySelector(`[data-testid="quad-period-${sym}"]`)
      // A11 条是 period 选择器的**兄弟**（`ChartView` 里同一个 cell 内并排渲染），
      // 且仅在 `visibleRange.from != null` 时才存在。所以从选择器的父级往上找。
      //
      // 往上走必须有上限条件：**走到含有别的 period 选择器的祖先就停**。
      // 否则某一格还没上报区间时，会捡到邻格的 A11 条并当成「这一格完全同步」——
      // 那是一条恒真判据（规则 6）。宁可报 `null`（显式「无区间」）也不能捡错。
      let node: HTMLElement | null = sel ? (sel.parentElement as HTMLElement | null) : null
      let el: Element | null = null
      while (node && !el) {
        el = node.querySelector('[data-testid="chart-visible-range"]')
        if (node && !el) {
          node = node.parentElement
          if (node?.querySelector('[data-testid^="quad-period-"]')) break
        }
      }
      const from = Number(el?.getAttribute('data-visible-from') ?? NaN)
      const to = Number(el?.getAttribute('data-visible-to') ?? NaN)
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        out[sym] = null
        if (el !== null) missingAttr.push(sym)
      } else {
        out[sym] = { from, to }
      }
    }
    return { ranges: out, missingAttr }
  }, [...symbols])
}

/** 跨度（分钟） */
export function spanMinutes(r: CellRange): number {
  return (r.to - r.from) / 60
}

/** 两缘相对锚格的位移（分钟，各算各的符号 → 跨日界也不会被抵消） */
export function edgeDeltaMinutes(cell: CellRange, anchor: CellRange): [number, number] {
  return [(cell.from - anchor.from) / 60, (cell.to - anchor.to) / 60]
}

/**
 * 判词用的**一行**摘要：跨日界安全（全部按秒算差）。
 *
 * 保留 `Δa..b 跨s` 的形状是为了让新判词能与旧判词逐字对读：
 * 同一时刻两者应完全一致（不跨日界时），一旦不一致就是跨了日界 —— 这一点本身是信号。
 */
export function formatCellRanges(ranges: Record<string, CellRange | null>, anchorSym: string): string {
  const anchor = ranges[anchorSym]
  if (!anchor) return `${anchorSym} 无区间`
  return Object.entries(ranges)
    .map(([sym, r]) => {
      if (!r) return `${sym.slice(0, 3)} 无区间`
      if (sym === anchorSym) return `${sym.slice(0, 3)} 锚 跨${Math.round(spanMinutes(r))}`
      const [d0, d1] = edgeDeltaMinutes(r, anchor)
      return `${sym.slice(0, 3)} Δ${Math.round(d0)}..${Math.round(d1)} 跨${Math.round(spanMinutes(r))}`
    })
    .join(' | ')
}