import { describe, expect, it } from 'vitest'
import { buildSparkPath } from '../../utils/sparkPath'

describe('buildSparkPath', () => {
  it('两点平线：起点到终点直线', () => {
    expect(buildSparkPath([10, 10], 76, 22)).toBe('M0.0,21.0 L76.0,21.0')
  })

  it('多点：y 随值归一化（高值在上，y 小）', () => {
    const d = buildSparkPath([0, 100], 76, 22)
    // 值 0 → y=21；值 100 → y=1（h-1 处为最低值，顶部留 1px 边距）
    expect(d).toContain('M0.0,21.0')
    expect(d).toContain('L76.0,1.0')
  })

  it('等值序列不除零，退化为水平线', () => {
    const d = buildSparkPath([5, 5, 5, 5], 76, 22)
    const ys = [...d.matchAll(/[ML](\d+\.\d+),(\d+\.\d+)/g)].map((m) => Number(m[2]))
    expect(new Set(ys).size).toBe(1)
  })

  it('x 步进均匀（4 点 → 等距 3 段）', () => {
    const d = buildSparkPath([1, 2, 3, 4], 90, 22)
    expect(d).toContain('L30.0,')
    expect(d).toContain('L60.0,')
  })
})
