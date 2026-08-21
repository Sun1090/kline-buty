import { describe, expect, it, vi } from 'vitest'
import { PinchLingeringTracker, TouchDrawingGestureLock, TouchTapTracker } from '../touchGestures'
describe('TouchTapTracker（触屏双击复位会话）', () => {
  it('两次单指轻点且间隔足够近 → 复位', () => {
    const taps = new TouchTapTracker()
    taps.begin({ touchCount: 1, lingering: false })
    expect(taps.shouldReset(1000, 900, 300)).toBe(false)
    taps.begin({ touchCount: 1, lingering: false })
    expect(taps.shouldReset(1100, 900, 300)).toBe(true)
  })
  it('第二次轻点超出双击窗口 → 不复位', () => {
    const taps = new TouchTapTracker()
    taps.begin({ touchCount: 1, lingering: false })
    taps.begin({ touchCount: 1, lingering: false })
    expect(taps.shouldReset(1300, 900, 300)).toBe(false)
  })
  it('双指捏合使会话失效；残留指抬起后的新单指从第一击重新计', () => {
    const taps = new TouchTapTracker()
    taps.begin({ touchCount: 1, lingering: false })
    taps.begin({ touchCount: 2, lingering: false })
    taps.invalidate()
    taps.begin({ touchCount: 1, lingering: false })
    expect(taps.shouldReset(1000, 950, 300)).toBe(false)
    taps.begin({ touchCount: 1, lingering: false })
    expect(taps.shouldReset(1050, 950, 300)).toBe(true)
  })
  it('十字光标保留期的轻点不参与双击', () => {
    const taps = new TouchTapTracker()
    taps.begin({ touchCount: 1, lingering: false })
    taps.begin({ touchCount: 1, lingering: true })
    taps.begin({ touchCount: 1, lingering: false })
    expect(taps.shouldReset(1000, 950, 300)).toBe(false)
  })
  it('拖动或长按钉线后由调用方失效，后续新会话重新计', () => {
    const taps = new TouchTapTracker()
    taps.begin({ touchCount: 1, lingering: false })
    taps.invalidate()
    taps.begin({ touchCount: 1, lingering: false })
    expect(taps.shouldReset(1000, 950, 300)).toBe(false)
  })
})
describe('PinchLingeringTracker（捏合残留单指防护）', () => {
  it('双指先抬起一指后进入防护期；所有手指抬起后清除', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const residue = new PinchLingeringTracker(() => Date.now())
    residue.start(120)
    expect(residue.active).toBe(true)
    vi.advanceTimersByTime(121)
    expect(residue.active).toBe(false)
    residue.start(120)
    residue.clear()
    expect(residue.active).toBe(false)
    vi.useRealTimers()
  })
  it('重复 start 只延长防护期，不会提前结束', () => {
    let clock = 1000
    const residue = new PinchLingeringTracker(() => clock)
    residue.start(50)
    clock += 30
    residue.start(120)
    clock += 120
    expect(residue.active).toBe(false)
    clock += 1
    expect(residue.active).toBe(false)
  })
})

describe('TouchDrawingGestureLock（画线模式手势隔离）', () => {
  it('鼠标模式不锁定触屏平移/捏合', () => {
    const lock = new TouchDrawingGestureLock()
    expect(lock.locked).toBe(false)
    lock.setTool('none')
    expect(lock.locked).toBe(false)
  })

  it('任意非鼠标画线工具锁定；切回鼠标后恢复', () => {
    const lock = new TouchDrawingGestureLock()
    for (const tool of ['trend', 'hray', 'vray'] as const) {
      lock.setTool(tool)
      expect(lock.locked).toBe(true)
    }
    lock.setTool('none')
    expect(lock.locked).toBe(false)
  })
})
