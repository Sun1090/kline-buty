import type { CSSProperties } from 'react'
import type { Drawing } from './logic'
import { AREA_TYPES, POLY_TYPES, THUMB_H, THUMB_W, colorFor, thumbnailPath } from './thumbnailCore'

/**
 * I6 画线缩略图（图层树内每层预览小图）。
 *
 * 形状与几何归一化在 thumbnailCore（纯函数），本组件只负责按工具类型渲染 SVG 示意。
 */

export interface ThumbProps {
  drawing: Drawing
  style?: CSSProperties
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

  let body: React.ReactNode
  if (single) {
    // 单点工具：横线/竖线/十字/文本用对应标记
    if (type === 'horizontal' || type === 'hray' || type === 'pricelabel') {
      body = <line x1={3} y1={single.y} x2={THUMB_W - 3} y2={single.y} stroke={color} strokeWidth={1.5} />
    } else if (type === 'vertical' || type === 'vray' || type === 'timerange' || type === 'daterange') {
      body = <line x1={single.x} y1={3} x2={single.x} y2={THUMB_H - 3} stroke={color} strokeWidth={1.5} />
    } else if (type === 'cross') {
      body = (
        <>
          <line x1={3} y1={single.y} x2={THUMB_W - 3} y2={single.y} stroke={color} strokeWidth={1.2} />
          <line x1={single.x} y1={3} x2={single.x} y2={THUMB_H - 3} stroke={color} strokeWidth={1.2} />
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
    const spanT = Math.max(1e-9, maxT - minT)
    const spanP = Math.max(1e-9, maxP - minP)
    const px = (t: number) => 3 + ((t - minT) / spanT) * (THUMB_W - 6)
    const py = (price: number) => 3 + (1 - (price - minP) / spanP) * (THUMB_H - 6)
    const x = Math.min(px(a.time), px(b.time))
    const y = Math.min(py(a.price), py(b.price))
    const w = Math.abs(px(b.time) - px(a.time))
    const h = Math.abs(py(b.price) - py(a.price))
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
      width={THUMB_W}
      height={THUMB_H}
      viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
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
