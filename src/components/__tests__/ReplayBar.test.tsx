// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { ReplayBar } from '../ReplayBar'
import { createReplay } from '../../replay/engine'

function setup(replay = createReplay(100, 10)) {
  const handlers = {
    onToggle: vi.fn(),
    onSpeed: vi.fn(),
    onSeek: vi.fn(),
    onExit: vi.fn(),
  }
  render(<ReplayBar replay={replay} cursorTime={1786797540} {...handlers} />)
  return handlers
}

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReplayBar', () => {
  it('渲染回放状态：游标/总数/时间', () => {
    setup()
    expect(screen.getByText('回放')).toBeDefined()
    expect(screen.getByText('11 / 100')).toBeDefined()
    expect(screen.getByText(/2026\/8\/15/)).toBeDefined()
  })

  it('播放/暂停切换回调', () => {
    const h = setup()
    fireEvent.click(screen.getByText('播放'))
    expect(h.onToggle).toHaveBeenCalledTimes(1)
  })

  it('速度档位回调', () => {
    const h = setup()
    fireEvent.click(screen.getByText('20x'))
    expect(h.onSpeed).toHaveBeenCalledWith(20)
  })

  it('进度条拖动回调', () => {
    const h = setup()
    const range = screen.getByRole('slider') as HTMLInputElement
    fireEvent.change(range, { target: { value: '50' } })
    expect(h.onSeek).toHaveBeenCalledWith(50)
  })

  it('进度条点击跳转：任意位置值触发 onSeek', () => {
    const h = setup(createReplay(100, 10))
    const range = screen.getByRole('slider') as HTMLInputElement
    // 模拟点击轨道跳到 75% 位置
    fireEvent.change(range, { target: { value: '75' } })
    expect(h.onSeek).toHaveBeenCalledWith(75)
  })

  it('进度条有 aria-label + 键盘可操作（slider role）', () => {
    setup()
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('aria-label')).toBeTruthy()
  })

  it('退出回放回调', () => {
    const h = setup()
    fireEvent.click(screen.getByText('退出回放'))
    expect(h.onExit).toHaveBeenCalledTimes(1)
  })

  it('播放中显示"暂停"', () => {
    setup({ ...createReplay(100, 10), playing: true })
    expect(screen.getByText('暂停')).toBeDefined()
  })
})
