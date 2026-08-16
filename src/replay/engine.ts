/**
 * 市场回放引擎（纯逻辑，可单测）：
 * 管理游标在 K 线序列上的推进/跳转，与渲染层完全解耦。
 */
export interface ReplayState {
  cursor: number
  total: number
  playing: boolean
  speed: number
}

export const REPLAY_SPEEDS = [1, 2, 5, 10, 20, 50] as const
export const DEFAULT_REPLAY_SPEED = 5

export function createReplay(total: number, startCursor = 0): ReplayState {
  return { cursor: clampCursor(startCursor, total), total, playing: false, speed: DEFAULT_REPLAY_SPEED }
}

/** 推进播放：返回新的游标位置（到最后一根自动暂停） */
export function tickReplay(state: ReplayState, steps: number): ReplayState {
  if (!state.playing || state.total === 0) return state
  const next = clampCursor(state.cursor + steps, state.total)
  return { ...state, cursor: next, playing: next < state.total - 1 }
}

/** 跳转：前进后退均可 */
export function seekReplay(state: ReplayState, cursor: number): ReplayState {
  return { ...state, cursor: clampCursor(cursor, state.total) }
}

export function setSpeed(state: ReplayState, speed: number): ReplayState {
  return { ...state, speed: REPLAY_SPEEDS.includes(speed as never) ? speed : state.speed }
}

function clampCursor(cursor: number, total: number): number {
  return Math.max(0, Math.min(cursor, Math.max(0, total - 1)))
}
