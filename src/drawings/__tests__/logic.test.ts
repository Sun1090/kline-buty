import { describe, expect, it } from 'vitest'
import {
  channelLine,
  createDrawing,
  fibExtPrices,
  fibFanRays,
  fibPrices,
  gannFanRays,
  fibTimeLines,
  fibTimeXs,
  hitTestDrawings,
  linearRegression,
  measureInfo,
  moveAnchor,
  moveDrawing,
  nearestAnchor,
  normalizePoints,
  regressionSegments,
  requiredPoints,
  speedLines,
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
  it('两点工具：趋势/通道/斐波那契/矩形/射线/扇形/箭头/椭圆/圆', () => {
    for (const t of ['trend', 'channel', 'fib', 'rect', 'ray', 'fibfan', 'gann', 'arrow', 'ellipse', 'circle', 'arc'] as const) {
      expect(requiredPoints(t)).toBe(2)
    }
  })
  it('三点工具：斐波那契扩展/三角形', () => {
    expect(requiredPoints('fibext')).toBe(3)
    expect(requiredPoints('triangle')).toBe(3)
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

describe('gannFanRays（江恩角度线）', () => {
  it('9 条角度线：倍率 1/8 … 8×1，方向点价格 = A + 竖直摆幅 × 倍率', () => {
    const rays = gannFanRays({ time: 0, price: 100 }, { time: 100, price: 200 })
    expect(rays).toHaveLength(9)
    expect(rays[0]).toMatchObject({ ratio: 1 / 8, label: '1×8' })
    expect(rays[0].dir.price).toBeCloseTo(100 + 100 / 8)
    expect(rays[4]).toMatchObject({ ratio: 1, label: '1×1' })
    expect(rays[4].dir.price).toBe(200) // 1×1 即 A→B 本身
    expect(rays[8]).toMatchObject({ ratio: 8, label: '8×1' })
    expect(rays[8].dir.price).toBe(100 + 100 * 8)
    for (const r of rays) expect(r.dir.time).toBe(100)
  })
  it('下跌摆幅：方向点价格按负摆幅 × 倍率', () => {
    const rays = gannFanRays({ time: 0, price: 200 }, { time: 100, price: 100 })
    expect(rays[4].dir.price).toBe(100)
    expect(rays[8].dir.price).toBe(200 - 100 * 8)
  })
  it('两点交互：createDrawing / moveAnchor 保持 A→B 原始顺序（方向敏感）', () => {
    const d = createDrawing('gann', [{ time: 100, price: 50 }, { time: 0, price: 100 }], 'g1')
    expect(d.points[0]).toEqual({ time: 100, price: 50 })
    expect(d.points[1]).toEqual({ time: 0, price: 100 })
    const moved = moveAnchor(d, 1, { time: 200, price: 300 })
    expect(moved.points[0]).toEqual({ time: 100, price: 50 })
    expect(moved.points[1]).toEqual({ time: 200, price: 300 })
  })
  it('命中任一角度线（双向射线）', () => {
    const d = createDrawing('gann', [{ time: 0, price: 100 }, { time: 100, price: 200 }], 'g1')
    // 原点 (0,200) → 1×1 方向点 (100,100)：屏幕射线 y = 200 - x；射线上点 (50,150) 命中
    expect(hitTestDrawings([d], 50, 150, project)).toBe('g1')
    // 反向延长线：(-50, 250) 在射线上（双向）
    expect(hitTestDrawings([d], -50, 250, project)).toBe('g1')
    // 1×2 射线方向点 (100, 300-100)= 价格 300 → 屏幕 (100,0)；原点 (0,200)。线上点 (50,100)
    expect(hitTestDrawings([d], 50, 100, project)).toBe('g1')
    // 远离所有线
    expect(hitTestDrawings([d], 30, 280, project)).toBeNull()
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

describe('normalizePoints（M20 椭圆/圆）', () => {
  it('圆保持「圆心在前」的原始顺序（半径点在后，方向敏感）', () => {
    const pts = normalizePoints('circle', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0]).toEqual({ time: 100, price: 50 })
    expect(pts[1]).toEqual({ time: 0, price: 100 })
  })
  it('椭圆按时间排序（外接框与锚点顺序无关）', () => {
    const pts = normalizePoints('ellipse', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(0)
    expect(pts[1].time).toBe(100)
  })
})

describe('hitTestDrawings（M20 椭圆/圆）', () => {
  // 椭圆锚点 (0,150)/(100,50) → 屏幕外接框 (0,150)-(100,250)，中心 (50,200) 半径 50
  const ellipse: Drawing = createDrawing('ellipse', [{ time: 0, price: 150 }, { time: 100, price: 50 }], 'el')
  // 圆：圆心 (50,100)→(50,200)，半径点 (90,140)→(90,160)，r=√(40²+40²)≈56.6
  const circle: Drawing = createDrawing('circle', [{ time: 50, price: 100 }, { time: 90, price: 140 }], 'ci')

  it('椭圆内部/边缘命中（区域命中）', () => {
    expect(hitTestDrawings([ellipse], 50, 200, project)).toBe('el') // 中心
    expect(hitTestDrawings([ellipse], 50, 150, project)).toBe('el') // 上边缘
    expect(hitTestDrawings([ellipse], 0, 200, project)).toBe('el') // 左边缘
  })
  it('椭圆外不命中', () => {
    expect(hitTestDrawings([ellipse], 50, 130, project)).toBeNull() // 上方 20px 外
    expect(hitTestDrawings([ellipse], 120, 200, project)).toBeNull() // 右侧 20px 外
  })
  it('圆内部/圆周命中', () => {
    expect(hitTestDrawings([circle], 50, 200, project)).toBe('ci') // 圆心
    expect(hitTestDrawings([circle], 50, 143.4, project)).toBe('ci') // 圆周上（容差内）
  })
  it('圆周外不命中', () => {
    expect(hitTestDrawings([circle], 50, 130, project)).toBeNull() // 距圆心 70px > r+8
  })
})

describe('moveAnchor（M20 椭圆/圆）', () => {
  it('圆拖动半径点后仍保持两点（圆心在前）', () => {
    const d = createDrawing('circle', [{ time: 50, price: 100 }, { time: 90, price: 140 }], 'c')
    const moved = moveAnchor(d, 1, { time: 80, price: 160 })
    expect(moved.points).toHaveLength(2)
    expect(moved.points[0]).toEqual({ time: 50, price: 100 })
    expect(moved.points[1]).toEqual({ time: 80, price: 160 })
  })
  it('圆拖动圆心后仍保持两点', () => {
    const d = createDrawing('circle', [{ time: 50, price: 100 }, { time: 90, price: 140 }], 'c')
    const moved = moveAnchor(d, 0, { time: 30, price: 120 })
    expect(moved.points).toHaveLength(2)
    expect(moved.points[0]).toEqual({ time: 30, price: 120 })
  })
  it('椭圆拖锚点后按时间重排', () => {
    const d = createDrawing('ellipse', [{ time: 0, price: 150 }, { time: 100, price: 50 }], 'e')
    const moved = moveAnchor(d, 1, { time: -50, price: 80 })
    expect(moved.points[0].time).toBe(-50)
  })
})

describe('normalizePoints（M21 三角形/圆弧）', () => {
  it('三角形保留 A/B/C 三点点击顺序（多段点击）', () => {
    const pts = normalizePoints('triangle', [
      { time: 0, price: 150 },
      { time: 100, price: 50 },
      { time: 50, price: 150 },
    ])
    expect(pts).toHaveLength(3)
    expect(pts.map((p) => p.price)).toEqual([150, 50, 150])
  })
  it('圆弧按时间排序（弦与方向无关）', () => {
    const pts = normalizePoints('arc', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(0)
    expect(pts[1].time).toBe(100)
  })
})

describe('hitTestDrawings（M21 三角形/圆弧）', () => {
  // 三角形 A(0,150)/(100,50)/(50,150) → 屏幕 (0,150)/(100,250)/(50,150)
  const triangle: Drawing = createDrawing(
    'triangle',
    [
      { time: 0, price: 150 },
      { time: 100, price: 50 },
      { time: 50, price: 150 },
    ],
    'tr',
  )
  // 圆弧 A(0,100)/(100,100) → 屏幕 (0,200)/(100,200)，中心 (50,200) r=50
  const arc: Drawing = createDrawing('arc', [{ time: 0, price: 100 }, { time: 100, price: 100 }], 'ar')

  it('三角形内部命中（区域命中）', () => {
    expect(hitTestDrawings([triangle], 50, 180, project)).toBe('tr')
    expect(hitTestDrawings([triangle], 50, 200, project)).toBe('tr') // A-B 边中点附近
  })
  it('三角形边缘附近命中', () => {
    expect(hitTestDrawings([triangle], 50, 205, project)).toBe('tr') // 距 A-B 边 ~3.5px
  })
  it('三角形外不命中', () => {
    expect(hitTestDrawings([triangle], 50, 120, project)).toBeNull() // 上方 30px 外
    expect(hitTestDrawings([triangle], 150, 200, project)).toBeNull()
  })
  it('圆弧圆周命中 / 圆心不命中 / 圆周外不命中', () => {
    expect(hitTestDrawings([arc], 50, 150, project)).toBe('ar') // 圆周上
    expect(hitTestDrawings([arc], 50, 250, project)).toBe('ar') // 圆周另一端（容差内）
    expect(hitTestDrawings([arc], 50, 200, project)).toBeNull() // 圆心距圆周 50px
    expect(hitTestDrawings([arc], 50, 130, project)).toBeNull() // 距圆周 20px
  })
})

describe('moveAnchor（M21 三角形/圆弧）', () => {
  it('三角形拖第三锚点后仍三点且顺序不变', () => {
    const d = createDrawing(
      'triangle',
      [
        { time: 0, price: 150 },
        { time: 100, price: 50 },
        { time: 50, price: 150 },
      ],
      't',
    )
    const moved = moveAnchor(d, 2, { time: 60, price: 120 })
    expect(moved.points).toHaveLength(3)
    expect(moved.points[0]).toEqual({ time: 0, price: 150 })
    expect(moved.points[2]).toEqual({ time: 60, price: 120 })
  })
  it('圆弧拖锚点后按时间重排', () => {
    const d = createDrawing('arc', [{ time: 0, price: 100 }, { time: 100, price: 100 }], 'a')
    const moved = moveAnchor(d, 1, { time: -20, price: 90 })
    expect(moved.points[0].time).toBe(-20)
  })
})

describe('fibTimeLines（M27 斐波那契时间线）', () => {
  it('起止端点 0 / 1 恰为 A/B 时间', () => {
    const lines = fibTimeLines({ time: 100 }, { time: 500 })
    expect(lines).toHaveLength(FIB_LEVELS.length)
    expect(lines[0]).toEqual({ level: 0, time: 100 })
    expect(lines[lines.length - 1]).toEqual({ level: 1, time: 500 })
  })
  it('0.5 分位为中点，分位单调递增', () => {
    const lines = fibTimeLines({ time: 1000 }, { time: 2000 })
    const mid = lines.find((l) => l.level === 0.5)
    expect(mid?.time).toBe(1500)
    const times = lines.map((l) => l.time)
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1])
  })
  it('无序输入（B 在 A 之前）也按时间从早到晚', () => {
    const lines = fibTimeLines({ time: 500 }, { time: 100 })
    expect(lines[0]).toEqual({ level: 0, time: 100 })
    expect(lines[lines.length - 1]).toEqual({ level: 1, time: 500 })
  })
  it('间距按 level 精确插值（0.236 / 0.618）', () => {
    const lines = fibTimeLines({ time: 0 }, { time: 1000 })
    expect(lines.find((l) => l.level === 0.236)?.time).toBeCloseTo(236)
    expect(lines.find((l) => l.level === 0.618)?.time).toBeCloseTo(618)
    expect(lines.find((l) => l.level === 0.786)?.time).toBeCloseTo(786)
  })
})

describe('fibTimeXs（M27 屏幕插值）', () => {
  it('0/1 端点即 A/B x，0.5 为中点', () => {
    const xs = fibTimeXs(100, 500)
    expect(xs).toHaveLength(FIB_LEVELS.length)
    expect(xs[0]).toEqual({ level: 0, x: 100 })
    expect(xs[xs.length - 1]).toEqual({ level: 1, x: 500 })
    expect(xs.find((l) => l.level === 0.5)?.x).toBe(300)
  })
  it('B 在左（x 反向）也按左小右大插值', () => {
    const xs = fibTimeXs(500, 100)
    expect(xs[0].x).toBe(100)
    expect(xs[xs.length - 1].x).toBe(500)
    expect(xs.find((l) => l.level === 0.236)?.x).toBeCloseTo(100 + 400 * 0.236)
  })
})

describe('fibtimed（M27）', () => {
  it('两点交互：createDrawing 归一化后按时间排序', () => {
    const d = createDrawing('fibtimed', [{ time: 200, price: 100 }, { time: 0, price: 90 }], 'ft')
    expect(d.points[0].time).toBe(0)
    expect(d.points[1].time).toBe(200)
    expect(d.points).toHaveLength(2)
  })
  it('moveAnchor 拖动后仍按时间重排', () => {
    const d = createDrawing('fibtimed', [{ time: 0, price: 90 }, { time: 200, price: 100 }], 'ft')
    const moved = moveAnchor(d, 1, { time: -50, price: 120 })
    expect(moved.points[0].time).toBe(-50)
    expect(moved.points[1].time).toBe(0)
  })
  it('moveDrawing 整线平移保留两锚点', () => {
    const d = createDrawing('fibtimed', [{ time: 0, price: 90 }, { time: 200, price: 100 }], 'ft')
    const moved = moveDrawing(d, 100, 5)
    expect(moved.points.map((p) => p.time)).toEqual([100, 300])
    expect(moved.points.map((p) => p.price)).toEqual([95, 105])
  })
  it('命中任意一条竖线（水平距离 ±8px）', () => {
    const d = createDrawing('fibtimed', [{ time: 0, price: 100 }, { time: 100, price: 100 }], 'ft')
    // project: x=time。7 条竖线 x = 0, 23.6, 38.2, 50, 61.8, 78.6, 100（任意价格 y 均可命中）
    expect(hitTestDrawings([d], 50, 150, project)).toBe('ft') // 0.5 竖线
    expect(hitTestDrawings([d], 24, 10, project)).toBe('ft') // 0.236 竖线附近
    expect(hitTestDrawings([d], 95, 300, project)).toBe('ft') // 接近 1.0 竖线
    expect(hitTestDrawings([d], 15, 150, project)).toBeNull() // 两线之间且距两侧 >8px
  })
  it('拖动锚点后命中新的竖线位置', () => {
    const d = createDrawing('fibtimed', [{ time: 0, price: 100 }, { time: 100, price: 100 }], 'ft')
    const moved = moveAnchor(d, 1, { time: 50, price: 100 })
    // 区间 [0,50]：竖线 0 / 11.8 / 19.1 / 25 / 30.9 / 39.3 / 50
    expect(hitTestDrawings([moved], 25, 150, project)).toBe('ft')
    expect(hitTestDrawings([moved], 60, 150, project)).toBeNull()
  })
})

describe('polyline（多段折线）', () => {
  it('requiredPoints 为大值（靠双击收尾，不按锚点数自动提交）', () => {
    expect(requiredPoints('polyline')).toBeGreaterThan(10)
  })
  it('normalizePoints 保留全部锚点且顺序不变', () => {
    const d = createDrawing('polyline', [
      { time: 100, price: 100 },
      { time: 200, price: 80 },
      { time: 300, price: 120 },
      { time: 400, price: 90 },
    ])
    expect(d.points).toHaveLength(4)
    expect(d.points.map((p) => p.time)).toEqual([100, 200, 300, 400])
    expect(d.points.map((p) => p.price)).toEqual([100, 80, 120, 90])
  })
  it('命中任一相邻线段（含中间段与顶点附近）', () => {
    const d = createDrawing('polyline', [
      { time: 0, price: 100 },
      { time: 100, price: 100 },
      { time: 200, price: 50 },
    ], 'pl')
    // 第一段 y = 300-100 = 200（水平）
    expect(hitTestDrawings([d], 50, 200, project)).toBe('pl')
    // 第二段（x 100→200, y 200→250）
    expect(hitTestDrawings([d], 150, 225, project)).toBe('pl')
    // 顶点附近
    expect(hitTestDrawings([d], 101, 199, project)).toBe('pl')
    // 远离折线（第一段上方 20px）
    expect(hitTestDrawings([d], 50, 180, project)).toBeNull()
  })
  it('moveAnchor 拖动某个顶点仅移动该点', () => {
    const d = createDrawing('polyline', [
      { time: 0, price: 100 },
      { time: 100, price: 100 },
      { time: 200, price: 50 },
    ], 'pl')
    const moved = moveAnchor(d, 1, { time: 120, price: 90 })
    expect(moved.points.map((p) => p.time)).toEqual([0, 120, 200])
    expect(moved.points.map((p) => p.price)).toEqual([100, 90, 50])
  })
})

describe('measure（量度）', () => {
  it('requiredPoints 为 2（两点手势）', () => {
    expect(requiredPoints('measure')).toBe(2)
  })
  it('normalizePoints 保留 A→B 顺序（涨跌幅带方向符号）', () => {
    const d = createDrawing('measure', [{ time: 100, price: 90 }, { time: 50, price: 100 }])
    expect(d.points.map((p) => p.time)).toEqual([100, 50])
    expect(d.points.map((p) => p.price)).toEqual([90, 100])
  })
  it('measureInfo：上涨差值与百分比', () => {
    const { diff, pct } = measureInfo({ price: 100 }, { price: 110 })
    expect(diff).toBe(10)
    expect(pct).toBeCloseTo(10)
  })
  it('measureInfo：下跌差值与百分比为负', () => {
    const { diff, pct } = measureInfo({ price: 200 }, { price: 150 })
    expect(diff).toBe(-50)
    expect(pct).toBeCloseTo(-25)
  })
  it('measureInfo：零价格兜底不除零', () => {
    const { diff, pct } = measureInfo({ price: 0 }, { price: 5 })
    expect(diff).toBe(5)
    expect(pct).toBe(0)
  })
  it('命中 A→B 线段（含反向拖出的顺序）', () => {
    const d = createDrawing('measure', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'ms')
    // 线段 (0,200)→(100,250)：x=50 处 y=225
    expect(hitTestDrawings([d], 50, 225, project)).toBe('ms')
    expect(hitTestDrawings([d], 50, 195, project)).toBeNull()
    // 反向拖出（B→A）顺序不丢，线段仍可命中
    const rev = createDrawing('measure', [{ time: 100, price: 50 }, { time: 0, price: 100 }], 'ms2')
    expect(hitTestDrawings([rev], 50, 225, project)).toBe('ms2')
  })
  it('moveDrawing 整线平移保留两锚点', () => {
    const d = createDrawing('measure', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'ms')
    const moved = moveDrawing(d, 50, 10)
    expect(moved.points.map((p) => p.time)).toEqual([50, 150])
    expect(moved.points.map((p) => p.price)).toEqual([110, 60])
  })
})

describe('speedLines（速度线）', () => {
  const a = { time: 0, price: 100 }
  const b = { time: 100, price: 50 }
  it('返回 4 条线段：主对角线 + B 竖直线 + 1/3 + 2/3 分位线', () => {
    const segs = speedLines(a, b)
    expect(segs).toHaveLength(4)
    // 主对角线 A→B
    expect(segs[0].from).toEqual(a)
    expect(segs[0].to).toEqual(b)
    // B 竖直线从低价到高价
    expect(segs[1].from).toEqual({ time: 100, price: 50 })
    expect(segs[1].to).toEqual({ time: 100, price: 100 })
  })
  it('1/3 与 2/3 分位在 A→B 价差内等分', () => {
    const segs = speedLines(a, b)
    // 价差 50：1/3 → 66.6667，2/3 → 83.3333（以低价 50 为基准）
    expect(segs[2].from).toEqual(a)
    expect(segs[2].to.time).toBe(100)
    expect(segs[2].to.price).toBeCloseTo(66.6667, 3)
    expect(segs[3].from).toEqual(a)
    expect(segs[3].to.time).toBe(100)
    expect(segs[3].to.price).toBeCloseTo(83.3333, 3)
  })
  it('反向（B 价高于 A）分位基准对称', () => {
    const segs = speedLines({ time: 0, price: 50 }, { time: 100, price: 100 })
    expect(segs[1].from).toEqual({ time: 100, price: 50 })
    expect(segs[1].to).toEqual({ time: 100, price: 100 })
    expect(segs[2].to.price).toBeCloseTo(66.6667, 3)
    expect(segs[3].to.price).toBeCloseTo(83.3333, 3)
  })
  it('normalizePoints 保留 A→B 方向（速度线以 A 为原点）', () => {
    const d = createDrawing('speedlines', [{ time: 100, price: 90 }, { time: 50, price: 100 }])
    expect(d.points.map((p) => p.time)).toEqual([100, 50])
    expect(d.points.map((p) => p.price)).toEqual([90, 100])
  })
  it('requiredPoints 为 2', () => {
    expect(requiredPoints('speedlines')).toBe(2)
  })
  it('命中检测：B 竖直线与 1/3 分位线可命中', () => {
    const d = createDrawing('speedlines', [a, b], 'sl')
    // B 竖直线 x=100（屏幕 y=300-price，price 75 → y=225）
    expect(hitTestDrawings([d], 100, 225, project)).toBe('sl')
    // 1/3 分位线中点：x=50, price=83.3333 → y=216.6667
    expect(hitTestDrawings([d], 50, 216.7, project)).toBe('sl')
    // 远离所有线段
    expect(hitTestDrawings([d], 50, 120, project)).toBeNull()
  })
})

describe('linearRegression（最小二乘回归）', () => {
  it('完美直线：y = 1 + 2x', () => {
    const reg = linearRegression([
      { time: 0, price: 1 },
      { time: 1, price: 3 },
      { time: 2, price: 5 },
    ])
    expect(reg).not.toBeNull()
    expect(reg!.x0).toBe(0)
    expect(reg!.a).toBeCloseTo(1)
    expect(reg!.b).toBeCloseTo(2)
  })
  it('数据不足返回 null', () => {
    expect(linearRegression([{ time: 1, price: 2 }])).toBeNull()
  })
})

describe('regressionSegments（回归通道）', () => {
  const closes = [
    { time: 0, price: 100 },
    { time: 10, price: 110 },
    { time: 20, price: 120 },
  ]
  it('完美上升线：中线=上下轨（σ=0）', () => {
    const segs = regressionSegments({ time: 0, price: 0 }, { time: 20, price: 0 }, closes)
    expect(segs).toHaveLength(3)
    for (const seg of segs) {
      expect(seg.from.time).toBe(0)
      expect(seg.to.time).toBe(20)
      expect(seg.from.price).toBeCloseTo(100)
      expect(seg.to.price).toBeCloseTo(120)
    }
  })
  it('横盘：斜率 0，中线=均值', () => {
    const segs = regressionSegments({ time: 0, price: 0 }, { time: 20, price: 0 }, [
      { time: 0, price: 100 },
      { time: 10, price: 100 },
      { time: 20, price: 100 },
    ])
    expect(segs[0].from.price).toBeCloseTo(100)
    expect(segs[0].to.price).toBeCloseTo(100)
  })
  it('残差标准差正确（σ = sqrt(Σres²/n)）', () => {
    const segs = regressionSegments({ time: 0, price: 0 }, { time: 10, price: 0 }, [
      { time: 0, price: 0 },
      { time: 5, price: 0 },
      { time: 10, price: 6 },
    ])
    // 回归：b=0.6, a=-1 → 中点 2；残差 1/-2/1 → σ=√(6/3)=√2
    expect(segs[0].from.price).toBeCloseTo(-1, 3)
    expect(segs[0].to.price).toBeCloseTo(5, 3)
    const sigma = Math.sqrt(2)
    expect(segs[1].from.price).toBeCloseTo(-1 + sigma, 3)
    expect(segs[2].from.price).toBeCloseTo(-1 - sigma, 3)
  })
  it('窗口外收盘价不参与回归', () => {
    const segs = regressionSegments({ time: 0, price: 0 }, { time: 20, price: 0 }, [
      ...closes,
      { time: 999, price: 9999 },
    ])
    expect(segs[0].to.price).toBeCloseTo(120)
  })
  it('数据不足退回 A→B 直线', () => {
    const segs = regressionSegments({ time: 0, price: 50 }, { time: 10, price: 80 }, [{ time: 5, price: 60 }])
    expect(segs).toHaveLength(1)
    expect(segs[0].from).toEqual({ time: 0, price: 50 })
    expect(segs[0].to).toEqual({ time: 10, price: 80 })
  })
  it('命中检测：中线/上下轨可命中（resolver 提供 K 线回归线段）', () => {
    const d = createDrawing('regchan', [{ time: 0, price: 90 }, { time: 20, price: 110 }], 'rc')
    const segs = regressionSegments(d.points[0], d.points[1], closes)
    // 中线 y=100（屏幕 y=200）
    expect(hitTestDrawings([d], 10, 200, project, () => segs)).toBe('rc')
    // 无 resolver 时退回 A→B 直线：(0,90)→(20,110)，中点 (10,100) → y=200
    expect(hitTestDrawings([d], 10, 200, project)).toBe('rc')
    expect(hitTestDrawings([d], 10, 120, project, () => segs)).toBeNull()
  })
  it('requiredPoints 为 2', () => {
    expect(requiredPoints('regchan')).toBe(2)
  })
})
