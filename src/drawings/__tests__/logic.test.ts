import { describe, expect, it } from 'vitest'
import {
  channelLine,
  createDrawing,
  cycleLines,
  cycleXs,
  cubicBezierPoints,
  CYCLE_LINE_COUNT,
  DEFAULT_TEXT_FONT_SIZE,
  fibExtPrices,
  fibChannelLevels,
  FIB_CHANNEL_LEVELS,
  distToLine,
  fibFanRays,
  fibPrices,
  gannBoxRect,
  gannBoxSegments,
  gannFanRays,
  fibTimeLines,
  fibTimeXs,
  fibTimeZones,
  fibTimeZoneXs,
  FIB_TIME_ZONE_NUMS,
  followLatestEntry,
  textBoxX,
  groupDrawings,
  toggleGroupHidden,
  toggleGroupLocked,
  hitTestDrawings,
  linearRegression,
  parallelRaySpec,
  widthChannelSpec,
  measureInfo,
  moveAnchor,
  pitchforkMid,
  pitchforkRays,
  wedgeLines,
  moveDrawing,
  nearestAnchor,
  TOUCH_ANCHOR_THRESHOLD_PX,
  normalizePoints,
  regressionSegments,
  requiredPoints,
  speedLines,
  timeRangeXs,
  priceBandYs,
  priceRangeInfo,
  riskRewardRatio,
  trendAngleDeg,
  textHitExtents,
  toggleDrawingHidden,
  toggleDrawingLocked,
  patchDrawing,
  FIB_LEVELS,
  type Drawing,
  type Project,
} from '../logic'

/** 简单投影：x = time，y = 300 - price */
const project: Project = (time, price) => ({ x: time, y: 300 - price })

const horizontal: Drawing = createDrawing('horizontal', [{ time: 10, price: 100 }], 'h1')
const vertical: Drawing = createDrawing('vertical', [{ time: 40, price: 100 }], 'v1')
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
  it('垂直线只保留一点', () => {
    expect(normalizePoints('vertical', [{ time: 1, price: 2 }, { time: 3, price: 4 }])).toHaveLength(1)
  })
  it('垂直线锚点数 = 1', () => {
    expect(requiredPoints('vertical')).toBe(1)
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
  const all = [horizontal, vertical, trend, fib]

  it('命中水平线（价格 ±8px）', () => {
    // y = 300-100 = 200
    expect(hitTestDrawings(all, 50, 200, project)).toBe('h1')
    expect(hitTestDrawings(all, 50, 205, project)).toBe('h1')
    expect(hitTestDrawings(all, 50, 210, project)).toBeNull()
  })

  it('命中垂直线（时间 ±8px）', () => {
    // x = 40；y 取 100 避开 fib 锚点 y=150 的干扰
    expect(hitTestDrawings(all, 40, 100, project)).toBe('v1')
    expect(hitTestDrawings(all, 45, 100, project)).toBe('v1')
    expect(hitTestDrawings(all, 50, 100, project)).toBeNull()
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
  it('多行 + 大字号文本命中框随内容放大', () => {
    const multi: Drawing = {
      ...createDrawing('text', [{ time: 50, price: 90 }], 'm1'),
      text: '关键位\n支撑位',
      fontSize: 20,
      color: '#4e9cf5',
    }
    // 默认（单行 11px）框只有 24×12 半框；多行 20px 后半高应明显增大
    const { halfW, halfH } = textHitExtents(multi)
    expect(halfW).toBeGreaterThan(24)
    expect(halfH).toBeGreaterThan(12)
    // 多行第 2 行（锚点下方 ~20px）仍可命中（旧固定半高 12 会漏掉）
    expect(hitTestDrawings([multi], 50, 232, project)).toBe('m1')
    // 超出放大后命中框则不命中
    expect(hitTestDrawings([multi], 50, 300, project)).toBeNull()
  })
  it('textHitExtents 默认字号/空文本回退下限', () => {
    const plain: Drawing = createDrawing('text', [{ time: 0, price: 0 }], 'p1')
    const { halfW, halfH } = textHitExtents(plain)
    expect(halfW).toBeGreaterThanOrEqual(24)
    expect(halfH).toBeGreaterThanOrEqual(12)
    const big: Drawing = { ...plain, text: 'ABCDEF', fontSize: DEFAULT_TEXT_FONT_SIZE }
    expect(textHitExtents(big).halfW).toBeGreaterThanOrEqual(textHitExtents(plain).halfW)
  })
  it('多工具混合命中最近优先', () => {
    const all = [channel, text]
    // (55, 205) 距文本锚点 ~7px、距通道基线较远 → 文本
    expect(hitTestDrawings(all, 55, 205, project)).toBe('x1')
  })
})

describe('normalizePoints（水平射线）', () => {
  it('保持「锚点在前」的原始顺序（方向敏感）', () => {
    const pts = normalizePoints('hray', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts[0].time).toBe(100)
    expect(pts[1].time).toBe(0)
  })
  it('需要两个锚点', () => {
    expect(requiredPoints('hray')).toBe(2)
  })
})

describe('垂直射线（vray）', () => {
  it('保持「锚点在前」的原始顺序且需要两个锚点', () => {
    const pts = normalizePoints('vray', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(pts.map((p) => p.time)).toEqual([100, 0])
    expect(requiredPoints('vray')).toBe(2)
  })

  it('向下延伸侧命中；锚点上方与远离时间不命中', () => {
    // project: x=time, y=300-price；锚点 (100,250)，第二点在下方 (150,200)
    const vray = createDrawing('vray', [{ time: 100, price: 50 }, { time: 150, price: 100 }], 'v-ray')
    expect(hitTestDrawings([vray], 101, 260, project)).toBe('v-ray')
    expect(hitTestDrawings([vray], 103, 290, project)).toBe('v-ray')
    expect(hitTestDrawings([vray], 99, 240, project)).toBeNull()
    expect(hitTestDrawings([vray], 120, 250, project)).toBeNull()
  })
})

describe('hitTestDrawings（水平射线）', () => {
  // 锚点 (0,150) → 方向点 (100,150)，投影后 y=150；只向 x >= 锚点方向命中
  const hray: Drawing = createDrawing('hray', [{ time: 0, price: 150 }, { time: 100, price: 150 }], 'h-ray')

  it('右侧同价命中', () => {
    expect(hitTestDrawings([hray], 50, 150, project)).toBe('h-ray')
    expect(hitTestDrawings([hray], 200, 152, project)).toBe('h-ray')
  })
  it('锚点后方不命中（方向敏感）', () => {
    expect(hitTestDrawings([hray], -20, 150, project)).toBeNull()
  })
  it('远离价格不命中', () => {
    expect(hitTestDrawings([hray], 50, 180, project)).toBeNull()
  })
})

describe('十字线（cross）', () => {
  it('单锚点保留时间与价格', () => {
    const pts = normalizePoints('cross', [{ time: 80, price: 120 }, { time: 20, price: 90 }])
    expect(pts).toEqual([{ time: 80, price: 120 }])
    expect(requiredPoints('cross')).toBe(1)
  })

  it('横线或纵线附近均可命中，远离两线不命中', () => {
    const d = createDrawing('cross', [{ time: 60, price: 100 }], 'cross')
    // 投影：交点 (60,200)；(66,180) 命中纵线，(40,194) 命中横线
    expect(hitTestDrawings([d], 66, 180, project)).toBe('cross')
    expect(hitTestDrawings([d], 40, 194, project)).toBe('cross')
    expect(hitTestDrawings([d], 100, 130, project)).toBeNull()
  })
})

describe('无限延长线（extended）', () => {
  it('保持两点方向顺序且需要两个锚点', () => {
    const pts = normalizePoints('extended', [{ time: 100, price: 100 }, { time: 0, price: 50 }])
    expect(pts[0]).toEqual({ time: 100, price: 100 })
    expect(pts[1]).toEqual({ time: 0, price: 50 })
    expect(requiredPoints('extended')).toBe(2)
  })

  it('线体两侧延伸均可命中，远离直线不命中', () => {
    const d = createDrawing('extended', [{ time: 0, price: 150 }, { time: 100, price: 50 }], 'ext')
    // 投影后 A=(0,150)、B=(100,250)，直线 y=x+150；x=-20/y=130、x=120/y=270 命中
    expect(hitTestDrawings([d], -20, 130, project)).toBe('ext')
    expect(hitTestDrawings([d], 120, 270, project)).toBe('ext')
    expect(hitTestDrawings([d], 120, 130, project)).toBeNull()
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
  it('回归通道窗口锚点可编辑且保持时间排序', () => {
    const d = createDrawing('regchan', [{ time: 10, price: 100 }, { time: 100, price: 120 }], 'rc')
    const moved = moveAnchor(d, 1, { time: 5, price: 90 })
    expect(moved.points[0]).toEqual({ time: 5, price: 90 })
    expect(moved.points[1]).toEqual({ time: 10, price: 100 })
    const expanded = moveAnchor(d, 1, { time: 150, price: 80 })
    expect(expanded.points[0]).toEqual({ time: 10, price: 100 })
    expect(expanded.points[1]).toEqual({ time: 150, price: 80 })
  })
  it('水平线单锚点替换', () => {
    const moved = moveAnchor(horizontal, 0, { time: 20, price: 120 })
    expect(moved.points).toEqual([{ time: 20, price: 120 }])
    expect(moved.type).toBe('horizontal')
  })
  it('水平通道按价格重排，窗口锚点仍可编辑', () => {
    const d = createDrawing('hchannel', [{ time: 20, price: 120 }, { time: 80, price: 80 }], 'hc')
    // 拖下沿到更高价格后，两点按价格交换；未拖动点的原始 time 随对象保留。
    const moved = moveAnchor(d, 1, { time: 50, price: 140 })
    expect(moved.points[0]).toEqual({ time: 80, price: 80 })
    expect(moved.points[1]).toEqual({ time: 50, price: 140 })
    const expanded = moveAnchor(moved, 0, { time: 110, price: 70 })
    expect(expanded.points[0]).toEqual({ time: 110, price: 70 })
    expect(expanded.points[1]).toEqual({ time: 50, price: 140 })
  })
  it('风险回报三点按时间排序，任一锚点仍可独立编辑', () => {
    const d = createDrawing('rr', [{ time: 10, price: 100 }, { time: 30, price: 80 }, { time: 60, price: 150 }], 'rr')
    const movedStop = moveAnchor(d, 1, { time: 35, price: 75 })
    expect(movedStop.points.map((point) => point.time)).toEqual([10, 35, 60])
    expect(movedStop.points[1]).toEqual({ time: 35, price: 75 })
    const movedTarget = moveAnchor(d, 2, { time: 70, price: 160 })
    expect(movedTarget.points.map((point) => point.time)).toEqual([10, 30, 70])
    expect(movedTarget.points[2]).toEqual({ time: 70, price: 160 })
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
  it('默认阈值保持鼠标精确命中；触屏可显式放宽', () => {
    // 距锚点 0 约 14.4px：超过桌面 8px，但属于手指定位常见误差
    expect(nearestAnchor(trend, 10, 210, project)).toBeNull()
    expect(nearestAnchor(trend, 10, 210, project, TOUCH_ANCHOR_THRESHOLD_PX)).toBe(0)
  })
})

describe('requiredPoints（所需锚点数）', () => {
  it('单点工具：水平线/文本/价格标签', () => {
    expect(requiredPoints('horizontal')).toBe(1)
    expect(requiredPoints('text')).toBe(1)
    expect(requiredPoints('pricelabel')).toBe(1)
  })
  it('两点工具：趋势/通道/斐波那契/矩形/射线/扇形/箭头/椭圆/圆', () => {
    for (const t of ['trend', 'channel', 'fib', 'rect', 'ray', 'fibfan', 'gann', 'arrow', 'ellipse', 'circle', 'arc', 'hchannel'] as const) {
      expect(requiredPoints(t)).toBe(2)
    }
  })
  it('三点工具：斐波那契扩展/三角形', () => {
    expect(requiredPoints('fibext')).toBe(3)
    expect(requiredPoints('triangle')).toBe(3)
  })
  it('五点工具：XABCD 形态/艾略特波浪', () => {
    expect(requiredPoints('xabcd')).toBe(5)
    expect(requiredPoints('elliott')).toBe(5)
  })
})

describe('normalizePoints/hitTest（水平通道/XABCD/艾略特波浪）', () => {
  it('水平通道按价格排序（低价在前）', () => {
    const pts = normalizePoints('hchannel', [{ time: 5, price: 120 }, { time: 9, price: 80 }])
    expect(pts[0].price).toBe(80)
    expect(pts[1].price).toBe(120)
  })
  it('XABCD 保持 X→A→B→C→D 顺序（5 点）', () => {
    const pts = normalizePoints('xabcd', [
      { time: 10, price: 100 }, { time: 30, price: 120 }, { time: 50, price: 90 },
      { time: 70, price: 110 }, { time: 90, price: 95 },
    ])
    expect(pts).toHaveLength(5)
    expect(pts.map((p) => p.time)).toEqual([10, 30, 50, 70, 90])
  })
  it('艾略特波浪截断到 5 点', () => {
    const pts = normalizePoints('elliott', [
      { time: 0, price: 50 }, { time: 10, price: 70 }, { time: 20, price: 60 },
      { time: 30, price: 90 }, { time: 40, price: 80 }, { time: 50, price: 100 },
    ])
    expect(pts).toHaveLength(5)
  })
  it('命中水平通道上下任一条线', () => {
    // 点 (0,80) → y=220；(100,120) → y=180
    const d = createDrawing('hchannel', [{ time: 0, price: 80 }, { time: 100, price: 120 }], 'hc1')
    expect(hitTestDrawings([d], 50, 220, project)).toBe('hc1')
    expect(hitTestDrawings([d], 50, 180, project)).toBe('hc1')
    expect(hitTestDrawings([d], 50, 200, project)).toBeNull()
  })
  it('命中 XABCD 任一连线', () => {
    // X(0,100)→y200, A(40,120)→y180, B(80,90)→y210, C(120,110)→y190, D(160,95)→y205
    const d = createDrawing('xabcd', [
      { time: 0, price: 100 }, { time: 40, price: 120 }, { time: 80, price: 90 },
      { time: 120, price: 110 }, { time: 160, price: 95 },
    ], 'xa1')
    expect(hitTestDrawings([d], 20, 190, project)).toBe('xa1') // XA 段
    expect(hitTestDrawings([d], 100, 200, project)).toBe('xa1') // BC 段
    expect(hitTestDrawings([d], 140, 198, project)).toBe('xa1') // CD 段
    expect(hitTestDrawings([d], 200, 100, project)).toBeNull()
  })
  it('命中艾略特波浪任一连线', () => {
    const d = createDrawing('elliott', [
      { time: 0, price: 80 }, { time: 50, price: 120 }, { time: 100, price: 90 },
      { time: 150, price: 130 }, { time: 200, price: 100 },
    ], 'el1')
    expect(hitTestDrawings([d], 25, 200, project)).toBe('el1') // 1-2 段
    expect(hitTestDrawings([d], 175, 185, project)).toBe('el1') // 4-5 段
    expect(hitTestDrawings([d], 250, 100, project)).toBeNull()
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

describe('gannBox（江恩箱）', () => {
  it('10 条角度线：1×1 双对角 + 四角 1×2/2×1，端点精确', () => {
    const segs = gannBoxSegments({ time: 0, price: 100 }, { time: 100, price: 200 }, project)
    expect(segs).toHaveLength(10)
    // 1×1 主对角线：BL(0,200)→TR(100,100) 与 TL(0,100)→BR(100,200)
    expect(segs[0]).toEqual({ from: { x: 0, y: 200 }, to: { x: 100, y: 100 } })
    expect(segs[1]).toEqual({ from: { x: 0, y: 100 }, to: { x: 100, y: 200 } })
    // 1×2：左下 → 右边中点 (100,150)
    expect(segs[2]).toEqual({ from: { x: 0, y: 200 }, to: { x: 100, y: 150 } })
    // 2×1：左下 → 上边中点 (50,100)
    expect(segs[6]).toEqual({ from: { x: 0, y: 200 }, to: { x: 50, y: 100 } })
  })
  it('矩形范围：按两点投影取 min/max', () => {
    const r = gannBoxRect({ time: 0, price: 100 }, { time: 100, price: 200 }, project)
    expect(r).toEqual({ left: 0, top: 100, right: 100, bottom: 200 })
  })
  it('requiredPoints = 2；两点交互按时间排序（与矩形一致）', () => {
    expect(requiredPoints('gannbox')).toBe(2)
    const d = createDrawing('gannbox', [{ time: 100, price: 50 }, { time: 0, price: 100 }], 'gb1')
    expect(d.points[0]).toEqual({ time: 0, price: 100 })
    expect(d.points[1]).toEqual({ time: 100, price: 50 })
  })
  it('命中：矩形内部区域命中 + 角度线延伸段命中，远离不命中', () => {
    const d = createDrawing('gannbox', [{ time: 0, price: 100 }, { time: 100, price: 200 }], 'gb1')
    // 矩形中心
    expect(hitTestDrawings([d], 50, 150, project)).toBe('gb1')
    // 1×1 对角线上
    expect(hitTestDrawings([d], 25, 175, project)).toBe('gb1')
    // 矩形外贴边（右侧边缘 1px）仍命中
    expect(hitTestDrawings([d], 101, 199, project)).toBe('gb1')
    // 远离矩形与所有线不命中
    expect(hitTestDrawings([d], 150, 125, project)).toBeNull()
    expect(hitTestDrawings([d], 150, 50, project)).toBeNull()
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

describe('贝塞尔曲线（M22）', () => {
  // project: x = time, y = 300 - price
  // A(0,100) → 屏幕 (0,200)；控制点 (50,50) → (50,250)；C(100,100) → (100,200)
  const bezier: Drawing = createDrawing(
    'bezier',
    [
      { time: 0, price: 100 },
      { time: 50, price: 50 },
      { time: 100, price: 100 },
    ],
    'bz',
  )

  it('需要 A/B/C 三点，且保留点击顺序', () => {
    expect(requiredPoints('bezier')).toBe(3)
    const pts = normalizePoints('bezier', [
      { time: 20, price: 120 },
      { time: 0, price: 100 },
      { time: 100, price: 80 },
    ])
    expect(pts.map((p) => p.time)).toEqual([20, 0, 100])
  })

  it('三次贝塞尔采样经过端点并向控制点弯曲', () => {
    const pts = cubicBezierPoints({ x: 0, y: 200 }, { x: 50, y: 250 }, { x: 100, y: 200 }, 48)
    expect(pts[0]).toEqual({ x: 0, y: 200 })
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 200 })
    const mid = pts[Math.floor(pts.length / 2)]
    expect(mid.x).toBeCloseTo(50, 6)
    expect(mid.y).toBeGreaterThan(225)
    expect(mid.y).toBeLessThan(250)
  })

  it('曲线中段可命中，远离曲线不命中', () => {
    expect(hitTestDrawings([bezier], 50, 238, project)).toBe('bz')
    expect(hitTestDrawings([bezier], 50, 200, project)).toBeNull()
    expect(hitTestDrawings([bezier], 50, 290, project)).toBeNull()
  })

  it('moveAnchor 拖动控制点后槽位语义不变（A/C 端点、B 控制点）', () => {
    const moved = moveAnchor(bezier, 1, { time: 60, price: 20 })
    expect(moved.points.map((p) => p.time)).toEqual([0, 60, 100])
    expect(moved.points[1]).toEqual({ time: 60, price: 20 })
    // 端点 A 拖到 C 右侧也不重排：贝塞尔槽位即语义（A→控制→C）
    const movedEnd = moveAnchor(bezier, 0, { time: 200, price: 100 })
    expect(movedEnd.points.map((p) => p.time)).toEqual([200, 50, 100])
  })

  it('moveDrawing 整线平移三点同步偏移', () => {
    const moved = moveDrawing(bezier, 10, -5)
    expect(moved.points).toEqual([
      { time: 10, price: 95 },
      { time: 60, price: 45 },
      { time: 110, price: 95 },
    ])
    expect(moved.id).toBe('bz')
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

describe('fibchannel（斐波那契通道）', () => {
  it('fibChannelLevels：基线 level 0 + 8 条分位平行线（向 B 方向偏移）', () => {
    const levels = fibChannelLevels({ price: 100 }, { price: 200 })
    expect(levels).toHaveLength(1 + FIB_CHANNEL_LEVELS.length)
    expect(levels[0]).toEqual({ level: 0, price: 100 })
    expect(levels.find((l) => l.level === 0.5)?.price).toBe(150)
    expect(levels.find((l) => l.level === 1.618)?.price).toBeCloseTo(100 + 100 * 1.618)
  })
  it('fibChannelLevels：B 低于 A 时偏移为负（向下方延伸）', () => {
    const levels = fibChannelLevels({ price: 200 }, { price: 100 })
    expect(levels.find((l) => l.level === 0.5)?.price).toBe(150)
    expect(levels.find((l) => l.level === 1)?.price).toBe(100)
    expect(levels.find((l) => l.level === 1.618)?.price).toBeCloseTo(200 - 100 * 1.618)
  })
  it('fibChannelLevels：平摆幅时所有线同价（退化）', () => {
    const levels = fibChannelLevels({ price: 100 }, { price: 100 })
    expect(levels.every((l) => l.price === 100)).toBe(true)
  })
  it('normalizePoints 保持 A→B 原始顺序（方向决定平行线偏移侧）', () => {
    const d = createDrawing('fibchannel', [{ time: 200, price: 100 }, { time: 0, price: 200 }], 'fc1')
    expect(d.points[0].time).toBe(200)
    expect(d.points[1].time).toBe(0)
  })
  it('distToLine：无限直线垂直距离', () => {
    // 水平线 y=100
    expect(distToLine(50, 100, { x: 0, y: 100 }, { x: 10, y: 0 })).toBe(0)
    expect(distToLine(50, 105, { x: 0, y: 100 }, { x: 10, y: 0 })).toBe(5)
  })
  it('命中基线或任一条平行分位线（垂距 ±8px）', () => {
    // project: x=time, y=300-price。A=(0,100) B=(100,200)：屏幕 a=(0,200) b=(100,100)，方向 (100,-100)
    // level 0.5 线过 (0,150)：y=150-x；基线过 (0,200)：y=200-x
    const d = createDrawing('fibchannel', [{ time: 0, price: 100 }, { time: 100, price: 200 }], 'fc2')
    expect(hitTestDrawings([d], 50, 150, project)).toBe('fc2') // 基线 (y=200-50=150)
    expect(hitTestDrawings([d], 50, 100, project)).toBe('fc2') // level 0.5 线 (y=150-50=100)
    expect(hitTestDrawings([d], 50, 104, project)).toBe('fc2') // level 0.5 线 4px 内
    expect(hitTestDrawings([d], 50, 250, project)).toBeNull() // 通道外（基线 y=150，距 100px）
  })
})

describe('cycle（周期线）', () => {
  it('cycleLines：以 A 为原点、周期=|B-A|，向右等比延伸 count 根（含 k=0 锚点线）', () => {
    const lines = cycleLines({ time: 100 }, { time: 300 })
    expect(lines).toHaveLength(CYCLE_LINE_COUNT)
    expect(lines[0]).toEqual({ index: 0, time: 100 })
    expect(lines[1]).toEqual({ index: 1, time: 300 })
    expect(lines[2]).toEqual({ index: 2, time: 500 })
    expect(lines[lines.length - 1].time).toBe(100 + 200 * (CYCLE_LINE_COUNT - 1))
  })
  it('cycleLines：B 在 A 左侧时周期取绝对值，仍从 A 向右延伸', () => {
    const lines = cycleLines({ time: 500 }, { time: 300 })
    expect(lines[0].time).toBe(500)
    expect(lines[1].time).toBe(700)
    expect(lines[2].time).toBe(900)
  })
  it('cycleLines：周期为 0 退化为单根线', () => {
    expect(cycleLines({ time: 100 }, { time: 100 })).toEqual([{ index: 0, time: 100 }])
  })
  it('cycleXs：屏幕等比延伸（命中测试）', () => {
    const xs = cycleXs(100, 300, 4)
    expect(xs).toEqual([100, 300, 500, 700])
  })
  it('两点交互：normalizePoints 保持原始顺序（A 为原点，B 只定义周期）', () => {
    const d = createDrawing('cycle', [{ time: 200, price: 100 }, { time: 0, price: 90 }], 'cy1')
    expect(d.points[0].time).toBe(200)
    expect(d.points[1].time).toBe(0)
  })
  it('moveAnchor 拖动锚点后仍保持原始顺序', () => {
    const d = createDrawing('cycle', [{ time: 0, price: 90 }, { time: 200, price: 100 }], 'cy2')
    const moved = moveAnchor(d, 0, { time: 50, price: 80 })
    expect(moved.points[0].time).toBe(50)
    expect(moved.points[1].time).toBe(200)
  })
  it('命中任一条周期竖线（水平距离 ±8px，可命中 A 右侧延伸线）', () => {
    const d = createDrawing('cycle', [{ time: 0, price: 100 }, { time: 100, price: 100 }], 'cy3')
    // 周期 100s → 竖线 x = 0,100,200,…,1100
    expect(hitTestDrawings([d], 0, 150, project)).toBe('cy3') // A 锚点线
    expect(hitTestDrawings([d], 205, 150, project)).toBe('cy3') // 延伸线 200 附近
    expect(hitTestDrawings([d], 1095, 150, project)).toBe('cy3') // 最远延伸线 1100 附近
    expect(hitTestDrawings([d], 50, 150, project)).toBeNull() // 两线之间（距两侧 >8px）
    expect(hitTestDrawings([d], 350, 150, project)).toBeNull() // 距 300/400 均 >8px
  })
  it('周期改变后命中新的竖线位置', () => {
    const d = createDrawing('cycle', [{ time: 0, price: 100 }, { time: 50, price: 100 }], 'cy4')
    // 周期 50s → 竖线 x = 0,50,100,150,…
    expect(hitTestDrawings([d], 150, 150, project)).toBe('cy4')
    expect(hitTestDrawings([d], 120, 150, project)).toBeNull()
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

describe('安德鲁叉 pitchfork（3 锚点）', () => {
  // project: x=time, y=300-price
  const A = { time: 0, price: 100 } // 屏幕 (0, 200)
  const B = { time: 100, price: 200 } // 屏幕 (100, 100)
  const C = { time: 100, price: 0 } // 屏幕 (100, 300)

  it('requiredPoints = 3', () => {
    expect(requiredPoints('pitchfork')).toBe(3)
  })

  it('normalizePoints 保留 A/B/C 三点原始顺序（方向敏感，不做时间排序）', () => {
    const pts = normalizePoints('pitchfork', [
      { time: 100, price: 50 },
      { time: 0, price: 100 },
      { time: 50, price: 200 },
    ])
    expect(pts).toHaveLength(3)
    expect(pts.map((p) => p.price)).toEqual([50, 100, 200])
  })

  it('createDrawing 只保留前 3 点', () => {
    const d = createDrawing('pitchfork', [A, B, C, { time: 200, price: 300 }], 'pf1')
    expect(d.points).toHaveLength(3)
  })

  it('pitchforkRays：中轨 A→B/C 中点；上下轨过 B/C 平行', () => {
    const a = project(A.time, A.price)!
    const b = project(B.time, B.price)!
    const c = project(C.time, C.price)!
    const rays = pitchforkRays(a, b, c)
    expect(rays).toHaveLength(3)
    // 中轨：A → (100, 200)
    expect(rays[0].from).toEqual({ x: 0, y: 200 })
    expect(rays[0].dir).toEqual({ x: 100, y: 200 })
    // 上轨：B → B + (100, 0)
    expect(rays[1].from).toEqual({ x: 100, y: 100 })
    expect(rays[1].dir).toEqual({ x: 200, y: 100 })
    // 下轨：C → C + (100, 0)
    expect(rays[2].from).toEqual({ x: 100, y: 300 })
    expect(rays[2].dir).toEqual({ x: 200, y: 300 })
    // B/C 中点
    expect(pitchforkMid(b, c)).toEqual({ x: 100, y: 200 })
  })

  it('命中：中轨/上轨/下轨任一射线可选中，远离不命中', () => {
    const d = createDrawing('pitchfork', [A, B, C], 'pf1')
    // 本投影下三条射线均为水平：中轨 y=200、上轨 y=100、下轨 y=300
    expect(hitTestDrawings([d], 50, 200, project)).toBe('pf1')
    expect(hitTestDrawings([d], 150, 100, project)).toBe('pf1')
    expect(hitTestDrawings([d], 150, 300, project)).toBe('pf1')
    // 射线非线段：上轨起点（B，x=100）左侧同高度不命中（射线向后截断）
    expect(hitTestDrawings([d], 50, 100, project)).toBeNull()
    // 远离三条射线不命中
    expect(hitTestDrawings([d], 0, 300, project)).toBeNull()
  })
})

describe('楔形 wedge（3 锚点）', () => {
  // project: x=time, y=300-price
  // A(0,100)→屏(0,200)；B(100,150)→屏(100,150)；C(100,50)→屏(100,250)
  const A = { time: 0, price: 100 }
  const B = { time: 100, price: 150 }
  const C = { time: 100, price: 50 }

  it('requiredPoints = 3', () => {
    expect(requiredPoints('wedge')).toBe(3)
  })

  it('normalizePoints 保留 A/B/C 原始顺序（方向敏感，不做时间排序）', () => {
    const pts = normalizePoints('wedge', [
      { time: 100, price: 50 },
      { time: 0, price: 100 },
      { time: 50, price: 200 },
    ])
    expect(pts).toHaveLength(3)
    expect(pts.map((p) => p.price)).toEqual([50, 100, 200])
  })

  it('createDrawing 只保留前 3 点', () => {
    const d = createDrawing('wedge', [A, B, C, { time: 200, price: 300 }], 'wg1')
    expect(d.points).toHaveLength(3)
  })

  it('wedgeLines：下边 A→C、上边 B→C 两条线段', () => {
    const a = project(A.time, A.price)!
    const b = project(B.time, B.price)!
    const c = project(C.time, C.price)!
    const lines = wedgeLines(a, b, c)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual({ from: { x: 0, y: 200 }, to: { x: 100, y: 250 } })
    expect(lines[1]).toEqual({ from: { x: 100, y: 150 }, to: { x: 100, y: 250 } })
  })

  it('命中：任一条边（含收敛点 C 附近）可选中，远离不命中', () => {
    const d = createDrawing('wedge', [A, B, C], 'wg1')
    // 下边 A→C 中点 (50,225) 命中
    expect(hitTestDrawings([d], 50, 225, project)).toBe('wg1')
    // 上边 B→C 竖线 x=100 上 (100,200) 命中
    expect(hitTestDrawings([d], 100, 200, project)).toBe('wg1')
    // 收敛点 C 附近 (101, 250) 命中（容差内）
    expect(hitTestDrawings([d], 101, 250, project)).toBe('wg1')
    // 边外延伸 50px 不命中（线段端点截断）
    expect(hitTestDrawings([d], 150, 250, project)).toBeNull()
    // 上方远处不命中
    expect(hitTestDrawings([d], 50, 100, project)).toBeNull()
  })

  it('moveAnchor 拖第三锚点后仍三点且顺序不变', () => {
    const d = createDrawing('wedge', [A, B, C], 'wg1')
    const moved = moveAnchor(d, 2, { time: 80, price: 60 })
    expect(moved.points).toHaveLength(3)
    expect(moved.points[0]).toEqual(A)
    expect(moved.points[1]).toEqual(B)
    expect(moved.points[2]).toEqual({ time: 80, price: 60 })
  })
})

describe('平行射线/宽度通道（M30 新工具）', () => {
  it('requiredPoints = 3（多点点击收集）', () => {
    expect(requiredPoints('parray')).toBe(3)
    expect(requiredPoints('pchannel')).toBe(3)
  })

  it('normalizePoints 保留 A→B→C 原始点击顺序（方向敏感）', () => {
    const pts = normalizePoints('parray', [
      { time: 0, price: 150 },
      { time: 100, price: 50 },
      { time: 50, price: 100 },
    ])
    expect(pts.map((p) => p.price)).toEqual([150, 50, 100])
    const pts2 = normalizePoints('pchannel', [
      { time: 100, price: 50 },
      { time: 0, price: 150 },
      { time: 40, price: 90 },
    ])
    expect(pts2.map((p) => p.price)).toEqual([50, 150, 90])
  })

  it('parallelRaySpec：射线从 C 出发、方向 = B−A', () => {
    const a = { x: 0, y: 150 }
    const b = { x: 100, y: 250 }
    const c = { x: 50, y: 200 }
    const spec = parallelRaySpec(a, b, c)
    expect(spec.helperFrom).toEqual(a)
    expect(spec.helperTo).toEqual(b)
    expect(spec.rayFrom).toEqual(c)
    expect(spec.rayDir).toEqual({ x: 150, y: 300 }) // C + (B−A) = (50+100, 200+100)
  })

  it('widthChannelSpec：两平行线分别过 A/C，方向 = B−A；宽度连线 B→C', () => {
    const a = { x: 0, y: 150 }
    const b = { x: 100, y: 250 }
    const c = { x: 30, y: 210 }
    const spec = widthChannelSpec(a, b, c)
    expect(spec.lineA.p0).toEqual(a)
    expect(spec.lineA.dir).toEqual({ x: 100, y: 100 })
    expect(spec.lineC.p0).toEqual(c)
    expect(spec.lineC.dir).toEqual({ x: 100, y: 100 })
    expect(spec.widthFrom).toEqual(b)
    expect(spec.widthTo).toEqual(c)
  })

  it('hitTest 平行射线：射线垂距命中 / 方向参考段命中 / 射线后方远处不命中', () => {
    // A(0,150) B(100,50) C(50,100) → 屏幕 (0,150)/(100,250)/(50,200)，方向 (1,1)，射线从 (50,200) 沿 (1,1)
    const d = createDrawing(
      'parray',
      [
        { time: 0, price: 150 },
        { time: 100, price: 50 },
        { time: 50, price: 100 },
      ],
      'pr1',
    )
    expect(hitTestDrawings([d], 55, 195, project)).toBe('pr1') // 射线垂距 ~7px（(55,195) 到过 (50,200) 方向 (1,1)）
    expect(hitTestDrawings([d], 10, 155, project)).toBe('pr1') // 方向参考段 A→B 附近
    expect(hitTestDrawings([d], 10, 140, project)).toBeNull() // 射线起点后方（t<0）且距参考段 >8px
  })

  it('hitTest 宽度通道：两平行线任一条垂距命中 / 宽度连线命中 / 远处不命中', () => {
    // A(0,150) B(100,50) C(30,90) → 屏幕 (0,150)/(100,250)/(30,210)，方向 (1,1)
    const d = createDrawing(
      'pchannel',
      [
        { time: 0, price: 150 },
        { time: 100, price: 50 },
        { time: 30, price: 90 },
      ],
      'pc1',
    )
    expect(hitTestDrawings([d], 10, 160, project)).toBe('pc1') // 过 A 线附近 (10,160) 距 (0,150)+dir(1,1) ~7px
    expect(hitTestDrawings([d], 40, 220, project)).toBe('pc1') // 过 C 线附近 (40,220) 距 (30,210)+dir(1,1) ~7px
    expect(hitTestDrawings([d], 60, 235, project)).toBe('pc1') // B→C 宽度连线中点附近
    expect(hitTestDrawings([d], 200, 120, project)).toBeNull() // 远处不命中
  })

  it('moveAnchor 拖第三锚点后仍三点且顺序不变', () => {
    const d = createDrawing(
      'pchannel',
      [
        { time: 0, price: 150 },
        { time: 100, price: 50 },
        { time: 30, price: 90 },
      ],
      'pc1',
    )
    const moved = moveAnchor(d, 2, { time: 80, price: 60 })
    expect(moved.points).toHaveLength(3)
    expect(moved.points[2]).toEqual({ time: 80, price: 60 })
  })
})

describe('趋势角度 / 时间区间（M 新工具）', () => {
  it('trendAngleDeg：水平 0° / 右上 45° / 右下 −45° / 竖直 ±90°', () => {
    expect(trendAngleDeg({ x: 0, y: 100 }, { x: 100, y: 100 })).toBeCloseTo(0)
    expect(trendAngleDeg({ x: 0, y: 100 }, { x: 100, y: 0 })).toBeCloseTo(45) // 屏幕右上 = 上涨
    expect(trendAngleDeg({ x: 0, y: 100 }, { x: 100, y: 200 })).toBeCloseTo(-45) // 屏幕右下 = 下跌
    expect(trendAngleDeg({ x: 0, y: 100 }, { x: 0, y: 0 })).toBeCloseTo(90)
    expect(trendAngleDeg({ x: 0, y: 100 }, { x: 0, y: 200 })).toBeCloseTo(-90)
  })

  it('timeRangeXs：左小右大（无序输入归一）', () => {
    expect(timeRangeXs(80, 20)).toEqual({ left: 20, right: 80 })
    expect(timeRangeXs(20, 80)).toEqual({ left: 20, right: 80 })
  })

  it('requiredPoints：趋势角度/时间区间均为两点', () => {
    expect(requiredPoints('angle')).toBe(2)
    expect(requiredPoints('timerange')).toBe(2)
  })

  it('normalizePoints：趋势角度/时间区间均按时间排序（先左后右）', () => {
    const a = normalizePoints('angle', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(a[0].time).toBe(0)
    expect(a[1].time).toBe(100)
    const b = normalizePoints('timerange', [{ time: 100, price: 50 }, { time: 0, price: 100 }])
    expect(b[0].time).toBe(0)
    expect(b[1].time).toBe(100)
  })

  it('createDrawing / moveAnchor 保持两点', () => {
    const d = createDrawing('angle', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'a1')
    expect(d.points).toHaveLength(2)
    const moved = moveAnchor(d, 1, { time: 120, price: 40 })
    expect(moved.points).toHaveLength(2)
    expect(moved.points[1]).toEqual({ time: 120, price: 40 })
    const t = createDrawing('timerange', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 't1')
    expect(t.points).toHaveLength(2)
  })

  it('hitTest 趋势角度：线段命中 / 远处不命中', () => {
    // A(0,100) B(100,50) → 屏幕 (0,200)/(100,250)
    const d = createDrawing('angle', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'a2')
    expect(hitTestDrawings([d], 50, 225, project)).toBe('a2') // 线段中点
    expect(hitTestDrawings([d], 50, 190, project)).toBeNull() // 距线段 35px
  })

  it('hitTest 时间区间：带内任意位置区域命中 / 边框外按水平距离 / 远处不命中', () => {
    // A(0,100) B(100,50) → 屏幕 (0,200)/(100,250)，竖带 [0,100]
    const d = createDrawing('timerange', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'tr1')
    expect(hitTestDrawings([d], 50, 999, project)).toBe('tr1') // 带内任意 y
    expect(hitTestDrawings([d], 0, 200, project)).toBe('tr1') // 左边框
    expect(hitTestDrawings([d], 100, 250, project)).toBe('tr1') // 右边框
    expect(hitTestDrawings([d], 104, 225, project)).toBe('tr1') // 右侧 4px 内
    expect(hitTestDrawings([d], 140, 225, project)).toBeNull() // 距边框 40px
  })
})

describe('价格带（pband，时间区间的横向孪生）', () => {
  it('priceBandYs：上小下大（无序输入归一）', () => {
    expect(priceBandYs(250, 200)).toEqual({ top: 200, bottom: 250 })
    expect(priceBandYs(200, 250)).toEqual({ top: 200, bottom: 250 })
  })

  it('requiredPoints：价格带为两点', () => {
    expect(requiredPoints('pband')).toBe(2)
  })

  it('normalizePoints：价格带按价格排序（低价在前）', () => {
    const a = normalizePoints('pband', [{ time: 0, price: 120 }, { time: 100, price: 80 }])
    expect(a[0].price).toBe(80)
    expect(a[1].price).toBe(120)
    const b = normalizePoints('pband', [{ time: 100, price: 80 }, { time: 0, price: 120 }])
    expect(b[0].price).toBe(80)
    expect(b[1].price).toBe(120)
  })

  it('createDrawing / moveAnchor 保持两点并按价重排', () => {
    const d = createDrawing('pband', [{ time: 0, price: 120 }, { time: 100, price: 80 }], 'pb1')
    expect(d.points).toHaveLength(2)
    expect(d.points[0].price).toBe(80)
    expect(d.points[1].price).toBe(120)
    const moved = moveAnchor(d, 1, { time: 100, price: 130 })
    expect(moved.points).toHaveLength(2)
    expect(moved.points[0].price).toBe(80)
    expect(moved.points[1].price).toBe(130)
  })

  it('moveAnchor 拖高价锚点到低价之下时自动交换，仍保持价格升序', () => {
    const d = createDrawing('pband', [{ time: 0, price: 100 }, { time: 100, price: 140 }], 'pb3')
    const moved = moveAnchor(d, 1, { time: 100, price: 80 })
    expect(moved.points).toHaveLength(2)
    expect(moved.points[0]).toEqual({ time: 100, price: 80 })
    expect(moved.points[1]).toEqual({ time: 0, price: 100 })
    expect(moved.points[0].price).toBeLessThan(moved.points[1].price)
  })

  it('hitTest 价格带：带内任意位置区域命中 / 边框外按竖直距离 / 远处不命中', () => {
    // A(0,120) B(100,80) → 屏幕 (0,180)/(100,220)，水平带 [180,220]（屏幕 y 向下）
    const d = createDrawing('pband', [{ time: 0, price: 120 }, { time: 100, price: 80 }], 'pb2')
    expect(hitTestDrawings([d], 999, 200, project)).toBe('pb2') // 带内任意 x
    expect(hitTestDrawings([d], 0, 180, project)).toBe('pb2') // 上边框
    expect(hitTestDrawings([d], 100, 220, project)).toBe('pb2') // 下边框
    expect(hitTestDrawings([d], 50, 224, project)).toBe('pb2') // 下侧 4px 内
    expect(hitTestDrawings([d], 50, 260, project)).toBeNull() // 距边框 40px
  })
})


describe('价格区间框（pricerange）', () => {
  it('priceRangeInfo：低价/高价/价差/涨幅归一，不依赖锚点顺序', () => {
    expect(priceRangeInfo({ price: 120 }, { price: 80 })).toEqual({ low: 80, high: 120, diff: 40, pct: 50 })
    expect(priceRangeInfo({ price: 80 }, { price: 120 })).toEqual({ low: 80, high: 120, diff: 40, pct: 50 })
  })

  it('requiredPoints：价格区间框为两点', () => {
    expect(requiredPoints('pricerange')).toBe(2)
  })

  it('normalizePoints：按价格排序（低价在前），时间保持各自锚点', () => {
    const a = normalizePoints('pricerange', [{ time: 100, price: 120 }, { time: 20, price: 80 }])
    expect(a[0]).toEqual({ time: 20, price: 80 })
    expect(a[1]).toEqual({ time: 100, price: 120 })
    const b = normalizePoints('pricerange', [{ time: 20, price: 80 }, { time: 100, price: 120 }])
    expect(b[0].price).toBe(80)
    expect(b[1].price).toBe(120)
  })

  it('createDrawing / moveAnchor 保持两点；拖高价到低价之下自动交换', () => {
    const d = createDrawing('pricerange', [{ time: 0, price: 120 }, { time: 100, price: 80 }], 'pr1')
    expect(d.points).toHaveLength(2)
    expect(d.points[0]).toEqual({ time: 100, price: 80 })
    expect(d.points[1]).toEqual({ time: 0, price: 120 })
    const moved = moveAnchor(d, 1, { time: 30, price: 70 })
    expect(moved.points).toHaveLength(2)
    expect(moved.points[0]).toEqual({ time: 30, price: 70 })
    expect(moved.points[1]).toEqual({ time: 100, price: 80 })
  })

  it('hitTest 价格区间框：内部区域命中 / 外部按最短距离 / 远处不命中', () => {
    // A/B 归一后 (100,80)/(0,120) → 屏幕 (100,220)/(0,180)，矩形 [0,100]×[180,220]
    const d = createDrawing('pricerange', [{ time: 0, price: 120 }, { time: 100, price: 80 }], 'pr2')
    expect(hitTestDrawings([d], 50, 200, project)).toBe('pr2') // 内部
    expect(hitTestDrawings([d], 0, 180, project)).toBe('pr2') // 左上角
    expect(hitTestDrawings([d], 100, 220, project)).toBe('pr2') // 右下角
    expect(hitTestDrawings([d], 104, 200, project)).toBe('pr2') // 右侧 4px 内
    expect(hitTestDrawings([d], 140, 260, project)).toBeNull() // 远处
  })
})


describe('斐波那契时间区间（fibtz）', () => {
  it('FIB_TIME_ZONE_NUMS：斐波那契倍数（1,2,3,5,8,13,21,34,55）', () => {
    expect(FIB_TIME_ZONE_NUMS[0]).toBe(1)
    expect(FIB_TIME_ZONE_NUMS[1]).toBe(2)
    expect(FIB_TIME_ZONE_NUMS[2]).toBe(3)
    expect(FIB_TIME_ZONE_NUMS[3]).toBe(5)
    expect(FIB_TIME_ZONE_NUMS[8]).toBe(55)
  })

  it('fibTimeZones：A 为原点、span=|B.time-A.time| 向右等比延伸', () => {
    // A(100) B(110) → span=10 → 分界时间 = 100 + 10*n
    const lines = fibTimeZones({ time: 100 }, { time: 110 })
    expect(lines).toHaveLength(FIB_TIME_ZONE_NUMS.length)
    expect(lines[0]).toEqual({ n: 1, time: 110 })
    expect(lines[1]).toEqual({ n: 2, time: 120 })
    expect(lines[3]).toEqual({ n: 5, time: 150 })
    expect(lines[8]).toEqual({ n: 55, time: 650 })
  })

  it('fibTimeZones：B 在 A 左侧时 span 取绝对值，仍向 A 右侧延伸', () => {
    const lines = fibTimeZones({ time: 100 }, { time: 90 })
    expect(lines[1]).toEqual({ n: 2, time: 120 })
  })

  it('fibTimeZones：退化（span=0）分界时间全部等于 A', () => {
    const lines = fibTimeZones({ time: 100 }, { time: 100 })
    expect(lines.every((l) => l.time === 100)).toBe(true)
  })

  it('fibTimeZoneXs：以 A 的 x 为原点按倍数延伸（命中测试用）', () => {
    // A x=0, B x=10 → 分界 x = 0 + 10*n
    const xs = fibTimeZoneXs(0, 10)
    expect(xs[0]).toEqual({ n: 1, x: 10 })
    expect(xs[1]).toEqual({ n: 2, x: 20 })
    expect(xs[3]).toEqual({ n: 5, x: 50 })
  })

  it('requiredPoints：斐波那契时间区间为两点', () => {
    expect(requiredPoints('fibtz')).toBe(2)
  })

  it('normalizePoints：保持 A→B 原始顺序（方向敏感，向 B 侧延伸）', () => {
    const a = normalizePoints('fibtz', [{ time: 100, price: 50 }, { time: 110, price: 60 }])
    expect(a[0].time).toBe(100)
    expect(a[1].time).toBe(110)
    const b = normalizePoints('fibtz', [{ time: 110, price: 60 }, { time: 100, price: 50 }])
    expect(b[0].time).toBe(110)
    expect(b[1].time).toBe(100)
  })

  it('createDrawing / moveAnchor 保持两点', () => {
    const d = createDrawing('fibtz', [{ time: 100, price: 50 }, { time: 110, price: 60 }], 'ft1')
    expect(d.points).toHaveLength(2)
    const moved = moveAnchor(d, 1, { time: 120, price: 70 })
    expect(moved.points[1].time).toBe(120)
  })

  it('hitTest：相邻分界之间的竖带内部区域命中（任意 y）', () => {
    // A x=0, B x=10 → 分界 x = [10,20,30,50,...]，带 [10,20] 内任意位置命中
    const d = createDrawing('fibtz', [{ time: 0, price: 100 }, { time: 10, price: 100 }], 'ft2')
    expect(hitTestDrawings([d], 15, 999, project)).toBe('ft2') // 带内任意 y
    expect(hitTestDrawings([d], 12, 100, project)).toBe('ft2')
  })

  it('hitTest：分界线上命中；带外按到最近分界线的水平距离', () => {
    const d = createDrawing('fibtz', [{ time: 0, price: 100 }, { time: 10, price: 100 }], 'ft3')
    expect(hitTestDrawings([d], 10, 200, project)).toBe('ft3') // n=1 分界线
    expect(hitTestDrawings([d], 23, 200, project)).toBe('ft3') // 带 [20,30] 内
    expect(hitTestDrawings([d], 31, 200, project)).toBe('ft3') // 分界线 30 右侧 1px（下一带 [30,50] 内）
    expect(hitTestDrawings([d], 8, 200, project)).toBe('ft3') // 原点 A 左侧 2px（距分界 10 为 2px）
    expect(hitTestDrawings([d], 1, 200, project)).toBeNull() // 距最近分界 9px（超出 8px 阈值）
  })
})

describe('风险回报（rr，A 入场 / B 止损 / C 止盈）', () => {
  it('riskRewardRatio：正常多头设置（止损在下、止盈在上）', () => {
    const r = riskRewardRatio({ price: 100 }, { price: 80 }, { price: 150 })
    expect(r.risk).toBeCloseTo(20)
    expect(r.reward).toBeCloseTo(50)
    expect(r.ratio).toBeCloseTo(2.5)
  })

  it('riskRewardRatio：空头设置（止损在上、止盈在下）取绝对值', () => {
    const r = riskRewardRatio({ price: 100 }, { price: 120 }, { price: 60 })
    expect(r.risk).toBeCloseTo(20)
    expect(r.reward).toBeCloseTo(40)
    expect(r.ratio).toBeCloseTo(2)
  })

  it('riskRewardRatio：止损与入场同价（risk=0）返回 ratio 0 不崩溃', () => {
    const r = riskRewardRatio({ price: 100 }, { price: 100 }, { price: 150 })
    expect(r.risk).toBe(0)
    expect(r.reward).toBe(50)
    expect(r.ratio).toBe(0)
  })

  it('requiredPoints：风险回报为三点', () => {
    expect(requiredPoints('rr')).toBe(3)
  })

  it('createDrawing / moveAnchor 保持三点（多锚点工具不重排，按点击顺序）', () => {
    const d = createDrawing('rr', [{ time: 0, price: 100 }, { time: 50, price: 80 }, { time: 100, price: 150 }], 'r1')
    expect(d.points).toHaveLength(3)
    expect(d.points[0]).toEqual({ time: 0, price: 100 })
    expect(d.points[1]).toEqual({ time: 50, price: 80 })
    expect(d.points[2]).toEqual({ time: 100, price: 150 })
    const moved = moveAnchor(d, 2, { time: 110, price: 160 })
    expect(moved.points).toHaveLength(3)
    expect(moved.points[2]).toEqual({ time: 110, price: 160 })
  })

  it('hitTest 风险回报：三条水平线（入场/止损/止盈）任一条附近命中', () => {
    // A(0,100)→(0,200) 入场线；B(50,50)→(50,250) 止损线；C(100,150)→(100,150) 止盈线
    const d = createDrawing('rr', [{ time: 0, price: 100 }, { time: 50, price: 50 }, { time: 100, price: 150 }], 'r2')
    expect(hitTestDrawings([d], 30, 200, project)).toBe('r2') // 入场线
    expect(hitTestDrawings([d], 10, 250, project)).toBe('r2') // 止损线
    expect(hitTestDrawings([d], 90, 150, project)).toBe('r2') // 止盈线
    expect(hitTestDrawings([d], 50, 300, project)).toBeNull() // 距最近线 50px
  })
})

describe('持仓计划（position，A 入场 / B 止损 / C 止盈）', () => {
  it('requiredPoints：持仓计划为三点', () => {
    expect(requiredPoints('position')).toBe(3)
  })

  it('createDrawing / moveAnchor 保持三点（多锚点工具不重排，按点击顺序）', () => {
    const d = createDrawing('position', [{ time: 0, price: 100 }, { time: 50, price: 80 }, { time: 100, price: 150 }], 'pt1')
    expect(d.points).toHaveLength(3)
    expect(d.points[0]).toEqual({ time: 0, price: 100 })
    expect(d.points[1]).toEqual({ time: 50, price: 80 })
    expect(d.points[2]).toEqual({ time: 100, price: 150 })
    const moved = moveAnchor(d, 2, { time: 110, price: 160 })
    expect(moved.points).toHaveLength(3)
    expect(moved.points[2]).toEqual({ time: 110, price: 160 })
  })

  it('hitTest 持仓计划：三条水平线（入场/止损/止盈）任一条附近命中', () => {
    // A(0,100) 入场线；B(50,50) 止损线；C(100,150) 止盈线
    const d = createDrawing('position', [{ time: 0, price: 100 }, { time: 50, price: 50 }, { time: 100, price: 150 }], 'pt2')
    expect(hitTestDrawings([d], 30, 200, project)).toBe('pt2') // 入场线
    expect(hitTestDrawings([d], 10, 250, project)).toBe('pt2') // 止损线
    expect(hitTestDrawings([d], 90, 150, project)).toBe('pt2') // 止盈线
    expect(hitTestDrawings([d], 50, 300, project)).toBeNull() // 距最近线 50px
  })
})

describe('预测线（forecast，A→B 历史 / B→C 同幅度投影）', () => {
  it('requiredPoints：预测线为两点', () => {
    expect(requiredPoints('forecast')).toBe(2)
  })

  it('createDrawing：保持原始顺序（方向敏感）', () => {
    const d = createDrawing('forecast', [{ time: 100, price: 120 }, { time: 20, price: 80 }], 'fc1')
    expect(d.points[0]).toEqual({ time: 100, price: 120 })
    expect(d.points[1]).toEqual({ time: 20, price: 80 })
  })

  it('moveAnchor 保持两点', () => {
    const d = createDrawing('forecast', [{ time: 0, price: 100 }, { time: 100, price: 150 }], 'fc2')
    const moved = moveAnchor(d, 1, { time: 110, price: 160 })
    expect(moved.points).toHaveLength(2)
    expect(moved.points[1]).toEqual({ time: 110, price: 160 })
  })

  it('hitTest：A→B 段和 B→C 投影段均命中', () => {
    // A(0,200)→B(50,100)，C 投影到 (100,0)
    const d = createDrawing('forecast', [{ time: 0, price: 200 }, { time: 50, price: 100 }], 'fc3')
    expect(hitTestDrawings([d], 25, 150, project)).toBe('fc3') // A→B 中点
    expect(hitTestDrawings([d], 75, 250, project)).toBe('fc3') // B→C 投影中点
    expect(hitTestDrawings([d], 80, 180, project)).toBeNull() // 远离
  })
})

describe('备注便签（note，单点卡片）', () => {
  it('requiredPoints：备注为单点', () => {
    expect(requiredPoints('note')).toBe(1)
  })

  it('createDrawing / moveAnchor 保留单点和内容字段', () => {
    const base = createDrawing('note', [{ time: 30, price: 120 }], 'note1')
    expect(base.points).toEqual([{ time: 30, price: 120 }])
    const withText = { ...base, text: '关键位提醒' }
    const moved = moveAnchor(withText, 0, { time: 40, price: 130 })
    expect(moved.points).toEqual([{ time: 40, price: 130 }])
    expect(moved.text).toBe('关键位提醒')
  })

  it('hitTest：卡片内部命中，外部不命中', () => {
    // project: (t,p) => ({x:t,y:300-p})；默认字号 14，命中框至少 24×12
    const d = { ...createDrawing('note', [{ time: 50, price: 150 }], 'note2'), text: '备注' }
    expect(hitTestDrawings([d], 50, 150, project)).toBe('note2')
    expect(hitTestDrawings([d], 65, 150, project)).toBe('note2')
    expect(hitTestDrawings([d], 80, 150, project)).toBeNull()
  })
})

describe('日期范围（daterange，两点竖带）', () => {
  it('requiredPoints：日期范围为两点', () => {
    expect(requiredPoints('daterange')).toBe(2)
  })

  it('createDrawing / moveAnchor 按时间排序', () => {
    const d = createDrawing('daterange', [{ time: 100, price: 100 }, { time: 20, price: 200 }], 'dr1')
    expect(d.points[0].time).toBeLessThanOrEqual(d.points[1].time)
    const moved = moveAnchor(d, 0, { time: 50, price: 150 })
    expect(moved.points).toHaveLength(2)
  })

  it('hitTest：竖带内命中，外部不命中', () => {
    // A(0,*)→B(100,*) → 竖带 [0,100]
    const d = createDrawing('daterange', [{ time: 0, price: 100 }, { time: 100, price: 200 }], 'dr2')
    expect(hitTestDrawings([d], 50, 200, project)).toBe('dr2') // 带内
    expect(hitTestDrawings([d], -15, 200, project)).toBeNull() // 左侧外
    expect(hitTestDrawings([d], 110, 200, project)).toBeNull() // 右侧外
  })
})

describe('图层管理（hidden/locked/patch）', () => {
  it('toggleDrawingHidden：翻转隐藏态并保留其余字段', () => {
    const d = createDrawing('horizontal', [{ time: 10, price: 100 }], 'h1')
    const h = toggleDrawingHidden(d)
    expect(h.hidden).toBe(true)
    expect(h.type).toBe('horizontal')
    expect(h.points).toEqual(d.points)
    expect(h.id).toBe('h1')
    // 再切一次恢复
    expect(toggleDrawingHidden(h).hidden).toBe(false)
    // 原对象不被修改
    expect(d.hidden).toBeUndefined()
  })

  it('toggleDrawingLocked：翻转锁定态并保留其余字段', () => {
    const d = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 't1')
    const l = toggleDrawingLocked(d)
    expect(l.locked).toBe(true)
    expect(l.type).toBe('trend')
    expect(l.points).toEqual(d.points)
    expect(toggleDrawingLocked(l).locked).toBe(false)
  })

  it('patchDrawing：仅命中 id 的条目打补丁，其余原样保留', () => {
    const a = createDrawing('horizontal', [{ time: 10, price: 100 }], 'a')
    const b = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'b')
    const out = patchDrawing([a, b], 'b', { locked: true })
    expect(out[0]).toBe(a) // 未命中条目引用不变
    expect(out[1].locked).toBe(true)
    expect(out[1].id).toBe('b')
    expect(out[1].type).toBe('trend')
    // 不存在的 id 原样返回
    const same = patchDrawing([a, b], 'nope', { hidden: true })
    expect(same[0]).toBe(a)
    expect(same[1]).toBe(b)
  })

  it('hitTestDrawings：隐藏的画线不参与命中', () => {
    const d = createDrawing('horizontal', [{ time: 10, price: 100 }], 'h1')
    expect(hitTestDrawings([d], 50, 200, project)).toBe('h1')
    const hidden = { ...d, hidden: true }
    expect(hitTestDrawings([hidden], 50, 200, project)).toBeNull()
  })

  it('hitTestDrawings：锁定的画线不可选中（不参与命中但保留数据）', () => {
    const d = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 't1')
    expect(hitTestDrawings([d], 50, 225, project)).toBe('t1')
    const locked = { ...d, locked: true }
    expect(hitTestDrawings([locked], 50, 225, project)).toBeNull()
  })

  it('hitTestDrawings：隐藏的条目不遮挡其他可见画线', () => {
    // 同一点上，隐藏的在前、可见的在后 → 应命中可见的那条
    const hidden = { ...createDrawing('horizontal', [{ time: 10, price: 100 }], 'h1'), hidden: true }
    const visible = createDrawing('horizontal', [{ time: 10, price: 100 }], 'h2')
    expect(hitTestDrawings([hidden, visible], 50, 200, project)).toBe('h2')
  })
})

describe('followLatestEntry（C15 position 工具贴附最新价）', () => {
  const pos = createDrawing('position', [
    { time: 100, price: 100 },
    { time: 100, price: 90 },
    { time: 100, price: 110 },
  ])

  it('非 position 类型或未开启 → 原样返回（引用不变）', () => {
    const trend = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }])
    expect(followLatestEntry(trend, { time: 999, price: 42 })).toBe(trend)
    expect(followLatestEntry(pos, { time: 999, price: 42 })).toBe(pos)
  })

  it('开启跟随 → 仅入场锚点（点 0）移动到最新价，其余锚点不变', () => {
    const on = { ...pos, followLatest: true }
    const out = followLatestEntry(on, { time: 200, price: 105 })
    expect(out.points[0]).toEqual({ time: 200, price: 105 })
    expect(out.points[1]).toEqual({ time: 100, price: 90 })
    expect(out.points[2]).toEqual({ time: 100, price: 110 })
  })

  it('开启跟随 → 返回新对象，不修改原画线', () => {
    const on = { ...pos, followLatest: true }
    const out = followLatestEntry(on, { time: 200, price: 105 })
    expect(out).not.toBe(on)
    expect(on.points[0]).toEqual({ time: 100, price: 100 })
  })
})

describe('textBoxX（C8 文字对齐）', () => {
  it('center（缺省）→ 锚点在框中央', () => {
    expect(textBoxX(100, 20)).toBe(90)
    expect(textBoxX(100, 20, 'center')).toBe(90)
  })
  it('left → 锚点在框左缘', () => {
    expect(textBoxX(100, 20, 'left')).toBe(100)
  })
  it('right → 锚点在框右缘', () => {
    expect(textBoxX(100, 20, 'right')).toBe(80)
  })
})

describe('groupDrawings（C4 画线分组）', () => {
  const a = createDrawing('horizontal', [{ time: 10, price: 100 }], 'a')
  const b = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'b')
  const c = createDrawing('vertical', [{ time: 40, price: 100 }], 'c')
  it('无分组 → 全部归入空键', () => {
    const g = groupDrawings([a, b, c])
    expect(Object.keys(g)).toEqual([''])
    expect(g[''].length).toBe(3)
  })
  it('按 group 字段分键', () => {
    const g = groupDrawings([
      { ...a, group: '结构' },
      { ...b, group: '结构' },
      { ...c, group: '趋势' },
    ])
    expect(g['结构'].length).toBe(2)
    expect(g['趋势'].length).toBe(1)
    expect(g['']).toBeUndefined()
  })
})

describe('toggleGroupHidden / toggleGroupLocked（C4 分组批量操作）', () => {
  const a = createDrawing('horizontal', [{ time: 10, price: 100 }], 'a')
  const b = createDrawing('trend', [{ time: 0, price: 100 }, { time: 100, price: 50 }], 'b')
  const c = createDrawing('vertical', [{ time: 40, price: 100 }], 'c')
  const list = [
    { ...a, group: 'g1' },
    { ...b, group: 'g1' },
    { ...c, group: 'g2' },
  ]
  it('组隐藏只影响该组（未分组 key 不误伤）', () => {
    const out = toggleGroupHidden(list, 'g1', true)
    expect(out[0].hidden).toBe(true)
    expect(out[1].hidden).toBe(true)
    expect(out[2].hidden).toBeUndefined()
    expect(out[2]).toBe(list[2]) // 其他组引用不变
  })
  it('组锁定只影响该组', () => {
    const out = toggleGroupLocked(list, 'g2', true)
    expect(out[0].locked).toBeUndefined()
    expect(out[2].locked).toBe(true)
  })
  it('未分组 key（空串）批量操作', () => {
    const mixed = [...list, { ...createDrawing('horizontal', [{ time: 1, price: 1 }], 'u'), group: '' }]
    const out = toggleGroupHidden(mixed, '', true)
    expect(out[3].hidden).toBe(true)
    expect(out[0].hidden).toBeUndefined()
  })
})
