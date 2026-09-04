import type { CSSProperties } from 'react'

/** L6 面板首载骨架屏：通用占位块，浅色脉冲动画。
 *  用法：Skeleton({ rows, rowHeight }) 渲染几行灰色占位，覆盖各面板首载布局。 */
interface SkeletonProps {
  /** 占位行数 */
  rows?: number
  /** 每行高度（px） */
  rowHeight?: number
  /** 行内是否有头部（第一行较矮、较窄） */
  header?: boolean
  /** 自定义样式（宽度等） */
  style?: CSSProperties
  /** 测试定位 */
  testId?: string
}

/** 骨架屏脉冲动画 keyframes（全局注入一次） */
export const SKELETON_KEYFRAMES = `@keyframes kb-pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.9 } }`

const blockStyle = (h: number, widthPct: number): CSSProperties => ({
  height: h,
  width: `${widthPct}%`,
  borderRadius: 4,
  background: 'rgba(255,255,255,0.06)',
  animation: 'kb-pulse 1.2s ease-in-out infinite',
})

export function Skeleton({ rows = 6, rowHeight = 18, header = false, style, testId }: SkeletonProps) {
  const arr = Array.from({ length: rows }, (_, i) => i)
  return (
    <div
      data-testid={testId}
      aria-hidden="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 2px', ...style }}
    >
      {arr.map((i) => {
        const h = header && i === 0 ? Math.round(rowHeight * 0.6) : rowHeight
        const widthPct = header && i === 0 ? 40 : 70 + ((i * 13) % 25)
        return <div key={i} style={blockStyle(h, widthPct)} />
      })}
    </div>
  )
}
