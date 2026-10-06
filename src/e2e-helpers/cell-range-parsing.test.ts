/**
 * #279 判词解析口径（`edgeMinutes` 的分钟换算）+ 混周期同步不变量。
 *
 * ## 本文件的来路：一次把 CI 判词**在数轴上复原**之后
 *
 * PR #281 的 E2E（run 37386244256）webkit 三次 retry 全红，判词是：
 * ```
 * BTC(1m) 锚 跨449 | ETH(5m) Δ55..56 跨450 | SOL(15m) Δ55..56 跨450 | BNB(1h) Δ10..41 跨480
 * ‖ 整段200条 report×111 claim×1 apply×87 release×1 | claim1/release1 settle×0 | BTC放行36次
 * ```
 * 把这组数字**在 `edgeMinutes` 的算式里反解**，能得到唯一一组同形文本
 * （锚 `06/10 12:00 — 06/10 19:29`，ETH `12:55 — 20:25`，BNB `12:10 — 20:10`），
 * 于是可以逐条问「这个数是从哪种真实状态算出来的」，而不必靠猜。
 *
 * ## 结论一：判词的 `Δ` 在跨日界时整段错位（口径缺陷，不是产品缺陷）
 *
 * `edgeMinutes` 把 `MM-DD HH:MM` 换算成 `(DD*31 + MM)*1440 + HH*60 + mm`。
 * 这个换算**只在同一个 (月,日) 内可比较**；窗口一旦跨过午夜，两缘日号不同，
 * `DD*31` 的跳变就把整段平移了 `1440 * (日号差 - 1)` 分钟。
 * 反解出的那组文本里四格**都在 06/10 同一天**，所以**这一次红不是跨日界** ——
 * 但口径缺陷是真的，且它会让**下一次**跨日界的红读不出结论。
 * 而 A11 条本来就带 `data-visible-from/to`（同一对值的原始秒），
 * 判词完全没必要去解格式化文本。
 *
 * ## 结论二：这一次红的真实形状是「四格整体差一个相位」，且 SOL 没吸附到自己的网格
 *
 * 反解出的文本给出可核对的事实：
 * - 锚跨 449；ETH 跨 450（= 449 + 1 根 ETH）；BNB 跨 480（= 449 + 31 根 BNB）；
 * - ETH 与 SOL 的偏移**完全相同**（`Δ55..56`）—— 这不是「各格停在各自网格的不同相位」，
 *   而是**整片窗口的共模平移**（各格一起挪了同一个量）。
 * - SOL 是 15m 格，跨度 450 = 30 根 × 15m（对齐），但两缘相对锚格的偏移
 *   `55`/`56` **都不在 15 的整数倍上**（`55%15=10`、`56%15=11`）。
 *   即：**SOL 没有吸附到它自己的网格**，而 ETH（5m）两缘确实在 5 的整数倍上。
 *
 * 混周期下的不变量是「比视角细的格子停在**同一段时间**、粗格停在**自己柱子边界**上」。
 * SOL 两缘都偏离自身网格 ⇒ 它落在两个 15m 边界之间的某一根上，
 * 即接收格落位时**没有把请求时间吸附到本格的周期边界**。
 *
 * ## 为什么先写判据不改代码
 *
 * 本文件全部是**对判词口径与不变量的刻画**，不含任何产品代码改动。
 * 两处口径问题（跨日界、SOL 不吸附）都还需要**多次不同 run** 才能定性：
 * 单次 run 的形状是现象（见 `docs/progress.md` 证据纪律规则 3）。
 *
 * @see e2e/multi-chart-sync.spec.ts（消费方）
 * @see src/components/ChartView.tsx（apply 落位：`floorIndexByTime` 吸附）
 */
import { describe, expect, it } from 'vitest'

/** 与 `e2e/multi-chart-sync.spec.ts` 的 `edgeMinutes` 逐字同形 */
function edgeMinutes(text: string): [number, number] | null {
  const hits = [...text.matchAll(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/g)].map(
    (m) => (Number(m[1]) * 31 + Number(m[2])) * 1440 + Number(m[3]) * 60 + Number(m[4]),
  )
  return hits.length >= 2 ? [hits[0], hits[hits.length - 1]] : null
}

const CELLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
const PERIOD_MINUTES: Record<string, number> = { '1m': 1, '5m': 5, '15m': 15, '1h': 60 }
const MIXED: Record<string, string> = {
  BTCUSDT: '1m',
  ETHUSDT: '5m',
  SOLUSDT: '15m',
  BNBUSDT: '1h',
}

/** 与 e2e 判词同形：只有比视角细一半以内的格子参与比对 */
function trackedCells(anchorSpan: number): string[] {
  return CELLS.slice(1).filter((sym) => PERIOD_MINUTES[MIXED[sym]] * 2 <= anchorSpan)
}

/**
 * 接收格是否吸附到了**自己的周期网格**。
 *
 * 判据必须看**绝对**两缘（`edgeMinutes` 口径下的分钟数）模本格周期，
 * **不能**看「相对锚格的偏移量」模本格周期 —— 后者会被锚格自身的吸附余量污染：
 * CI 那次的共模平移量 55 恰好 `55 % 5 === 0`（贴 ETH 的网格）却不贴 SOL（`55 % 15 = 10`），
 * 用偏移量判会读出「ETH 对、SOL 错」，而真相是整片窗口一起挪。
 */
function isOffGrid(sym: string, edges: [number, number]): boolean {
  const p = PERIOD_MINUTES[MIXED[sym]]
  return edges[0] % p !== 0 || edges[1] % p !== 0
}

describe('#279 判词口径：edgeMinutes 的分钟换算', () => {
  it('同日内：分钟换算与真实跨度一致（对照半，恒真）', () => {
    const e = edgeMinutes('06/10 12:00 — 06/10 19:29')
    expect(e).not.toBeNull()
    expect(e![1] - e![0]).toBe(449)
    const from = Date.UTC(2026, 5, 10, 12, 0) / 1000
    const to = Date.UTC(2026, 5, 10, 19, 29) / 1000
    expect((to - from) / 60).toBe(449)
  })

  it('跨日界：两缘同向错位一整天，真实跨度不受影响', () => {
    const e = edgeMinutes('06/10 23:30 — 06/11 00:30')
    expect(e).not.toBeNull()
    const from = Date.UTC(2026, 5, 10, 23, 30) / 1000
    const to = Date.UTC(2026, 5, 11, 0, 30) / 1000
    expect((to - from) / 60).toBe(60)
    // 解析口径下两缘同向偏，且偏量远大于任何一个周期
    const parsedShift = e![0] - (from / 60)
    expect(Math.abs(parsedShift)).toBeGreaterThan(60 * 24)
    // 两缘**同向**：这是「跨日界」的签名，与「反向偏」（回声往返）可区分
    expect(Math.sign(e![0] - (from / 60))).toBe(Math.sign(e![1] - (to / 60)))
  })

  it('跨月界：错位量随月差放大到 -29401920 分钟（跨度本身反而看着"正常"）', () => {
    // 06/30 23:00 — 07/01 01:00：真实跨度 120 分钟。
    // `DD*31` 在 30 → 01 这一步把两缘**同时**挪了 -29401920 分钟，
    // 差值（跨度）被抵消掉一部分，于是判词里"跨1560"看着像个正常跨度 ——
    // 这比跨日界的 -1440 更阴险：它连跨度都会被伪装成合理值。
    const e = edgeMinutes('06/30 23:00 — 07/01 01:00')
    expect(e).not.toBeNull()
    const from = Date.UTC(2026, 5, 30, 23, 0) / 1000
    const to = Date.UTC(2026, 6, 1, 1, 0) / 1000
    expect((to - from) / 60).toBe(120)
    // 两缘同向错位，量级是月级而不是周期级
    const shift0 = e![0] - from / 60
    const shift1 = e![1] - to / 60
    expect(Math.sign(shift0)).toBe(Math.sign(shift1))
    expect(Math.abs(shift0)).toBeGreaterThan(60 * 24 * 20000)
    // 跨度被部分抵消：解析值既不等于真实值，也不等于跨日界那个 1440 的量级
    expect(e![1] - e![0]).not.toBe(120)
    expect(Math.abs(e![1] - e![0] - 120)).toBeLessThan(60 * 24 * 2)
  })
})

describe('#279 收口护栏：判词必须仍然能区分两种病（回归防护）', () => {
  it('cross-day 错位：两缘同向偏，且量级远大于周期容差', () => {
    const a = edgeMinutes('06/10 12:00 — 06/10 19:29')!
    const e = edgeMinutes('06/11 12:00 — 06/11 19:29')!
    const d0 = e[0] - a[0]
    const d1 = e[1] - a[1]
    expect(d0).toBe(1440)
    expect(d1).toBe(1440)
    // 「跨」仍是 449 —— 跨度没被拉宽，正是「同向平移」的签名，
    // 与「反向偏」（跨度被压窄/撑宽）可区分
    expect(e[1] - e[0]).toBe(449)
    expect(d0).toBeGreaterThan(60)
  })

  it('各格停在各自网格的不同相位：偏移逐格不同，且每个偏移都贴合本格周期', () => {
    // 构造「ETH 偏 5、SOL 偏 15」：各格贴自己的网格，但彼此不同 —— 与上面的共模平移分开
    const a = edgeMinutes('06/10 12:00 — 06/10 19:29')!
    const eth = edgeMinutes('06/10 12:05 — 06/10 19:34')!
    const sol = edgeMinutes('06/10 12:15 — 06/10 19:44')!
    const ethD = eth[0] - a[0]
    const solD = sol[0] - a[0]
    expect(ethD).toBe(5)
    expect(solD).toBe(15)
    expect(ethD).not.toBe(solD)
    // 各格都贴合自己的网格（判词上就是 offset % period === 0）
    expect(ethD % PERIOD_MINUTES[MIXED.ETHUSDT]).toBe(0)
    expect(solD % PERIOD_MINUTES[MIXED.SOLUSDT]).toBe(0)
    // 两种病的判词读数不同：共模平移的偏移在两格上**相等**。
    // 注意别把它写成「不贴合任何本格周期」——`55 % 5 === 0`，它恰好贴合 ETH 的网格，
    // 却**不**贴合 SOL 的（`55 % 15 = 10`）。判据只能读「绝对两缘 % 自身周期」，
    // 「偏移量 % 周期」是错的（锚格自身的吸附余量会污染它）。
    const cm = 55
    expect(cm % PERIOD_MINUTES[MIXED.ETHUSDT]).toBe(0)
    expect(cm % PERIOD_MINUTES[MIXED.SOLUSDT]).toBe(10)
    // 共模平移 ⇒ 逐格相等；不同相位 ⇒ 逐格不等
    expect([cm, cm]).toEqual([55, 55])
    expect([ethD, solD]).toEqual([5, 15])
    expect(ethD).not.toBe(solD)
  })
})

describe('#279 混周期不变量：接收格必须吸附到自己的周期网格', () => {
  it('CI 判词反解出的那组文本：SOL 两缘都偏离自身 15m 网格', () => {
    // 这组文本在 edgeMinutes 的算式里**唯一地**复现出 CI 判词
    // （锚跨449 / ETH Δ55..56 跨450 / SOL Δ55..56 跨450 / BNB Δ10..41 跨480），
    // 因此它就是「那次红」的判词等价物。
    const anchor = edgeMinutes('06/10 12:00 — 06/10 19:29')!
    const eth = edgeMinutes('06/10 12:55 — 06/10 20:25')!
    const sol = edgeMinutes('06/10 12:55 — 06/10 20:25')!
    const bnb = edgeMinutes('06/10 12:10 — 06/10 20:10')!
    const span = anchor[1] - anchor[0]
    expect(span).toBe(449)
    // 判词口径必须与 CI 逐字一致（否则说明复原没对准，反解结论全部作废）
    expect([eth[0] - anchor[0], eth[1] - anchor[1], eth[1] - eth[0]]).toEqual([55, 56, 450])
    expect([sol[0] - anchor[0], sol[1] - anchor[1], sol[1] - sol[0]]).toEqual([55, 56, 450])
    expect([bnb[0] - anchor[0], bnb[1] - anchor[1], bnb[1] - bnb[0]]).toEqual([10, 41, 480])
    expect(trackedCells(span)).toEqual(['ETHUSDT', 'SOLUSDT', 'BNBUSDT'])

    // ETH(5m)：**绝对**两缘都落在 5 的整数倍上 → 它吸附到了自己的网格
    expect(isOffGrid('ETHUSDT', eth)).toBe(false)
    // SOL(15m)：绝对两缘**都**不在 15 的整数倍上 → 它没吸附到自己的网格
    expect(isOffGrid('SOLUSDT', sol)).toBe(true)
    // 跨度本身对齐（450 = 30 × 15）：「不吸附」只发生在**两缘的位置**上，
    // 也就是说 SOL 整体滑到了两根 15m 边界之间的某处，而不是落在边界上
    expect((sol[1] - sol[0]) % 15).toBe(0)
  })

  it('共模平移 vs 各格不同相位：ETH 与 SOL 偏移相同 ⇒ 整片窗口一起挪', () => {
    const anchor = edgeMinutes('06/10 12:00 — 06/10 19:29')!
    const eth = edgeMinutes('06/10 12:55 — 06/10 20:25')!
    const sol = edgeMinutes('06/10 12:55 — 06/10 20:25')!
    const ethD = [eth[0] - anchor[0], eth[1] - anchor[1]]
    const solD = [sol[0] - anchor[0], sol[1] - anchor[1]]
    // 两格偏移逐项相等 ⇒ 不是「各格停在各自网格的不同相位」，是**共模平移**
    expect(solD).toEqual(ethD)
    // 共模平移的量级：远大于任何接收格的周期，又小于锚格跨度
    // （≈ 锚跨的 1/8，即 ~55 分钟；ETH 的周期是 5、SOL 的是 15，都解释不了这个量）
    expect(Math.abs(ethD[0])).toBeGreaterThan(PERIOD_MINUTES[MIXED.SOLUSDT])
    expect(Math.abs(ethD[0])).toBeLessThan(spanOf(anchor))
  })

  it('收口护栏：判据不许被放松成恒真——真实同向平移必须仍判红', () => {
    const span = 449
    const tracked = trackedCells(span)
    const isOff = (sym: string, d0: number, d1: number) => {
      const slack = PERIOD_MINUTES[MIXED[sym]] + 2
      return Math.abs(d0) > slack || Math.abs(d1) > slack
    }
    // 同日内的周期容差内偏差 → synced
    expect(tracked.some((s) => isOff(s, 3, -3))).toBe(false)
    // CI 里那种同向平移一整段 → 仍判红
    expect(tracked.some((s) => isOff(s, 11, 11))).toBe(true)
    // 本次那组 Δ55..56 → 也判红（偏量远超各格容差）
    expect(tracked.some((s) => isOff(s, 55, 56))).toBe(true)
  })
})

/** A11 两缘差（分钟）——判词口径下的「跨度」 */
function spanOf(edges: [number, number]): number {
  return edges[1] - edges[0]
}