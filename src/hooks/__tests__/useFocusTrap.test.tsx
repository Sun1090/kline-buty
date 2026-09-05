// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { focusableElements, useFocusTrap } from '../useFocusTrap'

afterEach(cleanup)

function Trap({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref)
  return (
    <div ref={ref} data-testid="trap">
      <button data-testid="inside">内部</button>
      <button data-testid="inside2">内部2</button>
      <button data-testid="disabled" disabled>
        禁用
      </button>
      <button data-testid="hidden" hidden>
        隐藏
      </button>
    </div>
  )
}

function App({ open }: { open: boolean }) {
  return (
    <div>
      <button data-testid="outside">外部</button>
      <Trap open={open} />
    </div>
  )
}

function EmptyTrap({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref)
  return (
    <div ref={ref}>
      <span>无可聚焦元素</span>
    </div>
  )
}

describe('focusableElements（弹层内可聚焦元素收集）', () => {
  it('收集可聚焦控件，排除 disabled / aria-hidden / hidden', () => {
    render(<App open />)
    const root = screen.getByTestId('trap')
    const ids = focusableElements(root).map((el) => el.getAttribute('data-testid'))
    expect(ids).toEqual(['inside', 'inside2'])
  })
})

describe('useFocusTrap（M5 弹层焦点陷阱）', () => {
  it('打开 → 首个可聚焦元素自动获焦', () => {
    render(<App open />)
    expect(document.activeElement?.getAttribute('data-testid')).toBe('inside')
  })

  it('焦点逃逸弹层外 → 拉回首个可聚焦元素', () => {
    render(<App open />)
    screen.getByTestId('outside').focus()
    expect(document.activeElement?.getAttribute('data-testid')).toBe('inside')
  })

  it('关闭 → 恢复打开前的焦点元素', () => {
    const { rerender } = render(<App open={false} />)
    screen.getByTestId('outside').focus()
    rerender(<App open />) // effect 记录当前焦点 = outside
    expect(document.activeElement?.getAttribute('data-testid')).toBe('inside')
    rerender(<App open={false} />) // cleanup 恢复 outside
    expect(document.activeElement?.getAttribute('data-testid')).toBe('outside')
  })

  it('无可聚焦元素 → 打开/逃逸均不抛错', () => {
    render(<EmptyTrap open />)
    document.body.focus()
    fireEvent.focusIn(document.body)
    expect(document.activeElement).toBe(document.body)
  })

  it('未打开 → 不自动获焦，外部焦点不被干预', () => {
    render(<App open={false} />)
    expect(document.activeElement?.getAttribute('data-testid')).not.toBe('inside')
    screen.getByTestId('outside').focus()
    expect(document.activeElement?.getAttribute('data-testid')).toBe('outside')
  })
})
