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

// 广播归因（#222 下一步）：把「换格之后，谁把哪个窗广播给了接收格」钉死。
// 接收格 apply 带的 extFrom/extTo 是 incoming 原始窗（broadcast 原样透传），源是**别的格**
// owned=true 的 report 或 settle。第二个参数 switchIndex = 换格那一刻已收条数（只看之后的写点，
// 否则 pan 阶段合法的 owned=true report 会污染因果链——正是规则 1「整段计数 ≠ 子窗口事件」那条坑）。
const lineSym = (kind: string, sym: string, extra: Record<string, unknown> = {}) =>
  `debugViewWrites: ${kind} ${JSON.stringify({ sym, ...extra })}`

describe('attributeBroadcasts', () => {
  it('换格后接收格 apply 命中另一格 owned=true 的 report → 归因到那一格', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 ETH←BTC report(1000→2000)')
  })

  it('命中另一格的 settle → 归因 kind 记 settle', () => {
    const lines = [
      lineSym('settle', 'BTCUSDT', { from: 1000, to: 2000 }),
      lineSym('apply', 'BNBUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 BNB←BTC settle(1000→2000)')
  })

  // 关键反例：owned=false 的 report（被广播门挡下的上报）**不能**当源——
  // 它落的是本格自己的中间态，没广播出去。去掉 owned===true 判据这条必须转红。
  it('owned=false 的 report 不算广播源（挡下的上报不背锅）', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: false, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 ETH 源不可见(1000→2000)')
  })

  it('没有匹配源时明写「源不可见」，不猜、不当「没广播」', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 500, to: 900, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 ETH 源不可见(1000→2000)')
  })

  // 本格自己的广播不能算成「谁挪了我」的源。去掉 s.sym !== sym 判据这条必须转红。
  it('源格与接收格同一格时不算（自广播不背锅）', () => {
    const lines = [
      lineSym('report', 'ETHUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 ETH 源不可见(1000→2000)')
  })

  // 这条锁住 switchIndex 的意义：换格**之前** pan 阶段那一格合法 owned=true 的广播，
  // 不能拿去归因换格**之后**接收格的 apply。去掉 slice(switchIndex) 这条必须转红。
  it('换格之前的 owned=true 报告不参与归因（只看 switchIndex 之后）', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }), // 换格前（pan）
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }), // 换格后接收
    ]
    // switchIndex=1 ⇒ 第一条被切掉，换格后只剩 apply、无源 → 源不可见
    expect(attributeBroadcasts(lines, 1)).toBe('广播归因 ETH 源不可见(1000→2000)')
    // switchIndex=0 ⇒ 第一条算源
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 ETH←BTC report(1000→2000)')
  })

  it('同一格有多次 apply 时取**末次**的 incoming 窗', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('report', 'SOLUSDT', { from: 3000, to: 4000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
      lineSym('apply', 'ETHUSDT', { extFrom: 3000, extTo: 4000 }),
    ]
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 ETH←SOL report(3000→4000)')
  })

  it('多个接收格分别归因（长度随种类数，不随事件条数）', () => {
    const lines = [
      lineSym('report', 'BTCUSDT', { from: 1000, to: 2000, owned: true, trusted: true }),
      lineSym('apply', 'ETHUSDT', { extFrom: 1000, extTo: 2000 }),
      lineSym('apply', 'BNBUSDT', { extFrom: 1000, extTo: 2000 }),
    ]
    expect(attributeBroadcasts(lines, 0)).toBe('广播归因 ETH←BTC report(1000→2000) | BNB←BTC report(1000→2000)')
  })

  it('整段（换格后）没有 apply → 归因空', () => {
    expect(attributeBroadcasts([lineSym('report', 'BTCUSDT', { from: 1, to: 2, owned: true })], 0)).toBe('广播归因[换格后无 apply]')
  })

  it('switchIndex 越到末尾（换格后无任何写点）→ 归因空', () => {
    const lines = [lineSym('report', 'BTCUSDT', { from: 1, to: 2, owned: true })]
    expect(attributeBroadcasts(lines, lines.length)).toBe('广播归因[换格后无写点]')
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
