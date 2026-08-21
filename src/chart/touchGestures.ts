/**
 * 触屏双击复位的轻点会话状态。
 *
 * 只有「非保留期、单指、未移动、未长按钉线」的有效轻点才累计；
 * 捏合残留指、画线/拖拽编辑等手势会使当前会话失效，避免误触发图表复位。
 */
export class TouchTapTracker {
  /** 当前有效轻点数；-1 表示本触摸会话已失效 */
  private count = 0

  /** 新触摸按下时推进会话；保留期轻点和多指触摸不参与双击计数 */
  begin({ touchCount, lingering }: { touchCount: number; lingering: boolean }) {
    this.count = lingering || touchCount !== 1 ? -1 : Math.max(0, this.count) + 1
  }

  /** 当前手势被其他交互接管（捏合 / 拖拽 / 长按）后立即失效 */
  invalidate() {
    this.count = -1
  }

  /** 距上一次有效轻点足够近，且当前会话已有两次有效轻点时才允许复位 */
  shouldReset(now: number, lastTapAt: number, doubleTapMs: number) {
    return this.count >= 2 && now - lastTapAt < doubleTapMs
  }
}

/**
 * 捏合结束后的残留单指会话。
 *
 * 双指中先抬起一指时进入防护期，期间既不显示十字光标也不累计双击；
 * 所有手指抬起后防护立即结束，后续新触摸是全新手势。
 */
export class PinchLingeringTracker {
  private until = 0

  /** 当前时间可注入，避免测试环境 fake timers 与 Date clock 不同步 */
  constructor(private now: () => number = Date.now) {}

  start(durationMs: number) {
    this.until = Math.max(this.until, this.now() + durationMs)
  }

  clear() {
    this.until = 0
  }

  get active() {
    return Boolean(this.until) && this.now() < this.until
  }
}
