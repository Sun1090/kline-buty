// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrawingThumb } from '../thumbnail'
import { thumbnailPath } from '../thumbnailCore'
import { createDrawing } from '../logic'

describe('thumbnailPath（I6 画线缩略图归一化）', () => {
  it('多点折线 → 生成 M/L path', () => {
    const d = createDrawing('trend', [
      { time: 0, price: 100 },
      { time: 100, price: 50 },
    ])
    const { path, single } = thumbnailPath(d)
    expect(single).toBeNull()
    expect(path.startsWith('M')).toBe(true)
    expect(path.split(' ').length).toBe(2) // M x,y L x,y
  })

  it('单点 → single 归一化到画布内', () => {
    const d = createDrawing('horizontal', [{ time: 50, price: 100 }])
    const { path, single } = thumbnailPath(d)
    expect(path.startsWith('M')).toBe(true) // 单点也生成锚点 path
    expect(single).not.toBeNull()
    expect(single!.x).toBeGreaterThanOrEqual(0)
    expect(single!.y).toBeGreaterThanOrEqual(0)
  })

  it('无锚点 → 空 path 与 null single', () => {
    const d = createDrawing('trend', [])
    const r = thumbnailPath(d)
    expect(r.path).toBe('')
    expect(r.single).toBeNull()
  })

  it('同值点不产生 NaN（span 为 0 的兜底）', () => {
    const d = createDrawing('trend', [
      { time: 5, price: 42 },
      { time: 5, price: 42 },
    ])
    const { path } = thumbnailPath(d)
    expect(path).not.toContain('NaN')
  })
})

describe('DrawingThumb（I6 图层缩略图渲染）', () => {
  it('横线单点 → svg 渲染 line', () => {
    const d = createDrawing('horizontal', [{ time: 50, price: 100 }], 'h1')
    render(<DrawingThumb drawing={d} />)
    expect(screen.getByTestId('drawing-thumb-horizontal')).toBeDefined()
    expect(document.querySelector('line')).not.toBeNull()
  })

  it('文字工具 → 单点圆 + T 文字', () => {
    const d = createDrawing('text', [{ time: 50, price: 100, },], 't1')
    render(<DrawingThumb drawing={d} />)
    expect(screen.getByTestId('drawing-thumb-text')).toBeDefined()
    expect(document.querySelector('text')?.textContent).toContain('T')
  })

  it('矩形工具 → rect 区域', () => {
    const d = createDrawing('rect', [
      { time: 0, price: 100 },
      { time: 100, price: 50 },
    ])
    render(<DrawingThumb drawing={d} />)
    expect(document.querySelector('rect')).not.toBeNull()
  })
})
