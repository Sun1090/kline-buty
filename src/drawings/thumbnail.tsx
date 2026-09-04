import type { CSSProperties } from 'react'
import type { Drawing, DrawingType } from './logic'

/**
 * I6 画线缩略图（图层树内每层预览小图）。
 *
 * 纯函数：把画线的逻辑坐标 points 归一化到固定小画布，按工具类型画示意形状。
 * 不渲染真实行情轴——缩略图只表达「形状与相对几何」，足够用户在图层树里快速识别。
 */

const W = 44
const H = 24
const PAD = 3

/** 需要矩形/区域类绘制的工具：以首点为对角绘制矩形或区域 */
const AREA_TYPES: DrawingType[] = ['rect', 'pband', 'pricerange', 'gannbox', 'fib', 'fibchannel', 'fibfan', 'fibtimed', 'cycle', 'wedge', 'triangle', 'hchannel', 'channel', 'pitchfork', 'regchan']

/** 多边形/连线类：把点连成折线 */
const POLY_TYPES: DrawingType[] = ['trend', 'ray', 'hray', 'vray', 'extended', 'fibext', 'polyline', 'bezier', 'xabcd', 'elliott', 'parray', 'pchannel', 'forecast', 'speedlines', 'angle', 'measure']

export interface ThumbProps {
  drawing: Drawing
  style?: CSSProperties
}

function scalePoint(p: { time: number; price: number }, minT: number, maxT: number, minP: number, maxP: number) {
  const spanT = Math.max(1e-9, maxT - minT)
  const spanP = Math.max(1e-9, maxP - minP)
  const x = PAD + ((p.time - minT) / spanT) * (W - PAD * 2)
  const y = PAD + (1 - (p.price - minP) / spanP) * (H - PAD * 2)
  return { x, y }
}

/** 缩略图色：继承画线色或主题降级色 */
function colorFor(d: Drawing): string {
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

/**
 * 渲染缩略图 SVG。单点工具（horizontal/vertical/text 等）画简化标记，
 * 多点工具按 AREA/POLY 分组画矩形或折线。
 */
export function DrawingThumb({ drawing, style }: ThumbProps) {
  const { path, single } = thumbnailPath(drawing)
  const color = colorFor(drawing)
  const { type } = drawing
  const isArea = AREA_TYPES.includes(type)
  const isPoly = POLY_TYPES.includes(type) || drawing.points.length > 1

  let body: React.ReactNode = null
  if (single) {
    // 单点工具：横线/竖线/十字/文本用对应标记
    if (type === 'horizontal' || type === 'hray' || type === 'pricelabel') {
      body = <line x1={PAD} y1={single.y} x2={W - PAD} y2={single.y} stroke={color} strokeWidth={1.5} />
    } else if (type === 'vertical' || type === 'vray' || type === 'timerange' || type === 'daterange') {
      body = <line x1={single.x} y1={PAD} x2={single.x} y2={H - PAD} stroke={color} strokeWidth={1.5} />
    } else if (type === 'cross') {
      body = (
        <>
          <line x1={PAD} y1={single.y} x2={W - PAD} y2={single.y} stroke={color} strokeWidth={1.2} />
          <line x1={single.x} y1={PAD} x2={single.x} y2={H - PAD} stroke={color} strokeWidth={1.2} />
        </>
      )
    } else {
      // 文本/备注/其他单点：圆点 + 文字提示
      body = (
        <>
          <circle cx={single.x} cy={single.y} r={2} fill={color} />
          {type === 'text' || type === 'note' ? (
            <text x={single.x + 4} y={single.y + 3} fontSize={7} fill={color}>
              {type === 'note' ? '📌' : 'T'}
            </text>
          ) : null}
        </>
      )
    }
  } else if (isArea && drawing.points.length >= 2) {
    // 区域类：首点 → 末点对角矩形
    const a = drawing.points[0]
    const b = drawing.points[drawing.points.length - 1]
    const minT = Math.min(...drawing.points.map((p) => p.time))
    const maxT = Math.max(...drawing.points.map((p) => p.time))
    const minP = Math.min(...drawing.points.map((p) => p.price))
    const maxP = Math.max(...drawing.points.map((p) => p.price))
    const pa = scalePoint(a, minT, maxT, minP, maxP)
    const pb = scalePoint(b, minT, maxT, minP, maxP)
    const x = Math.min(pa.x, pb.x)
    const y = Math.min(pa.y, pb.y)
    const w = Math.abs(pb.x - pa.x)
    const h = Math.abs(pb.y - pa.y)
    body = (
      <rect
        x={x}
        y={y}
        width={Math.max(1, w)}
        height={Math.max(1, h)}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
      />
    )
  } else if (isPoly) {
    body = <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
  } else {
    // 兜底：连线
    body = path ? <path d={path} fill="none" stroke={color} strokeWidth={1.5} /> : null
  }

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      data-testid={`drawing-thumb-${drawing.type}`}
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        ...style,
      }}
    >
      {body}
    </svg>
  )
}
