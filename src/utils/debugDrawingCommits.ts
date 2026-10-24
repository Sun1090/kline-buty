/**
 * #322 诊断插桩的门控开关：URL 带 `?debugDrawingCommits` 时，画线提交链路的三个写点
 * 会向 console 打 `debugDrawingCommits:` 前缀的日志：
 *  1. `commit`   —— adapter 的 `onCommit` 回调触发（带 tool 与锚点数：区分「回调没触发」与「锚点数不足」）
 *  2. `state`    —— `commitDrawing` 执行完（`mutateDrawings` 已把新画线放进 state 队列）
 *  3. `storage`  —— `usePersistedState` 的 effect 把整片 drawings 写进 localStorage
 *
 * 三点各自带单调序号与时间戳，e2e 判词按前缀收集后读「断在哪一段」：
 * 有 commit 无 state = React 层吞了；有 state 无 storage = effect 没跑（页面前一拍被卸载等）；
 * 都有但 e2e 读不到 = 读取时机/键名问题。纯观测面：不开 flag 时零开销（模块级求值一次）。
 */
export function debugDrawingCommitsEnabled(search: string = typeof location === 'undefined' ? '' : location.search): boolean {
  return new URLSearchParams(search).has('debugDrawingCommits')
}

let seq = 0

/** 带 flag 时的日志出口（前缀固定，e2e 按前缀收集；seq 单调递增区分先后） */
export function logDrawingCommit(
  kind: 'commit' | 'state' | 'storage',
  detail: Record<string, unknown>,
  enabled: boolean,
): void {
  if (!enabled) return
  seq += 1
  console.debug(`debugDrawingCommits: ${kind} #${seq} t=${Date.now()} ${JSON.stringify(detail)}`)
}
