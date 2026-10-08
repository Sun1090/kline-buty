/**
 * #222 / #279 取证基建：把 `debugViewWrites:` 门控日志压成**整段摘要**。
 *
 * ## 为什么需要它（这是一次自我推翻留下的）
 *
 * 两条 flake 的失败判词里带的是 `viewWrites.slice(-6).join(' ; ')` —— **最后 6 条**。
 * 落定广播发生在 `pointerup` 之后，而它之后每一次可见区间事件（迁移重载、装载收尾、
 * 接收格 `apply` 的回声）都会追加条目，**把 `settle` 挤出这 6 条**。
 * 于是「6 条里没有 settle」被读成「settle 从未执行」——**取样窗口比真实总体小，
 * 拿它断言总体必然出错**。
 *
 * 实测那 6 条全是锚格自己（BTCUSDT）的拖动帧、`from` 单调递减，取样点落在**拖动中段**
 * 而不是手势末尾。所以从判词读出来的任何「某 kind 没出现」都不可信。
 *
 * 另一条路走不通：`gh run view --job <id> --log` **只保留失败输出**，
 * 不含被 gate 掉的 console，所以 CI 侧拿不到全量 —— **取样窗口只能自己先改**。
 *
 * ## 摘要里必须有的四件事
 *
 * 1. **按 kind 计数**（整段，不是尾部）——「有没有」必须能一眼判
 * 2. **每格最后一个落点**（`from`/`to`）——红的时候要能直接读出「谁最后停在哪」
 * 3. **`claim`/`release` 的次数**——归属有没有成对（`claim` 无 `release` = 手势没结束）
 * 4. **`settle` 的条数与 `via`**——`pointerup` 那一次 vs `late-event` 那一次要分得开
 *
 * 摘要必须**有界**（长度上限），否则判词本身会长到 CI 日志被截断 —— 那就又回到了
 * 「读不出结论」的老问题，只是换了个方向。
 */

/** 一条 `debugViewWrites: <kind> {json}` 解析后的形状 */
export interface ViewWrite {
  kind: string
  sym?: string
  owned?: boolean
  trusted?: boolean
  from?: number
  to?: number
  via?: string
  /** `apply` 携带：接收格这次执行的外部指令窗口（**广播源**发出的原始 from/to，未吸附） */
  extFrom?: number
  extTo?: number
  /** `apply` 携带：吸附后落到本格的索引（相对本格数据） */
  fromIdx?: number
  toIdx?: number
  /** `apply` 携带：装载基准偏移 */
  base?: number
}

/** 判词里摘要的最大字符数（超了截断并标出被截掉多少） */
export const VIEW_WRITE_SUMMARY_MAX = 1200

const PREFIX = 'debugViewWrites: '

/** 解析一条日志；不是这个前缀的返回 null（不抛，判词路径不该因为日志噪声炸掉） */
export function parseViewWrite(line: string): ViewWrite | null {
  if (!line.startsWith(PREFIX)) return null
  const rest = line.slice(PREFIX.length)
  const sp = rest.indexOf(' ')
  if (sp < 0) return null
  const kind = rest.slice(0, sp)
  const body = rest.slice(sp + 1)
  try {
    const raw = JSON.parse(body) as Record<string, unknown>
    return {
      kind,
      sym: typeof raw.sym === 'string' ? raw.sym : undefined,
      owned: typeof raw.owned === 'boolean' ? raw.owned : undefined,
      trusted: typeof raw.trusted === 'boolean' ? raw.trusted : undefined,
      from: typeof raw.from === 'number' ? raw.from : undefined,
      to: typeof raw.to === 'number' ? raw.to : undefined,
      via: typeof raw.via === 'string' ? raw.via : undefined,
      extFrom: typeof raw.extFrom === 'number' ? raw.extFrom : undefined,
      extTo: typeof raw.extTo === 'number' ? raw.extTo : undefined,
      fromIdx: typeof raw.fromIdx === 'number' ? raw.fromIdx : undefined,
      toIdx: typeof raw.toIdx === 'number' ? raw.toIdx : undefined,
      base: typeof raw.base === 'number' ? raw.base : undefined,
    }
  } catch {
    return null
  }
}

/**
 * 一次广播的候选源：`report owned=true`（用户在发起格动手，广播门放行，见 `ChartView.tsx:708-713`）
 * 或 `settle`（手势落定那一拍，`ChartView.tsx:485-487`）。两者都带**原始秒**的 from/to，
 * 就是发起格广播出去的那个窗——接收格 `apply` 里看到的 `extFrom/extTo` 与它**逐字相等**
 * （`useChartSync.broadcast` 把 `{from,to}` 原样灌进别的格，见 `src/hooks/useChartSync.ts:14-31`）。
 */
function isBroadcastSource(w: ViewWrite): boolean {
  return (w.kind === 'report' && w.owned === true) || w.kind === 'settle'
}

/**
 * 归因每一个**在 base 快照之后落地的** `apply` 的来源广播，并区分两种成因。
 *
 * 两个锚点（由 spec 分别记 `viewWrites.length`）：
 *  - `baseIndex`：读取「其余三格此刻的窗口」（判词里的 base）**同一时刻**的分界。
 *    这条窗口从 baseIndex 起算，**不是**从 selectOption 起算 ——
 *    因为 #299 首跑读到的 `广播归因[换格后无 apply]` 是**假阴性**：pan 阶段的尾帧
 *    `report owned=true` 会在 base 读完之后、selectOption 之前那几百毫秒里陆续落进
 *    接收格（迟到 echo），把 ETH/BNB 挪走；旧逻辑把这些 apply 切在窗口之外，于是
 *    「明明被挪走了，却读出无 apply」。**窗口必须从 base 那一刻起算，否则漏掉真凶。**
 *  - `switchIndex`：selectOption 那一拍的分界，只用来**分类**每个 apply 落在哪一侧：
 *    `apply` 在 [baseIndex, switchIndex) ⇒ **迟到 echo**（pan 的尾巴，不是换格造成的）；
 *    `apply` 在 [switchIndex, end) ⇒ **换格广播**（selectOption 引发的两拍造成的）。
 *
 * 源广播：`report owned=true`（广播门放行，`ChartView.tsx:708-713`）或 `settle`（落定那一拍，
 * `:485-487`），带的 from/to 与接收格 `apply` 的 `extFrom/extTo` **一字相等**
 * （`useChartSync.broadcast` 原样透传 `{from,to}`，见 `src/hooks/useChartSync.ts:14-31`）。
 * 源可以早于 baseIndex（这正是迟到 echo 的形态：源在 base 前发出、apply 在 base 后落地），
 * 所以**源在全量里按 applyIndex 之前回溯**，不受 baseIndex 限制。
 *
 * 找不到源时写「源不可见」而不是猜——把「读不到」当「没广播」是错的（规则 2）：
 * 可能是被广播门挡下的上报里挑了不该挑的窗，也可能是 externalRange 被别的东西塞进来。
 *
 * 摘要长度只随接收格种类数增长（quad 里 ≤4），不随事件条数增长（规则 1 长度纪律）。
 */
export function attributeBroadcasts(
  lines: readonly string[],
  baseIndex: number,
  switchIndex: number,
): string {
  const parsed = lines.map(parseViewWrite).filter((w): w is ViewWrite => w !== null)
  // 记录每个 apply 在其所属格**最后一次**出现时的索引与 incoming 窗
  const lastApply: Record<string, { idx: number; from?: number; to?: number }> = {}
  for (let i = baseIndex; i < parsed.length; i++) {
    const w = parsed[i]
    if (w.kind === 'apply' && w.sym && w.extFrom !== undefined && w.extTo !== undefined) {
      lastApply[w.sym] = { idx: i, from: w.extFrom, to: w.extTo }
    }
  }
  const receivers = Object.entries(lastApply)
  if (receivers.length === 0) return `广播归因[base 之后无 apply]（baseIndex=${baseIndex}，整段 ${parsed.length} 条）`
  // 源广播：owned=true 的 report 或 settle，全量收集（可早于 baseIndex）
  const sources = parsed
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => isBroadcastSource(w))
  const parts = receivers.map(([sym, a]) => {
    const hit = sources.find(({ w, i }) => i < a.idx && w.sym && w.sym !== sym && w.from === a.from && w.to === a.to)
    const wStr = `${a.from}→${a.to}`
    const r = sym.slice(0, 3)
    if (!hit) return `${r} 源不可见(${wStr})`
    const cause = a.idx < switchIndex ? '迟到echo' : '换格广播'
    return `${r}←${hit.w.sym!.slice(0, 3)} ${hit.w.kind}·${cause}(${wStr})`
  })
  return `广播归因 ${parts.join(' | ')}`
}

/** 整段摘要：kind 计数 + 每格末位落点 + claim/release 配对 + settle 的 via 分布 */
export function summarizeViewWrites(lines: readonly string[]): string {
  const parsed = lines.map(parseViewWrite).filter((w): w is ViewWrite => w !== null)
  if (parsed.length === 0) return '写点[整段 0 条]'

  // ① 按 kind 计数（整段）
  const counts: Record<string, number> = {}
  for (const w of parsed) counts[w.kind] = (counts[w.kind] ?? 0) + 1
  const kinds = Object.entries(counts)
    .map(([k, n]) => `${k}×${n}`)
    .join(' ')

  // ② 每格最后一个落点（红的时候直接读「谁最后停在哪」）
  const lastBySym: Record<string, ViewWrite> = {}
  for (const w of parsed) if (w.sym) lastBySym[w.sym] = w
  const lasts = Object.entries(lastBySym)
    .map(([sym, w]) => `${sym.slice(0, 3)} ${w.kind} from=${w.from} to=${w.to}${w.owned === undefined ? '' : ` owned=${w.owned}`}`)
    .join(' | ')

  // ③ claim / release 配对：claim 多于 release = 手势没结束（归属粘住）
  const claims = counts.claim ?? 0
  const releases = counts.release ?? 0
  const pairing = `claim${claims}/release${releases}${claims > releases ? '(手势未结束!)' : ''}`

  // ④ settle 的 via 分布：`pointerup` 那一拍 vs `late-event` 补的那一拍
  const settleVia = parsed.filter((w) => w.kind === 'settle')
  const via: Record<string, number> = {}
  for (const w of settleVia) via[w.via ?? '(旧写法无 via)'] = (via[w.via ?? '(旧写法无 via)'] ?? 0) + 1
  const settle = settleVia.length === 0 ? 'settle×0' : `settle ${Object.entries(via).map(([k, n]) => `${k}×${n}`).join('+')}`

  // ⑤ 锚格（第一个出现的 sym）自身 owned:true 的条数：拖动途中有没有被放行过
  const anchor = parsed.find((w) => w.sym)?.sym
  const ownedTrue = anchor ? parsed.filter((w) => w.sym === anchor && w.owned === true).length : 0

  const head = `整段${parsed.length}条 ${kinds} | ${pairing} ${settle} | ${anchor?.slice(0, 3) ?? '?'}放行${ownedTrue}次`
  const full = `${head} ‖ 末位落点: ${lasts}`
  if (full.length <= VIEW_WRITE_SUMMARY_MAX) return full
  return `${full.slice(0, VIEW_WRITE_SUMMARY_MAX)}…(截掉 ${full.length - VIEW_WRITE_SUMMARY_MAX} 字)`
}
