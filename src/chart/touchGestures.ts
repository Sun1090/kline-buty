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
