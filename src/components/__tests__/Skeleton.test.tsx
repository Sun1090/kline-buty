// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Skeleton } from '../Skeleton'
import { PanelState } from '../PanelState'

afterEach(cleanup)

describe('Skeleton（L6 骨架屏组件）', () => {
  it('渲染 rows 个占位块', () => {
    render(<Skeleton rows={5} testId="sk" />)
    const el = screen.getByTestId('sk')
    expect(el.children.length).toBe(5)
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })

  it('header 模式首行较矮（宽度 40%）', () => {
    render(<Skeleton rows={3} header testId="sk" />)
    const el = screen.getByTestId('sk')
    const first = el.children[0] as HTMLElement
    expect(first.style.width).toBe('40%')
    const second = el.children[1] as HTMLElement
    expect(second.style.width).not.toBe('40%')
  })
})

describe('PanelState skeleton（L6 面板加载骨架）', () => {
  it('loading + skeleton → 渲染骨架而非文字', () => {
    render(<PanelState status="loading" skeleton />)
    expect(screen.getByTestId('panel-skeleton')).toBeDefined()
  })

  it('loading 无 skeleton → 渲染文字', () => {
    render(<PanelState status="loading" />)
    expect(screen.queryByTestId('panel-skeleton')).toBeNull()
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('error 态仍渲染重试按钮（不受 skeleton 影响）', () => {
    render(<PanelState status="error" onRetry={() => {}} />)
    expect(screen.getByTestId('panel-retry')).toBeDefined()
  })
})
