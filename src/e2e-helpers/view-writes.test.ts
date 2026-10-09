import { describe, it, expect } from 'vitest'
import { attributeBroadcasts, parseViewWrite, summarizeViewWrites, VIEW_WRITE_SUMMARY_MAX } from './view-writes'

const line = (kind: string, extra: Record<string, unknown> = {}) =>
  `debugViewWrites: ${kind} ${JSON.stringify({ sym: 'BTCUSDT', ...extra })}`

describe('parseViewWrite', () => {
  it('解析 kind 与各字段', () => {
    const w = parseViewWrite(line('settle', { from: 1, to: 2, owned: true, via: 'late-event' }))
    expect(w).toMatchObject({ kind: 'settle', sym: 'BTCUSDT', from: 1, to: 2, owned: true, via: 'late-event' })
  })

  it('非本前缀的日志返回 null（不该因日志噪声炸掉判词）', () => {
    expect(parseViewWrite('hello world')).toBeNull()
    expect(parseViewWrite('debugViewWrites: settle')).toBeNull()
  })

  it('JSON 坏了返回 null 而不是抛', () => {
    expect(parseViewWrite('debugViewWrites: report {oops')).toBeNull()
  })

  it('apply 的 extFrom/extTo 与索引字段解析出来', () => {
    const w = parseViewWrite(
      'debugViewWrites: apply ' + JSON.stringify({ sym: 'ETHUSDT', extFrom: 1000, extTo: 2000, ownSec: 300, fromIdx: 3, toIdx: 9, base: 2 }),
    )
    expect(w).toMatchObject({ kind: 'apply', extFrom: 1000, extTo: 2000, fromIdx: 3, toIdx: 9, base: 2 })
  })
})

// 广播归因（#222 下一步）：把「谁把哪个窗广播给了接收格、是迟到 echo 还是换格广播」钉死。
// 接收格 apply 带的 extFrom/extTo 是 incoming 原始窗（broadcast 原样透传），源是**别的格**
// owned=true 的 report 或 settle。第 2、3 参 = baseIndex / switchIndex：
//   - 归因窗口从 **baseIndex** 起算（含 base 之后、selectOption 之前落地的**迟到 echo**——
//     #299 首跑把它切掉，导致「ETH/BNB 被挪走却读出 [换格后无 apply]」的假阴性）；
//   - switchIndex 只用来**分类** apply 落在哪一侧（迟到echo / 换格广播）。
const lineSym = (kind: string, sym: string, extra: Record<string, unknown> = {}) =>
  `debugViewWrites: ${kind} ${JSON.stringify({ sym, ...extra })}`

describe('attributeBroadcasts', () => {
  // 这条是 #299 bug 的回归测试：源在 base 之前发出、apply 在 base 之后落地（迟到 echo）。
  // 旧逻辑把窗口下界设在 selectOption(switchIndex) → 这条 apply 被切掉 → 读成「无 apply / 源不可见」。
  // 新逻辑窗口下界是 baseIndex，源回溯不受 baseIndex 限制 → 抓到并标「迟到echo」。
  // 把窗口下界错设回 switchIndex，这条必须转红。
  it('迟到 echo：源在 base 前、apply 落在 base 与 switch 之间 → 归因并标「迟到echo」', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }), // idx0, base 前
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }), // idx1, base 之后 switch 之前
    ]
    // baseIndex=1（idx0 是 base 之前的写点，apply 在 base 之后）；switchIndex=2（selectOption 之前没新写点）
    expect(attributeBroadcasts(lines, 1, 2)).toBe('广播归因 ETH←BTC report·迟到echo(1000→2000)')
  })

  it('换格广播：apply 落在 switchIndex 之后 → 标「换格广播」', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    // switchIndex=1 ⇒ apply(idx1) 在换格之后
    expect(attributeBroadcasts(lines, 0, 1)).toBe('广播归因 ETH←BTC report·换格广播(1000→2000)')
  })

  it('命中另一格的 settle → 归因 kind 记 settle', () => {
    const lines = [
      lineSym('settle', 'BTCUSDT', { from: 1000, to: 2000 }),
      lineSym('apply', 'BNBUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0, 2)).toBe('广播归因 BNB←BTC settle·迟到echo(1000→2000)')
  })

  // 关键反例：owned=false 的 report（被广播门挡下的上报）**不能**当源——
  // 它落的是本格自己的中间态，没广播出去。去掉 isBroadcastSource 的 owned===true 判据这条必须转红。
  it('owned=false 的 report 不算广播源（挡下的上报不背锅）', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: false, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0, 2)).toBe('广播归因 ETH 源不可见(1000→2000)')
  })

  it('没有匹配源时明写「源不可见」，不猜、不当「没广播」', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 500, to: 900, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0, 2)).toBe('广播归因 ETH 源不可见(1000→2000)')
  })

  // 本格自己的广播不能算成「谁挪了我」的源。去掉 w.sym !== sym 判据这条必须转红。
  it('源格与接收格同一格时不算（自广播不背锅）', () => {
    const lines = [
      lineSym('report', 'ETHUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0, 2)).toBe('广播归因 ETH 源不可见(1000→2000)')
  })

  // 源必须早于该 apply（i < a.idx）。去掉 i < a.idx，让「apply 之后才发生的广播」也能当源这条必须转红。
  it('源必须在 apply 之前（之后的广播不是这条 apply 的因）', () => {
    const lines = [
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }), // apply 之后
    ]
    expect(attributeBroadcasts(lines, 0, 2)).toBe('广播归因 ETH 源不可见(1000→2000)')
  })

  // baseIndex 之前的 apply 不参与归因（那是读取基线时点之前的事，不该被算进「被挪走」）。
  // 把窗口下界从 baseIndex 改成 0，这条必须转红。
  it('baseIndex 之前的 apply 不参与归因', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }), // idx1，base 之前
    ]
    // baseIndex=2 ⇒ idx1 的 apply 被排除 → 无 apply
    expect(attributeBroadcasts(lines, 2, 2)).toBe('广播归因[base 之后无 apply]（baseIndex=2，整段 2 条）')
  })

  it('同一格有多次 apply 时取**末次**的 incoming 窗', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('report', 'SOLUSDT', { from: 3000, to: 4000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
      lineSym('apply', 'ETHUSDT', { extFrom: 3000, extTo: 4000 }),
    ]
    expect(attributeBroadcasts(lines, 0, 4)).toBe('广播归因 ETH←SOL report·迟到echo(3000→4000)')
  })

  it('多个接收格分别归因（长度随种类数，不随事件条数）', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
      lineSym('apply', 'BNBUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0, 3)).toBe('广播归因 ETH←BTC report·迟到echo(1000→2000) | BNB←BTC report·迟到echo(1000→2000)')
  })

  it('base 之后没有任何 apply → 归因空（带上 baseIndex 与总条数）', () => {
    const lines = [lineSym('report', 'BTCUSDT', { from: 1, to: 2, owned: true })]
    expect(attributeBroadcasts(lines, 0, 1)).toBe('广播归因[base 之后无 apply]（baseIndex=0，整段 1 条）')
  })
})

describe('summarizeViewWrites', () => {
  it('空数组说「整段 0 条」而不是空串', () => {
    expect(summarizeViewWrites([])).toBe('写点[整段 0 条]')
  })

  // 这条是整份 helper 的存在理由：只看尾部会把 settle 挤出去
  it('settle 出现在中段时仍然数得出来（slice(-6) 在这里看不到它）', () => {
    const lines = [
      line('report', { from: 100, to: 200, trusted: true }),
      line('settle', { from: 100, to: 200, owned: true, via: 'pointerup' }),
      ...Array.from({ length: 6 }, (_, i) => line('report', { from: 90 - i * 10, to: 190 - i * 10, trusted: true })),
    ]
    const s = summarizeViewWrites(lines)
    expect(s).toContain('settle')
    expect(s).toContain('pointerup×1')
    // 尾部 6 条全在，但 settle 仍被数出来 —— 这就是 slice(-6) 做不到的那件事
    expect(lines.slice(-6).some((l) => l.includes("'settle'"))).toBe(false)
  })

  it('按 kind 计数覆盖整段，不是只数尾部', () => {
    const s = summarizeViewWrites([line('report'), line('report'), line('apply', { owned: true })])
    expect(s).toContain('report×2')
    expect(s).toContain('apply×1')
  })

  it('claim 多于 release 时明说是手势未结束', () => {
    expect(summarizeViewWrites([line('claim', { owned: true })])).toContain('手势未结束')
    expect(summarizeViewWrites([line('claim'), line('release')])).not.toContain('手势未结束')
  })

  it('settle 的 via 分布把 pointerup 与 late-event 分开数', () => {
    const s = summarizeViewWrites([
      line('settle', { via: 'pointerup' }),
      line('settle', { via: 'late-event' }),
      line('settle', { via: 'late-event' }),
    ])
    expect(s).toContain('pointerup×1')
    expect(s).toContain('late-event×2')
  })

  it('给出每格最后一个落点（红的时候直接读谁停在哪）', () => {
    const s = summarizeViewWrites([
      line('report', { sym: 'BTCUSDT', from: 1, to: 2 }),
      line('report', { sym: 'ETHUSDT', from: 3, to: 4 }),
      line('apply', { sym: 'BTCUSDT', from: 9, to: 10, owned: true }),
    ])
    expect(s).toMatch(/末位落点:.*BTC apply from=9 to=10 owned=true/)
    expect(s).toMatch(/ETH report from=3 to=4/)
  })

  // 摘要长度只随「不同 kind / 不同 sym 的个数」增长，不随事件条数增长：
  // 400 条重复 report 压出来的摘要与 4 条的一样短（这正是它能进 CI 判词的原因）
  it('长度不随事件条数增长（同一条重复 400 次与 4 次一样短）', () => {
    const build = (n: number) => summarizeViewWrites(Array.from({ length: n }, () => line('report', { from: 1, to: 2 })))
    const few = build(4)
    const many = build(400)
    const huge = build(4000)
    // 长度只随**位数**变（总数那条 + kind 计数那条），不随事件条数变：
    // 4→400 涨 2+2=4 字，400→4000 涨 1+1=2 字；条数多 1000 倍只多 6 个字
    expect(many.length - few.length).toBe(4)
    expect(huge.length - many.length).toBe(2)
    expect(huge.length - few.length).toBe(6)
    expect(many).toContain('report×400')
    expect(huge).toContain('report×4000')
  })

  it('格子种类足够多时超长，截断且说清截掉多少字', () => {
    const lines = Array.from({ length: 200 }, (_, i) =>
      line('apply', { sym: `SYM${i}USDT`, from: i, to: i + 1, owned: true }),
    )
    const s = summarizeViewWrites(lines)
    expect(s.length).toBeLessThanOrEqual(VIEW_WRITE_SUMMARY_MAX + 20)
    expect(s).toContain('截掉')
  })
})
