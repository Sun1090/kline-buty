import { buildSparkPath } from '../utils/sparkPath'

const UP = 'var(--up)'
const DOWN = 'var(--down)'

interface SparklineProps {
  points: number[]
  width?: number
  height?: number
  /** 弹性模式：占满剩余空间（窄容器不溢出），宽度自适应、等比拉伸 */
  fluid?: boolean
}

/** 迷你折线图（SVG）：默认 76×22，颜色随首尾涨跌 */
export function Sparkline({ points, width = 76, height = 22, fluid = false }: SparklineProps) {
  if (points.length < 2) return <span style={{ color: 'var(--text-faint)' }}>…</span>
  const color = points[points.length - 1] >= points[0] ? UP : DOWN
  return (
    <svg
      width={fluid ? '100%' : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? 'none' : 'xMidYMid meet'}
      role="img"
      aria-label={color === UP ? `+${((points[points.length - 1] / points[0] - 1) * 100).toFixed(2)}%` : `${((points[points.length - 1] / points[0] - 1) * 100).toFixed(2)}%`}
      style={fluid ? { flex: '1 1 50px', minWidth: 36, maxWidth: 120 } : { flexShrink: 0 }}
    >
      <path d={buildSparkPath(points, width, height)} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}
