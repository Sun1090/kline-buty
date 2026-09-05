/**
 * N14 实时帧丢帧统计：滑动窗口记录帧到达时间戳，
 * 以「期望帧间隔」为基准——实际间隔超过阈值（如 2× 期望）记为一次丢帧。
 *
 * 纯函数 + 外部注入时钟，便于单测；用于 WS 实时帧 / 压测模拟帧的流畅度诊断。
 */

export interface FrameStats {
  /** 窗口内总帧数（含首帧） */
  total: number
  /** 判定为丢帧的次数 */
  dropped: number
  /** 丢帧率 0–1 */
  rate: number
  /** 窗口内平均帧间隔（ms） */
  avgInterval: number
  /** 距上一帧的间隔（ms） */
  lastInterval: number
}

export interface FrameGaugeOptions {
  /** 期望帧间隔（ms）；实际间隔 > expected × tolerance 视为丢帧 */
  expectedMs: number
  /** 丢帧容忍倍数（缺省 2） */
  tolerance?: number
  /** 滑动窗口大小（帧数，缺省 60） */
  window?: number
}

export class FrameGauge {
  private timestamps: number[] = []
  private dropped = 0
  private readonly expectedMs: number
  private readonly tolerance: number
  private readonly window: number

  constructor(opts: FrameGaugeOptions) {
    this.expectedMs = Math.max(1, opts.expectedMs)
    this.tolerance = Math.max(1, opts.tolerance ?? 2)
    this.window = Math.max(4, opts.window ?? 60)
  }

  /** 记录一帧到达（now 由调用方传入，便于测试控制） */
  tick(now: number): void {
    const prev = this.timestamps[this.timestamps.length - 1]
    this.timestamps.push(now)
    if (this.timestamps.length > this.window) this.timestamps.shift()
    // 首帧无基准，不算丢帧
    if (prev === undefined) return
    const interval = now - prev
    // 期望间隔按最近若干帧的中位间隔自适应（应对 period 变化/暂停恢复）
    if (interval > this.expectedMs * this.tolerance) this.dropped += 1
  }

  /** 当前统计（窗口内） */
  stats(): FrameStats {
    const ts = this.timestamps
    if (ts.length === 0) return { total: 0, dropped: 0, rate: 0, avgInterval: 0, lastInterval: 0 }
    let sum = 0
    let last = 0
    for (let i = 1; i < ts.length; i++) {
      const d = ts[i] - ts[i - 1]
      sum += d
      last = d
    }
    const count = ts.length - 1
    return {
      total: ts.length,
      dropped: this.dropped,
      rate: count > 0 ? Math.min(1, this.dropped / count) : 0,
      avgInterval: count > 0 ? sum / count : 0,
      lastInterval: last,
    }
  }

  reset(): void {
    this.timestamps = []
    this.dropped = 0
  }
}

/** 便捷统计：丢帧率是否超标（如 > 10%） */
export function isDropping(stats: FrameStats, threshold = 0.1): boolean {
  return stats.total >= 4 && stats.rate > threshold
}