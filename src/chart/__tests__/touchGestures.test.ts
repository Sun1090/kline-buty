import { describe, expect, it } from 'vitest'
import { TouchTapTracker } from '../touchGestures'

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
