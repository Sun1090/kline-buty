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
 *
 * ## 入口计数（2026-10-24 追加，#322 第 11 条）
 *
 * 插桩首战定性「onCommit 从未触发」之后，剩下的问题是**哪个入口吃掉了手势**。
 * adapter 的手势生命周期里有四个可能让一次点击「整段蒸发」的入口，各记一个门控计数，
 * 判词带出后即读出「谁吃的」：
 *  - `down`       —— onPointerDown 进了画线分支（drawingDown 设上）
 *  - `down-null`  —— onPointerDown 在画线分支但 timeAtPixel/priceToCoordinate 返回 null（静默 return）
 *  - `up`         —— onPointerUp 进了提交分支（drawingDown 还在）
 *  - `up-miss`    —— onPointerUp 时 drawingDown 已为 null（被 cancel/capture 丢失清掉 ⇒ 手势蒸发实锤）
 *  - `cancel` / `lost-capture` —— 两个系统取消入口各自触发
 * 判词里 `down=N up=M up-miss=K`：K>0 且 M<N ⇒ 事件被 cancel 族清掉；`down-null>0` ⇒ 点击落在数据区外。
 */
export type DrawingCommitKind =
  | 'commit' | 'state' | 'storage'
  | 'down' | 'down-null' | 'up' | 'up-miss' | 'cancel' | 'lost-capture'
  | 'raw-down'
export function debugDrawingCommitsEnabled(search: string = typeof location === 'undefined' ? '' : location.search): boolean {
  return new URLSearchParams(search).has('debugDrawingCommits')
}

let seq = 0

/** 带 flag 时的日志出口（前缀固定，e2e 按前缀收集；seq 单调递增区分先后） */
export function logDrawingCommit(
  kind: DrawingCommitKind,
  detail: Record<string, unknown>,
  enabled: boolean,
): void {
  if (!enabled) return
  seq += 1
  console.debug(`debugDrawingCommits: ${kind} #${seq} t=${Date.now()} ${JSON.stringify(detail)}`)
}
