import { describe, expect, it } from 'vitest'
import {
  channelLine,
  createDrawing,
  fibExtPrices,
  fibFanRays,
  fibPrices,
  hitTestDrawings,
  moveAnchor,
  moveDrawing,
  nearestAnchor,
  normalizePoints,
  requiredPoints,
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

describe('normalizePoints（矩形/射线）', () => {
  it('矩形按时间排序（渲染与锚点顺序无关）', () => {
    const pts = normalizePoints('rect', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(0)
    expect(pts[1].time).toBe(100)
  })
  it('射线保持「锚点在前」的原始顺序（方向敏感）', () => {
    const pts = normalizePoints('ray', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(100)
    expect(pts[1].time).toBe(0)
  })
})

describe('hitTestDrawings（矩形/射线）', () => {
  const rect: Drawing = createDrawing('rect', [{ time: 0, price: 150 }, { time: 100, price: 50 }], 'r1')
  // 射线锚点 (0,150) → 方向经 (100,50)，投影后 a=(0,150) b=(100,250)，方向 (100,100)
  const ray: Drawing = createDrawing('ray', [{ time: 0, price: 150 }, { time: 100, price: 50 }], 'r2')

  it('矩形内部/边框命中（区域命中）', () => {
    expect(hitTestDrawings([rect], 50, 200, project)).toBe('r1')
    expect(hitTestDrawings([rect], 50, 152, project)).toBe('r1') // 上边附近
    expect(hitTestDrawings([rect], 50, 248, project)).toBe('r1') // 下边附近
    expect(hitTestDrawings([rect], 98, 200, project)).toBe('r1') // 右边附近
  })
  it('矩形外不命中', () => {
    expect(hitTestDrawings([rect], 120, 200, project)).toBeNull()
    expect(hitTestDrawings([rect], 50, 140, project)).toBeNull()
  })
  it('射线：锚点前方延长线上命中（含线段上）', () => {
    expect(hitTestDrawings([ray], 200, 350, project)).toBe('r2') // t=2 延长线
    expect(hitTestDrawings([ray], 50, 200, project)).toBe('r2') // 线段上
  })
  it('射线：锚点后方不命中（方向敏感）', () => {
    // 锚点 (0,150) 反方向 (-50,100)，距锚点 ~70px
    expect(hitTestDrawings([ray], -50, 100, project)).toBeNull()
  })
  it('射线锚点附近命中', () => {
    expect(hitTestDrawings([ray], 2, 152, project)).toBe('r2')
  })
})

describe('moveDrawing（整线平移）', () => {
  it('所有锚点按时间/价格增量偏移，保留 id/type/text', () => {
    const d: Drawing = { ...trend, text: undefined }
    const moved = moveDrawing(d, 30, -10)
    expect(moved.id).toBe(d.id)
    expect(moved.type).toBe('trend')
    expect(moved.points).toEqual([
      { time: 30, price: 90 },
      { time: 130, price: 40 },
    ])
  })
  it('平移保留两点几何关系（价差/时间差不变）', () => {
    const d = createDrawing('channel', [{ time: 10, price: 100 }, { time: 90, price: 130 }], 'c')
    const moved = moveDrawing(d, 50, 5)
    expect(moved.points[1].price - moved.points[0].price).toBe(30)
    expect(moved.points[1].time - moved.points[0].time).toBe(80)
  })
})

describe('moveAnchor（锚点拖拽）', () => {
  it('普通两点工具按时间重排', () => {
    const d = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 't')
    // 把第二个锚点拖到时间更早的位置 → 重排后它排第一
    const moved = moveAnchor(d, 1, { time: -50, price: 80 })
    expect(moved.points[0]).toEqual({ time: -50, price: 80 })
    expect(moved.points[1]).toEqual({ time: 0, price: 100 })
  })
  it('射线保持锚点顺序（方向敏感）', () => {
    const d = createDrawing('ray', [{ time: 100, price: 50 }, { time: 0, price: 100 }], 'r')
    // 拖第二个锚点（方向点），锚点仍是第一个
    const moved = moveAnchor(d, 1, { time: 30, price: 90 })
    expect(moved.points[0]).toEqual({ time: 100, price: 50 })
    expect(moved.points[1]).toEqual({ time: 30, price: 90 })
  })
  it('水平线单锚点替换', () => {
    const moved = moveAnchor(horizontal, 0, { time: 20, price: 120 })
    expect(moved.points).toEqual([{ time: 20, price: 120 }])
    expect(moved.type).toBe('horizontal')
  })
})

describe('nearestAnchor（锚点命中）', () => {
  // project: x=time, y=300-price
  it('阈值内命中最近的锚点', () => {
    // 趋势线锚点 (0,200) 与 (100,250)；点 (3,202) 距锚点0约 3.6px、距锚点1远
    expect(nearestAnchor(trend, 3, 202, project)).toBe(0)
    // 距锚点1 (100,250) 约 4px
    expect(nearestAnchor(trend, 97, 253, project)).toBe(1)
  })
  it('阈值外不命中', () => {
    // 距两个锚点都 > 8px 的点（线段中点附近）
    expect(nearestAnchor(trend, 50, 225, project)).toBeNull()
  })
  it('投影失败（锚点不可见）跳过', () => {
    expect(nearestAnchor(trend, 0, 200, () => null)).toBeNull()
  })
})

describe('requiredPoints（所需锚点数）', () => {
  it('单点工具：水平线/文本/价格标签', () => {
    expect(requiredPoints('horizontal')).toBe(1)
    expect(requiredPoints('text')).toBe(1)
    expect(requiredPoints('pricelabel')).toBe(1)
  })
  it('两点工具：趋势/通道/斐波那契/矩形/射线/扇形/箭头', () => {
    for (const t of ['trend', 'channel', 'fib', 'rect', 'ray', 'fibfan', 'arrow'] as const) {
      expect(requiredPoints(t)).toBe(2)
    }
  })
  it('三点工具：斐波那契扩展', () => {
    expect(requiredPoints('fibext')).toBe(3)
  })
})

describe('fibExtPrices（斐波那契扩展）', () => {
  it('A=100 → B=200（上升摆幅）', () => {
    const levels = fibExtPrices({ price: 100 }, { price: 200 })
    // 回撤区在 A/B 之间
    const retr = levels.filter((l) => l.level < 1)
    expect(retr.every((l) => l.price > 100 && l.price < 200)).toBe(true)
    // level 1 恰为 B
    expect(levels.find((l) => l.level === 1)?.price).toBe(200)
    // 延伸区在 B 之外且递增
    const ext = levels.filter((l) => l.level >= 1)
    expect(ext.every((l) => l.price >= 200)).toBe(true)
    expect(ext[ext.length - 1].price).toBeCloseTo(200 + 100 * (2.618 - 1))
  })
  it('下跌摆幅（B < A）延伸区在 B 之下', () => {
    const levels = fibExtPrices({ price: 200 }, { price: 100 })
    expect(levels.find((l) => l.level === 1)?.price).toBe(100)
    const ext = levels.filter((l) => l.level >= 1)
    expect(ext.every((l) => l.price <= 100)).toBe(true)
    expect(ext[ext.length - 1].price).toBeCloseTo(100 - 100 * (2.618 - 1))
  })
})

describe('fibFanRays（斐波那契扇形）', () => {
  it('射线方向点 = A + 竖直距离 × 分位', () => {
    const rays = fibFanRays({ time: 0, price: 100 }, { time: 100, price: 200 })
    expect(rays).toHaveLength(6)
    expect(rays[0].level).toBe(0.236)
    expect(rays[0].dir.price).toBeCloseTo(100 + 100 * 0.236)
    expect(rays[rays.length - 1].level).toBe(1)
    expect(rays[rays.length - 1].dir.price).toBe(200)
    expect(rays[0].dir.time).toBe(100)
  })
})

describe('normalizePoints（M14 新工具）', () => {
  it('价格标签只保留一点', () => {
    expect(normalizePoints('pricelabel', [{ time: 1, price: 2 }, { time: 3, price: 4 }])).toHaveLength(1)
  })
  it('箭头保持 A→B 原始顺序（方向敏感）', () => {
    const pts = normalizePoints('arrow', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0]).toEqual({ time: 100, price: 50 })
    expect(pts[1]).toEqual({ time: 0, price: 100 })
  })
  it('斐波那契扇形保持原点在前', () => {
    const pts = normalizePoints('fibfan', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(100)
  })
  it('斐波那契扩展保留 A/B/C 三点顺序', () => {
    const pts = normalizePoints('fibext', [
      { time: 0, price: 100 },
      { time: 50, price: 200 },
      { time: 100, price: 150 },
    ])
    expect(pts).toHaveLength(3)
    expect(pts.map((p) => p.price)).toEqual([100, 200, 150])
  })
})

describe('hitTestDrawings（M14 新工具）', () => {
  // project: x=time, y=300-price
  it('命中箭头（点到线段距离）', () => {
    const d = createDrawing('arrow', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'ar')
    // 线段从 (0,200) 到 (100,250)，中点 (50,225) 在线段上
    expect(hitTestDrawings([d], 50, 225, project)).toBe('ar')
    expect(hitTestDrawings([d], 20, 210, project)).toBe('ar')
    expect(hitTestDrawings([d], 50, 260, project)).toBeNull()
  })
  it('命中斐波那契扇形（射线延长线 + 原点前）', () => {
    const d = createDrawing('fibfan', [{ time: 0, price: 100 }, { time: 100, price: 200 }], 'fan')
    // 分位 0.5 方向点 (100, 200) → 屏幕 (100,100)；原点 (0,200)。射线上一点 (50,150)
    expect(hitTestDrawings([d], 50, 150, project)).toBe('fan')
    // 原点后方不命中（方向敏感）
    expect(hitTestDrawings([d], -20, 210, project)).toBeNull()
  })
  it('命中价格标签（锚点附近框内）', () => {
    const d = createDrawing('pricelabel', [{ time: 50, price: 100 }], 'pl')
    expect(hitTestDrawings([d], 52, 198, project)).toBe('pl')
    expect(hitTestDrawings([d], 100, 198, project)).toBeNull()
  })
  it('命中斐波那契扩展（回撤区水平线 + 延伸区 + C 竖线）', () => {
    const d = createDrawing(
      'fibext',
      [
        { time: 0, price: 100 },
        { time: 100, price: 200 },
        { time: 50, price: 150 },
      ],
      'fe',
    )
    // 回撤区：level 0.5 = 150 → 屏幕 y=150；x=50 在线段横向范围内
    expect(hitTestDrawings([d], 50, 150, project)).toBe('fe')
    // 延伸区：level 1.272 = 200+100*0.272=227.2 → y=72.8；x=120（在 B 右侧）
    expect(hitTestDrawings([d], 120, 73, project)).toBe('fe')
    // C 竖线：C=(50,150) → (50,150) 屏幕；x=52 附近
    expect(hitTestDrawings([d], 52, 150, project)).toBe('fe')
    // 完全在摆幅框外、延伸线也远
    expect(hitTestDrawings([d], -30, 150, project)).toBeNull()
  })
})
