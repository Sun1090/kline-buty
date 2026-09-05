// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, fireEvent, screen } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap, focusableElements } from '../useFocusTrap'

afterEach(cleanup)

function Trap({ open = true }: { open?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref)
  return (
    <div>
      <button data-testid="outside">outside</button>
      <div ref={ref} data-testid="trap">
        <button data-testid="a">A</button>
        <button data-testid="b">B</button>
        <button data-testid="c">C</button>
      </div>
    </div>
  )
}

describe('focusableElements（M5 弹层焦点陷阱）', () => {
  it('收集弹层内可聚焦元素（排除 disabled/隐藏）', () => {
    render(
      <div>
        <button data-testid="f1">1</button>
        <button disabled>2</button>
        <input data-testid="f2" />
      </div>,
    )
    const root = screen.getByTestId('f1').parentElement as HTMLElement
    const els = focusableElements(root)
    expect(els.map((e) => e.getAttribute('data-testid'))).toEqual(['f1', 'f2'])
  })
})

describe('useFocusTrap（M5）', () => {
  it('弹层打开：自动聚焦首个可聚焦元素', () => {
    render(<Trap />)
    expect(document.activeElement?.getAttribute('data-testid')).toBe('a')
  })

  it('Tab 逃逸被拉回弹层内（焦点移出 → 回到首个元素）', () => {
    render(<Trap />)
    // 模拟焦点逃逸到弹层外的 outside 按钮 → focusin 监听触发拉回首个元素
    fireEvent.focusOut(screen.getByTestId('b'))
    expect(document.activeElement?.getAttribute('data-testid')).toBe('a')
  })
})
