// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { DrawingColorRow } from '../DrawingColorRow'

afterEach(cleanup)

describe('DrawingColorRow（画线默认颜色偏好）', () => {
  it('渲染全部色板选项，默认选中「跟随主题」', () => {
    render(<DrawingColorRow value="" onChange={vi.fn()} />)
    expect(screen.getByText('默认颜色')).toBeDefined()
    for (const id of ['default', 'yellow', 'blue', 'red', 'green', 'white', 'purple']) {
      expect(screen.getByLabelText(`默认颜色 ${id}`)).toBeDefined()
    }
    expect(screen.getByLabelText('默认颜色 default').getAttribute('aria-pressed')).toBe('true')
  })

  it('点击色块回调对应颜色，点回「跟随主题」回调空串', () => {
    const onChange = vi.fn()
    render(<DrawingColorRow value="" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('默认颜色 red'))
    expect(onChange).toHaveBeenLastCalledWith('#ef4444')
    fireEvent.click(screen.getByLabelText('默认颜色 blue'))
    expect(onChange).toHaveBeenLastCalledWith('#4e9cf5')
    fireEvent.click(screen.getByLabelText('默认颜色 default'))
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})
