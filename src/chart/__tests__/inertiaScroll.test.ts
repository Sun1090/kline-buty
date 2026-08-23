import { describe, expect, it } from 'vitest'
import {
  TouchInertiaTracker,
  decayInertiaVelocity,
  horizontalInertiaBars,
  inertiaSettled,
  shouldStartHorizontalInertia,
} from '../inertiaScroll'

describe('TouchInertiaTracker（单指快扫速度）', () => {
  it('向左快扫得到负向水平速度', () => {
    let now = 1000
    const tracker = new TouchInertiaTracker(() => now)
    tracker.reset()
    tracker.move(200, 300)
    now = 1100
    tracker.move(120, 302)
    expect(tracker.release()).toEqual({ x: -800, y: 20 })
  })

  it('只用当前点和最近历史锚点，旧轨迹不会稀释瞬时速度', () => {
    let now = 1000
    const tracker = new TouchInertiaTracker(() => now)
    tracker.reset()
    tracker.move(500, 0)
    now = 1900
    tracker.move(400, 0)
    now = 1935
    tracker.move(340, 0)
    now = 2000
    tracker.move(310, 0)
    // 最近锚点是 65ms 前的 30px 位移；全程慢拖不会稀释瞬时速度。
    expect(tracker.release().x).toBeCloseTo(-30 / 0.065)
  })

  it('零或单样本返回零速度，异常时间戳也安全', () => {
    const tracker = new TouchInertiaTracker(() => 1000)
    tracker.reset()
    expect(tracker.release()).toEqual({ x: 0, y: 0 })
    tracker.move(100, 100)
    expect(tracker.release()).toEqual({ x: 0, y: 0 })
    tracker.move(90, 100)
    expect(tracker.release()).toEqual({ x: 0, y: 0 })
  })

  it('极端速度被钳制，避免异常触摸把视图甩飞', () => {
    let now = 1000
    const tracker = new TouchInertiaTracker(() => now, 6000)
    tracker.reset()
    tracker.move(0, 0)
    now = 1010
    tracker.move(10000, -99999)
    expect(tracker.release()).toEqual({ x: 6000, y: -6000 })
  })
})

describe('横向惯性启动与衰减', () => {
  it('横向快扫启动，纵向为主不启动', () => {
    expect(shouldStartHorizontalInertia({ x: -700, y: 50 }, { minPxPerSecond: 500 })).toBe(true)
    expect(shouldStartHorizontalInertia({ x: -520, y: 520 }, { minPxPerSecond: 500 })).toBe(false)
    expect(shouldStartHorizontalInertia({ x: -499, y: 0 }, { minPxPerSecond: 500 })).toBe(false)
  })

  it('速度按半衰期单调收敛并最终判停', () => {
    let velocity = -1600
    let lastAbs = Math.abs(velocity)
    for (let elapsed = 50; elapsed <= 1500; elapsed += 50) {
      velocity = decayInertiaVelocity(-1600, elapsed)
      expect(Math.abs(velocity)).toBeLessThan(lastAbs)
      lastAbs = Math.abs(velocity)
    }
    expect(inertiaSettled(velocity)).toBe(true)
    expect(inertiaSettled(decayInertiaVelocity(-1600, 0))).toBe(false)
  })

  it('像素位移换算为反向 logical range 位移', () => {
    expect(horizontalInertiaBars(-800, 16, 320, 40)).toBeCloseTo(1.6)
    expect(horizontalInertiaBars(800, 16, 320, 40)).toBeCloseTo(-1.6)
    expect(horizontalInertiaBars(-800, 16, 0, 40)).toBe(0)
    expect(horizontalInertiaBars(-800, 16, 320, 0)).toBe(0)
  })
})
