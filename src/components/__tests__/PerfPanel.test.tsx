// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PerfPanel } from '../PerfPanel'
import type { FrameStats } from '../../utils/frameGauge'

afterEach(cleanup)

const stats: FrameStats = { total: 60, dropped: 3, rate: 0.05, avgInterval: 33.3, lastInterval: 30 }

describe('PerfPanel（G10 卡顿诊断）', () => {
  it('有实时帧时显示 FPS / 丢帧率 / 平均间隔 / 窗口帧数', () => {
    render(<PerfPanel frameStats={stats} onClose={vi.fn()} />)
    expect(screen.getByTestId('perf-stats')).toBeTruthy()
    // 1000/33.3 ≈ 30 FPS
    expect(screen.getByTestId('perf-fps').textContent).toBe('30.0')
    expect(screen.getByTestId('perf-drop-rate').textContent).toBe('5.0%')
    expect(screen.queryByTestId('perf-warn')).toBeNull()
  })

  it('丢帧率超阈值 → 显示卡顿警示', () => {
    render(<PerfPanel frameStats={{ total: 60, dropped: 20, rate: 0.35, avgInterval: 80, lastInterval: 100 }} onClose={vi.fn()} />)
    expect(screen.getByTestId('perf-warn')).toBeTruthy()
  })

  it('无实时帧 → 显示空态提示；关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<PerfPanel frameStats={null} onClose={onClose} />)
    expect(screen.getByTestId('perf-panel')).toBeTruthy()
    fireEvent.click(screen.getByTestId('perf-panel-close'))
    expect(onClose).toHaveBeenCalled()
  })
})
