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
  /** `release` 的成因：`pointerup` = 手势正常结束；`expired` = 归属 3s 超时兜底 */
  type?: string
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
      type: typeof raw.type === 'string' ? raw.type : undefined,
    }
  } catch {
    return null
  }
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
  //
  // **release 必须按成因分开数**（issue #279 的教训）：`release(pointerup)` 与
  // `release(expired)` 含义相反 —— 前者是手势正常收尾，后者是归属 3s 超时被兜底收回
  // （`OWNED_MAX_MS`）。只数总数时，这两种在判词里长得一模一样，于是「末位 report 是
  // `owned=false`、说明归属在拖动途中被收走了」这个关键线索**读不出来**。
  // #279 第一次用整段摘要时就是这样：只能看到 `claim1/release1`，无法判断那一次 release
  // 是手势结束还是超时兜底，于是分不清是「迁移夺走归属」还是「超时收走归属」。
  const claims = counts.claim ?? 0
  const releaseByType: Record<string, number> = {}
  for (const w of parsed) {
    if (w.kind !== 'release') continue
    const t = w.type ?? '(无 type)'
    releaseByType[t] = (releaseByType[t] ?? 0) + 1
  }
  const releases = counts.release ?? 0
  const releaseBreakdown = Object.entries(releaseByType)
    .map(([t, n]) => `${t}×${n}`)
    .join('+')
  let pairing =
    `claim${claims}/release${releases}${claims > releases ? '(手势未结束!)' : ''}` +
    (releaseBreakdown ? `(${releaseBreakdown})` : '')
  // 归属是否被超时兜底收走过：有 expired 就说明拖动途中归属被收走，末位 report 自然是 owned=false
  if ((releaseByType.expired ?? 0) > 0) {
    pairing += ' ⚠归属曾被超时兜底收回'
  }

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
