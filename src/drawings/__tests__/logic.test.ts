import { describe, expect, it } from 'vitest'
import {
  channelLine,
  createDrawing,
  fibPrices,
  hitTestDrawings,
  normalizePoints,
  FIB_LEVELS,
  type Drawing,
  type Project,
} from '../logic'

/** 简单投影：x = time，y = 300 - price */
const project: Project = (time, price) => ({ x: time, y: 300 - price })

const horizontal: Drawing = createDrawing('horizontal', [{ time: 10, price: 100 }], 'h1')
const trend: Drawing = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 't1')
const fib: Drawing = createDrawing('fib', [{ time: 0, price: 150 }, { time: 100, price: 50 }], 'f1')

describe('normalizePoints', () => {
  it('趋势线按时间排序（先左后右）', () => {
    const pts = normalizePoints('trend', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(0)
    expect(pts[1].time).toBe(100)
  })
  it('水平线只保留一点', () => {
    expect(normalizePoints('horizontal', [{ time: 1, price: 2 }, { time: 3, price: 4 }])).toHaveLength(1)
  })
})

describe('fibPrices', () => {
  it('从高位 150 到低位 50 的分位', () => {
    const prices = fibPrices(150, 50)
    expect(prices).toHaveLength(FIB_LEVELS.length)
    expect(prices[0]).toBe(150)
    expect(prices[prices.length - 1]).toBe(50)
    expect(prices[3]).toBe(100) // 0.5 分位
  })
  it('无序输入也按高低排序', () => {
    const prices = fibPrices(50, 150)
    expect(prices[0]).toBe(150)
  })
})

describe('hitTestDrawings', () => {
  const all = [horizontal, trend, fib]

  it('命中水平线（价格 ±8px）', () => {
    // y = 300-100 = 200
    expect(hitTestDrawings(all, 50, 200, project)).toBe('h1')
    expect(hitTestDrawings(all, 50, 205, project)).toBe('h1')
    expect(hitTestDrawings(all, 50, 210, project)).toBeNull()
  })

  it('命中趋势线（点到线段距离）', () => {
    // 线段 (0,200)-(100,250)，中点 (50,225)
    expect(hitTestDrawings(all, 50, 225, project)).toBe('t1')
    expect(hitTestDrawings(all, 50, 220, project)).toBe('t1')
  })

  it('命中斐波那契（两点附近高度）', () => {
    // 150 → y=150；50 → y=250
    expect(hitTestDrawings(all, 50, 155, project)).toBe('f1')
    expect(hitTestDrawings(all, 50, 245, project)).toBe('f1')
    // 矩形外不命中
    expect(hitTestDrawings(all, 150, 150, project)).toBeNull()
  })

  it('最近优先', () => {
    // 水平线(100) 与 趋势线在 x=50 处 y=225，点 (50, 202) 距水平线 2px、距趋势线 23px
    expect(hitTestDrawings(all, 50, 202, project)).toBe('h1')
  })

  it('投影失败（点不可见）不命中', () => {
    expect(hitTestDrawings(all, 50, 200, () => null)).toBeNull()
  })
})

describe('channelLine（平行通道）', () => {
  it('平行线垂直偏移 = 两点价差', () => {
    const [c, e] = channelLine({ time: 0, price: 100 }, { time: 100, price: 120 })
    expect(c).toEqual({ time: 0, price: 120 })
    expect(e).toEqual({ time: 100, price: 140 })
  })
  it('价差为 0 时收敛为同一条线', () => {
    const [c, e] = channelLine({ time: 0, price: 100 }, { time: 100, price: 100 })
    expect(c.price).toBe(100)
    expect(e.price).toBe(100)
  })
})

describe('normalizePoints（新工具）', () => {
  it('通道按时间排序', () => {
    const pts = normalizePoints('channel', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(0)
    expect(pts[1].time).toBe(100)
  })
  it('文本只保留一点', () => {
    expect(normalizePoints('text', [{ time: 1, price: 2 }, { time: 3, price: 4 }])).toHaveLength(1)
  })
})

describe('hitTestDrawings（通道/文本）', () => {
  const channel: Drawing = createDrawing(
    'channel',
    [{ time: 0, price: 100 }, { time: 100, price: 120 }],
    'c1',
  )
  const text: Drawing = { ...createDrawing('text', [{ time: 50, price: 90 }], 'x1'), text: '备注' }

  it('命中通道基线', () => {
    // 基线 (0,200)-(100,180)，中点 (50,190)
    expect(hitTestDrawings([channel], 50, 190, project)).toBe('c1')
  })
  it('命中通道平行线', () => {
    // 平行线 (0,180)-(100,160)，中点 (50,170)
    expect(hitTestDrawings([channel], 50, 170, project)).toBe('c1')
  })
  it('通道外不命中', () => {
    expect(hitTestDrawings([channel], 50, 150, project)).toBeNull()
  })
  it('命中文本标注（锚点附近框内）', () => {
    // 锚点 (50, 210)
    expect(hitTestDrawings([text], 55, 205, project)).toBe('x1')
  })
  it('文本框外不命中', () => {
    expect(hitTestDrawings([text], 90, 210, project)).toBeNull()
    expect(hitTestDrawings([text], 50, 240, project)).toBeNull()
  })
  it('多工具混合命中最近优先', () => {
    const all = [channel, text]
    // (55, 205) 距文本锚点 ~7px、距通道基线较远 → 文本
    expect(hitTestDrawings(all, 55, 205, project)).toBe('x1')
  })
})
