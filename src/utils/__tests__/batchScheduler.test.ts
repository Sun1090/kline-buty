import { describe, expect, it, vi } from 'vitest'
import { createBatchScheduler } from '../batchScheduler'

/** 容器持有 rAF 回调，避免 TS 控制流把闭包赋值窄化为 never */
function capturedRaf() {
  const holder: { cb: (() => void) | null } = { cb: null }
  const raf = vi.fn((cb: () => void) => {
    holder.cb = cb
    return 1
  })
  const fire = () => holder.cb?.()
  return { raf, fire }
}

describe('createBatchScheduler（N8 WS 消息批处理）', () => {
  it('同帧多次 schedule 只执行一次', () => {
    const run = vi.fn()
    const { raf, fire } = capturedRaf()
    const s = createBatchScheduler(run, raf, vi.fn())
    s.schedule()
    s.schedule()
    s.schedule()
    expect(run).not.toHaveBeenCalled()
    expect(raf).toHaveBeenCalledTimes(1) // 多次 schedule 只排一次 rAF
    fire()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('flushNow：立即执行挂起任务（不等下一帧）', () => {
    const run = vi.fn()
    const caf = vi.fn()
    const raf = vi.fn(() => 7)
    const s = createBatchScheduler(run, raf, caf)
    s.schedule()
    s.flushNow()
    expect(run).toHaveBeenCalledTimes(1)
    expect(caf).toHaveBeenCalledWith(7)
  })

  it('cancel：取消挂起任务不执行', () => {
    const run = vi.fn()
    const caf = vi.fn()
    const raf = vi.fn(() => 3)
    const s = createBatchScheduler(run, raf, caf)
    s.schedule()
    s.cancel()
    expect(run).not.toHaveBeenCalled()
    expect(caf).toHaveBeenCalledWith(3)
  })

  it('无挂起任务时 flushNow/cancel 不动', () => {
    const run = vi.fn()
    const s = createBatchScheduler(run, vi.fn(() => 1), vi.fn())
    s.flushNow()
    s.cancel()
    expect(run).not.toHaveBeenCalled()
  })

  it('执行后再次 schedule 可再触发（不粘滞）', () => {
    const run = vi.fn()
    const { raf, fire } = capturedRaf()
    const s = createBatchScheduler(run, raf, vi.fn())
    s.schedule()
    fire()
    s.schedule()
    fire()
    expect(run).toHaveBeenCalledTimes(2)
  })
})