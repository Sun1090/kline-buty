import { describe, expect, it } from 'vitest'
import {
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
