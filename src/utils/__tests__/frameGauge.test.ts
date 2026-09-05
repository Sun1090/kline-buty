import { describe, expect, it } from 'vitest'
import { FrameGauge, isDropping } from '../frameGauge'

describe('FrameGauge（N14 实时帧丢帧统计）', () => {
  it('期望间隔内连续帧 → 无丢帧', () => {
    const g = new FrameGauge({ expectedMs: 1500 })
    let t = 0
    for (let i = 0; i < 10; i++) {
      g.tick(t)
      t += 1500
    }
    const s = g.stats()
    expect(s.total).toBe(10)
    expect(s.dropped).toBe(0)
    expect(s.rate).toBe(0)
    expect(s.avgInterval).toBe(1500)
  })

  it('间隔超过 2× 期望 → 计丢帧', () => {
    const g = new FrameGauge({ expectedMs: 1000 })
    g.tick(0)
    g.tick(1000)
    g.tick(3000) // 间隔 2000 = 2× 期望，超过容忍（>2× 才算）→ 不丢
    g.tick(5000) // 间隔 2000 = 2×，still not > 2x
    g.tick(9000) // 间隔 4000 > 2× 期望 → 丢帧
    const s = g.stats()
    expect(s.dropped).toBe(1)
  })

  it('窗口滑出丢弃最旧帧（window 内统计）', () => {
    const g = new FrameGauge({ expectedMs: 1000, window: 5 })
    let t = 0
    for (let i = 0; i < 20; i++) {
      g.tick(t)
      t += 1000
    }
    expect(g.stats().total).toBe(5) // 窗口上限
  })

  it('isDropping：>10% 丢帧率判定', () => {
    expect(isDropping({ total: 10, dropped: 2, rate: 0.2, avgInterval: 1000, lastInterval: 1000 })).toBe(true)
    expect(isDropping({ total: 10, dropped: 0, rate: 0, avgInterval: 1000, lastInterval: 1000 })).toBe(false)
    // 帧数太少不判定
    expect(isDropping({ total: 2, dropped: 1, rate: 0.5, avgInterval: 1000, lastInterval: 1000 })).toBe(false)
  })

  it('单帧无统计基准（不抛错）', () => {
    const g = new FrameGauge({ expectedMs: 1000 })
    g.tick(100)
    expect(g.stats().total).toBe(1)
    expect(g.stats().rate).toBe(0)
  })

  it('reset 清空统计', () => {
    const g = new FrameGauge({ expectedMs: 1000 })
    g.tick(0)
    g.tick(4000)
    g.reset()
    expect(g.stats().total).toBe(0)
  })
})