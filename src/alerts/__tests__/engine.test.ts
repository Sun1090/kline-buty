import { describe, expect, it } from 'vitest'
import { createAlert, evaluateAlert, shouldTrigger, isCurrentlyTrue } from '../engine'

const above = createAlert('BTCUSDT', 'above', 65000)
const below = createAlert('BTCUSDT', 'below', 60000)

describe('evaluateAlert', () => {
  it('above：价格到达或超过触发', () => {
    expect(evaluateAlert(above, 64999)).toBe(false)
    expect(evaluateAlert(above, 65000)).toBe(true)
    expect(evaluateAlert(above, 66000)).toBe(true)
  })
  it('below：价格到达或跌破触发', () => {
    expect(evaluateAlert(below, 60001)).toBe(false)
    expect(evaluateAlert(below, 60000)).toBe(true)
    expect(evaluateAlert(below, 59000)).toBe(true)
  })
})

describe('shouldTrigger', () => {
  it('条件满足且未触发 → true', () => {
    expect(shouldTrigger(above, 65000)).toBe(true)
  })
  it('已触发 → false', () => {
    expect(shouldTrigger({ ...above, triggered: true }, 66000)).toBe(false)
  })
  it('条件不满足 → false', () => {
    expect(shouldTrigger(above, 64000)).toBe(false)
  })
})

describe('isCurrentlyTrue', () => {
  it('当前价格仍满足条件', () => {
    expect(isCurrentlyTrue(above, 65100)).toBe(true)
    expect(isCurrentlyTrue(above, 63000)).toBe(false)
  })
})

describe('createAlert', () => {
  it('生成唯一 id、未触发', () => {
    const a = createAlert('ETHUSDT', 'above', 3000)
    expect(a.id).toBeTruthy()
    expect(a.triggered).toBe(false)
    expect(createAlert('E', 'above', 1).id).not.toBe(createAlert('E', 'above', 1).id)
  })
})

describe('边界', () => {
  it('已触发后即使价格继续满足也不重触发', () => {
    const triggered = { ...above, triggered: true }
    expect(shouldTrigger(triggered, 70000)).toBe(false)
    expect(shouldTrigger(triggered, 65000)).toBe(false)
  })

  it('价格恰好等于阈值 → 触发（闭区间）', () => {
    expect(evaluateAlert(above, 65000)).toBe(true)
    expect(evaluateAlert(below, 60000)).toBe(true)
  })

  it('价格越过阈值后回落 → isCurrentlyTrue 反映当前而非历史', () => {
    // above 触发后价格回落到阈值之下
    expect(isCurrentlyTrue(above, 64000)).toBe(false)
    expect(isCurrentlyTrue({ ...above, triggered: true }, 64000)).toBe(false)
    expect(isCurrentlyTrue({ ...above, triggered: true }, 66000)).toBe(true)
  })

  it('below：价格低于阈值触发，高于不触发', () => {
    expect(evaluateAlert(below, 59999.99)).toBe(true)
    expect(evaluateAlert(below, 60000.01)).toBe(false)
  })
})
