import type { Drawing, DrawingType } from './logic'

/**
 * I6 画线缩略图核心纯函数：把画线 points 归一化到固定小画布坐标。
 * 与 React 组件分离，供单测直接调用。
 */

export const THUMB_W = 44
export const THUMB_H = 24
const PAD = 3

/** 需要矩形/区域类绘制的工具：以首点为对角绘制矩形或区域 */
export const AREA_TYPES: DrawingType[] = ['rect', 'pband', 'pricerange', 'gannbox', 'fib', 'fibchannel', 'fibfan', 'fibtimed', 'cycle', 'wedge', 'triangle', 'hchannel', 'channel', 'pitchfork', 'regchan']

/** 多边形/连线类：把点连成折线 */
export const POLY_TYPES: DrawingType[] = ['trend', 'ray', 'hray', 'vray', 'extended', 'fibext', 'polyline', 'bezier', 'xabcd', 'elliott', 'parray', 'pchannel', 'forecast', 'speedlines', 'angle', 'measure']

function scalePoint(p: { time: number; price: number }, minT: number, maxT: number, minP: number, maxP: number) {
  const spanT = Math.max(1e-9, maxT - minT)
  const spanP = Math.max(1e-9, maxP - minP)
  const x = PAD + ((p.time - minT) / spanT) * (THUMB_W - PAD * 2)
  const y = PAD + (1 - (p.price - minP) / spanP) * (THUMB_H - PAD * 2)
  return { x, y }
}

/** 缩略图色：继承画线色或主题降级色 */
export function colorFor(d: Drawing): string {
  return d.color ?? '#9aa7b5'
}

/**
 * 归一化全部锚点到一个平面坐标系（minT/maxT/minP/maxP 覆盖所有点）。
 * 返回 svg 内折线 path 与单点位置。
 */
export function thumbnailPath(drawing: Drawing): { path: string; single: { x: number; y: number } | null } {
  const pts = drawing.points
  if (pts.length === 0) return { path: '', single: null }
  const minT = Math.min(...pts.map((p) => p.time))
  const maxT = Math.max(...pts.map((p) => p.time))
  const minP = Math.min(...pts.map((p) => p.price))
  const maxP = Math.max(...pts.map((p) => p.price))
  const scaled = pts.map((p) => scalePoint(p, minT, maxT, minP, maxP))
  const path = scaled.map((s, i) => `${i === 0 ? 'M' : 'L'}${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(' ')
  return { path, single: scaled.length === 1 ? scaled[0] : null }
}
