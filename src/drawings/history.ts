/**
 * 画线撤销/重做历史栈（纯函数、不可变、可测）。
 *
 * 快照为当前交易对的整份画线数组；栈只保存在内存（不随 localStorage 持久化），
 * 因为历史语义与「页面会话内操作序列」绑定，刷新后归零符合直觉。
 *
 * 容量限制 MAX_HISTORY：防止长时间会话中高频编辑（拖拽锚点）导致内存无限增长，
 * 采用「新状态覆盖容量内最旧项」策略（Ring 语义，但保持不可变数组结构）。
 */

/** 单步历史容量上限（含 undo 栈；redo 栈受 undo 栈规模约束） */
export const MAX_HISTORY = 60

export interface DrawingHistory {
  /** 已撤销可回退的历史快照（末位为最近一次变更前状态） */
  past: unknown[][]
  /** 已撤销待重做的快照（末位为最近一次撤销前状态） */
  future: unknown[][]
}

export function createHistory(): DrawingHistory {
  return { past: [], future: [] }
}

export function canUndo(h: DrawingHistory): boolean {
  return h.past.length > 0
}

export function canRedo(h: DrawingHistory): boolean {
  return h.future.length > 0
}

/**
 * 记录一次变更：将「变更前快照」压入 undo 栈，并清空 redo 栈。
 * 返回新历史对象（不可变）；容量满时丢弃最旧快照。
 */
export function pushSnapshot<T>(h: DrawingHistory, before: T[]): DrawingHistory {
  const past = [...h.past, before]
  if (past.length > MAX_HISTORY) past.shift()
  return { past, future: [] }
}

/**
 * 撤销：取 undo 栈顶快照作为目标状态，当前状态压入 redo 栈。
 * 返回 { history, state }；无可撤销时原样返回。
 */
export function undoSnapshot<T>(h: DrawingHistory, current: T[]): { history: DrawingHistory; state: T[] } {
  if (h.past.length === 0) return { history: h, state: current }
  const past = [...h.past]
  const before = past.pop() as T[]
  return {
    history: { past, future: [...h.future, current] },
    state: before,
  }
}

/**
 * 重做：取 redo 栈顶快照作为目标状态，当前状态压入 undo 栈。
 * 返回 { history, state }；无可重做时原样返回。
 */
export function redoSnapshot<T>(h: DrawingHistory, current: T[]): { history: DrawingHistory; state: T[] } {
  if (h.future.length === 0) return { history: h, state: current }
  const future = [...h.future]
  const next = future.pop() as T[]
  return {
    history: { past: [...h.past, current], future },
    state: next,
  }
}

/** 清空历史（交易对切换/清空全部画线时可选调用，避免跨品种污染） */
export function resetHistory(): DrawingHistory {
  return createHistory()
}
