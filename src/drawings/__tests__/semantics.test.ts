import { describe, expect, it } from 'vitest'
import { suggestFromDrawings } from '../semantics'
import type { DrawingTool } from '../logic'

describe('suggestFromDrawings（I5 画线语义识别）', () => {
  it('矩形/通道/斐波那契 → 布林带 + RSI（波动区间）', () => {
    for (const t of ['rect', 'channel', 'fib'] as DrawingTool[]) {
      const s = suggestFromDrawings([t])
      expect(s).toEqual({ main: 'boll', sub: 'rsi', rationale: 'semanticsRange' })
    }
  })
  it('趋势/延长/角度线 → EMA + MACD（趋势确认）', () => {
    for (const t of ['trend', 'extended', 'angle'] as DrawingTool[]) {
      const s = suggestFromDrawings([t])
      expect(s).toEqual({ main: 'ema', sub: 'macd', rationale: 'semanticsTrend' })
    }
  })
  it('水平/价格标签 → RSI（支撑阻力）', () => {
    for (const t of ['horizontal', 'pricelabel'] as DrawingTool[]) {
      const s = suggestFromDrawings([t])
      expect(s).toEqual({ sub: 'rsi', rationale: 'semanticsLevels' })
    }
  })
  it('十字/竖直 → KDJ（时间结构）', () => {
    for (const t of ['vertical', 'cross'] as DrawingTool[]) {
      const s = suggestFromDrawings([t])
      expect(s).toEqual({ sub: 'kdj', rationale: 'semanticsTime' })
    }
  })
  it('无识别图形（文字/无）→ null；多种图形优先区间', () => {
    expect(suggestFromDrawings(['text'])).toBeNull()
    expect(suggestFromDrawings([])).toBeNull()
    const s = suggestFromDrawings(['rect', 'trend'])
    expect(s?.main).toBe('boll') // 优先级：区间 > 趋势
  })
})
