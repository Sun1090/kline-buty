// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { PullToRefresh } from '../PullToRefresh'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** 向组件根派发触摸事件（touchend/cancel 无 touches，move 可取消以 allow preventDefault） */
function dispatchTouch(
  el: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  y: number,
  x = 0,
) {
  act(() => {
    el.dispatchEvent(
      new TouchEvent(type, {
        touches:
          type === 'touchend' || type === 'touchcancel'
            ? []
            : ([{ clientX: x, clientY: y }] as unknown as Touch[]),
        bubbles: true,
        cancelable: type === 'touchmove',
      }),
    )
  })
}

function setup(onRefresh = vi.fn(), enabled = true) {
  render(
    <PullToRefresh enabled={enabled} onRefresh={onRefresh}>
      <div>图表区</div>
    </PullToRefresh>,
  )
  return { el: screen.getByTestId('pull-to-refresh'), onRefresh }
}

describe('PullToRefresh（移动端下拉刷新）', () => {
  it('纵向下拉超阈值 → 显示释放提示并触发 onRefresh，800ms 后复位', () => {
    vi.useFakeTimers()
    const { el, onRefresh } = setup()
    dispatchTouch(el, 'touchstart', 0)
    // dy=120 ≥ 80 → 进度拉满 → 「松开刷新」
    dispatchTouch(el, 'touchmove', 120)
    expect(screen.getByTestId('pull-indicator').textContent).toBe('松开刷新')
    dispatchTouch(el, 'touchend', 120)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('pull-indicator').textContent).toBe('刷新中…')
    act(() => vi.advanceTimersByTime(800))
    expect(screen.queryByTestId('pull-indicator')).toBeNull()
  })

  it('下拉不足阈值 → 不触发，指示器回落', () => {
    vi.useFakeTimers()
    const { el, onRefresh } = setup()
    dispatchTouch(el, 'touchstart', 0)
    dispatchTouch(el, 'touchmove', 40) // 40 < 80 → 进度 0.5
    expect(screen.getByTestId('pull-indicator').textContent).toBe('下拉刷新')
    dispatchTouch(el, 'touchend', 40)
    expect(onRefresh).not.toHaveBeenCalled()
    expect(screen.queryByTestId('pull-indicator')).toBeNull()
  })

  it('横向主导手势（平移）不抢事件 → 不触发', () => {
    const { el, onRefresh } = setup()
    dispatchTouch(el, 'touchstart', 0, 0)
    dispatchTouch(el, 'touchmove', 30, 100) // dy=30 < |dx|·1.2 → 交给图表原生手势
    dispatchTouch(el, 'touchend', 30, 100)
    expect(onRefresh).not.toHaveBeenCalled()
    expect(screen.queryByTestId('pull-indicator')).toBeNull()
  })

  it('touchcancel（未达阈值）→ 复位不触发', () => {
    const { el, onRefresh } = setup()
    dispatchTouch(el, 'touchstart', 0)
    dispatchTouch(el, 'touchmove', 50) // 50 < 80 → 未 armed
    dispatchTouch(el, 'touchcancel', 50)
    expect(onRefresh).not.toHaveBeenCalled()
    expect(screen.queryByTestId('pull-indicator')).toBeNull()
  })

  it('enabled=false（桌面）→ 不绑定下拉手势', () => {
    const { el, onRefresh } = setup(vi.fn(), false)
    dispatchTouch(el, 'touchstart', 0)
    dispatchTouch(el, 'touchmove', 120)
    dispatchTouch(el, 'touchend', 120)
    expect(onRefresh).not.toHaveBeenCalled()
  })
})
