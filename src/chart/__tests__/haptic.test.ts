import { describe, expect, it, vi } from 'vitest'
import { TOUCH_PIN_VIBRATE_MS, vibrateIfSupported } from '../adapter'

describe('vibrateIfSupported（移动端触觉反馈守护）', () => {
  it('无 vibrate（桌面/不支持环境）→ false 不抛错', () => {
    expect(vibrateIfSupported(undefined, 10)).toBe(false)
  })

  it('有 vibrate → 以指定时长调用并返回结果', () => {
    const fn = vi.fn(() => true)
    expect(vibrateIfSupported(fn, 10)).toBe(true)
    expect(fn).toHaveBeenCalledWith(10)
  })

  it('vibrate 抛错（被沙箱禁用）→ 吞掉并返回 false', () => {
    const fn = vi.fn(() => {
      throw new Error('blocked')
    })
    expect(vibrateIfSupported(fn, 10)).toBe(false)
  })

  it('长按钉线震动常量为正且适中的 10ms', () => {
    expect(TOUCH_PIN_VIBRATE_MS).toBeGreaterThan(0)
    expect(TOUCH_PIN_VIBRATE_MS).toBe(10)
  })
})
