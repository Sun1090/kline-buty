// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { DrawingToolPicker } from '../DrawingToolPicker'

afterEach(cleanup)

describe('DrawingToolPicker（画线工具搜索过滤）', () => {
  it('默认展示全部工具，点击回调选中的值', () => {
    const onPick = vi.fn()
    render(<DrawingToolPicker value="none" onPick={onPick} />)
    expect(screen.getByText('趋势线')).toBeDefined()
    expect(screen.getByText('贝塞尔曲线')).toBeDefined()
    fireEvent.click(screen.getByText('贝塞尔曲线'))
    expect(onPick).toHaveBeenCalledWith('bezier')
  })

  it('中文关键词过滤：只保留匹配项', () => {
    render(<DrawingToolPicker value="none" onPick={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('搜索画线工具…'), { target: { value: '斐波那契' } })
    expect(screen.getByText('斐波那契')).toBeDefined()
    expect(screen.getByText('斐波那契扩展')).toBeDefined()
    expect(screen.queryByText('趋势线')).toBeNull()
  })

  it('英文关键词不区分大小写，且支持工具 value 匹配', () => {
    render(<DrawingToolPicker value="none" onPick={vi.fn()} />)
    const input = screen.getByPlaceholderText('搜索画线工具…')
    fireEvent.change(input, { target: { value: 'FIB' } })
    expect(screen.getByText('斐波那契')).toBeDefined()
    fireEvent.change(input, { target: { value: 'bezier' } })
    expect(screen.getByText('贝塞尔曲线')).toBeDefined()
  })

  it('无匹配时显示提示且不渲染网格按钮', () => {
    render(<DrawingToolPicker value="none" onPick={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('搜索画线工具…'), { target: { value: '不存在的工具' } })
    expect(screen.getByText('无匹配工具')).toBeDefined()
    expect(screen.queryByText('趋势线')).toBeNull()
  })
})
