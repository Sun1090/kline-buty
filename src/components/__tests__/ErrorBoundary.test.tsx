// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'
import { _reports, _resetErrorReporting } from '../../utils/errorReport'

/** 渲染时按 prop 决定是否抛错，用于触发错误边界 */
function Boom({ fail }: { fail: boolean }) {
  if (fail) throw new Error('图表崩溃')
  return <div data-testid="ok">正常渲染</div>
}

beforeEach(() => {
  _resetErrorReporting()
  vi.restoreAllMocks()
  // 静默 React 渲染错误的 console.error（错误边界捕获是预期路径）
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  _resetErrorReporting()
  vi.restoreAllMocks()
})

describe('ErrorBoundary（渲染错误边界）', () => {
  it('正常渲染时透传 children', () => {
    render(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('ok')).toBeTruthy()
    expect(screen.queryByText('图表渲染出错')).toBeNull()
  })

  it('子组件抛错 → 显示错误边界 + 错误消息 + 上报 render 报告', () => {
    render(
      <ErrorBoundary>
        <Boom fail={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('图表渲染出错')).toBeTruthy()
    expect(screen.getByText(/图表崩溃/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
    expect(_reports()).toHaveLength(1)
    expect(_reports()[0]).toMatchObject({ kind: 'render', message: '图表崩溃' })
  })

  it('点击重试 → 清除错误，恢复渲染 children', () => {
    const Test = ({ fail }: { fail: boolean }) => (
      <ErrorBoundary>
        <Boom fail={fail} />
      </ErrorBoundary>
    )
    const { rerender } = render(<Test fail={true} />)
    expect(screen.getByText('图表渲染出错')).toBeTruthy()
    // 修复后点重试 → 回到正常内容
    rerender(<Test fail={false} />)
    act(() => {
      screen.getByRole('button', { name: '重试' }).click()
    })
    expect(screen.getByTestId('ok')).toBeTruthy()
    expect(screen.queryByText('图表渲染出错')).toBeNull()
  })
})
