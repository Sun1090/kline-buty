/** 触摸惯性滚动采样点（client 坐标 + 毫秒时间戳） */
export interface InertiaSample {
  x: number
  y: number
  time: number
}

/** 松手瞬间估算出的二维速度（px/s） */
export interface InertiaVelocity {
  x: number
  y: number
}

/**
 * 单指快扫速度估计。
 *
 * 只保留短窗口内的触摸轨迹：松手前用最近样本做线性斜率，避免整段慢拖动稀释瞬时速度；
 * 结果按图表可消费的最大速度钳制，防止异常跳点把视图直接甩出数据范围。
 */
export class TouchInertiaTracker {
  private samples: InertiaSample[] = []

  constructor(
    private now: () => number = Date.now,
    private maxPxPerSecond = 8000,
  ) {}

  /** 新手势开始；后续 move 前必须调用 */
  reset() {
    this.samples = []
  }

  /** 记录一次触屏移动，并丢弃窗口外旧样本 */
  move(x: number, y: number) {
    const time = this.now()
    this.samples.push({ x, y, time })
    const oldestIndex = Math.max(0, this.samples.length - 2)
    // 只用当前点和最近历史锚点：连续慢拖后旧轨迹不会稀释瞬时速度。
    this.samples.splice(0, oldestIndex)
  }

  /** 样本不足以稳定估计速度时返回零向量 */
  release(): InertiaVelocity {
    if (this.samples.length < 2) return { x: 0, y: 0 }
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    const seconds = (last.time - first.time) / 1000
    if (!Number.isFinite(seconds) || seconds <= 0) return { x: 0, y: 0 }
    return {
      x: clampSpeed((last.x - first.x) / seconds, this.maxPxPerSecond),
      y: clampSpeed((last.y - first.y) / seconds, this.maxPxPerSecond),
    }
  }
}

/**
 * 是否应启动横向惯性：横向速度足够快，且明显以横向为主。
 *
 * 纵向为主的滑动通常用于价格轴手势或误触；不满足横向主导时不抢走原生行为。
 */
export function shouldStartHorizontalInertia(
  velocity: InertiaVelocity,
  { minPxPerSecond, horizontalRatio = 1.15 }: { minPxPerSecond: number; horizontalRatio?: number },
) {
  return (
    Math.abs(velocity.x) >= minPxPerSecond &&
    Math.abs(velocity.x) > Math.abs(velocity.y) * horizontalRatio
  )
}

/** 触摸惯性摩擦衰减：每经过 halfLifeMs，速度减半 */
export function decayInertiaVelocity(pxPerSecond: number, elapsedMs: number, halfLifeMs = 225) {
  if (elapsedMs <= 0) return pxPerSecond
  return pxPerSecond * Math.pow(0.5, elapsedMs / halfLifeMs)
}

/** 低于该速度认为动画已收敛，避免无限小数帧浪费电量 */
export function inertiaSettled(pxPerSecond: number, thresholdPxPerSecond = 20) {
  return Math.abs(pxPerSecond) < thresholdPxPerSecond
}

/** 把横向像素位移换算成 logical range 平移量（手指向左 → 图表向未来滚动） */
export function horizontalInertiaBars(
  pxPerSecond: number,
  elapsedMs: number,
  visibleWidthPx: number,
  visibleBarCount: number,
) {
  if (!(visibleWidthPx > 0) || !(visibleBarCount > 0)) return 0
  const barsPerPx = visibleBarCount / visibleWidthPx
  return -pxPerSecond * (elapsedMs / 1000) * barsPerPx
}

function clampSpeed(value: number, limit: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(-limit, Math.min(limit, value))
}
