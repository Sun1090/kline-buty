/**
 * N8 消息批处理：同一帧内多次 schedule 合并为一次执行（rAF 节流）。
 *
 * 用途：WS 高频消息（多市场/同帧多条 kline）避免对每个消息各做一次
 * setState + 数组复制 + React 渲染——批处理到下一帧一次性消费。
 * 纯逻辑 + 依赖注入（raf/caf），便于单测。
 */

export interface BatchScheduler {
  /** 排入一次任务（同帧多次合并为一次执行） */
  schedule: () => void
  /** 立即执行挂起任务并清等待（不等下一帧） */
  flushNow: () => void
  /** 取消挂起任务（组件卸载时避免泄漏） */
  cancel: () => void
}

export type Raf = (cb: () => void) => number

/** 缺省 rAF：环境无 requestAnimationFrame（SSR/测试）时退化为宏任务 */
export const DEFAULT_RAF: Raf =
  typeof requestAnimationFrame !== 'undefined'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 16) as unknown as number

export function createBatchScheduler(
  run: () => void,
  raf: Raf = DEFAULT_RAF,
  caf?: (id: number) => void,
): BatchScheduler {
  let id: number | null = null
  let pending = false

  const schedule = () => {
    if (pending) return
    pending = true
    id = raf(() => {
      pending = false
      id = null
      run()
    })
  }

  const flushNow = () => {
    if (!pending) return
    pending = false
    if (id !== null && caf) caf(id)
    id = null
    run()
  }

  const cancel = () => {
    pending = false
    if (id !== null && caf) caf(id)
    id = null
  }

  return { schedule, flushNow, cancel }
}