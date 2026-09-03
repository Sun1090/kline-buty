// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChartSync } from '../useChartSync'

describe('useChartSync（G8 多图十字光标时间联动）', () => {
  it('range broadcast：A 拖动写入 B，不清 A 自己', () => {
    const { result } = renderHook(() => useChartSync(2))
    act(() => result.current.broadcast(0, { from: 10, to: 20 }))
    expect(result.current.ranges[1]).toEqual({ from: 10, to: 20 })
    expect(result.current.ranges[0]).toBeNull()
  })

  it('range broadcast：回显相同值不再触发（防回环）', () => {
    const { result } = renderHook(() => useChartSync(2))
    act(() => result.current.broadcast(0, { from: 10, to: 20 }))
    const sigA = result.current.ranges[1]
    act(() => result.current.broadcast(1, sigA!))
    // B 收到 A 的 {10,20} 后若原样回显 → 不应再写回 A（保持 null）
    expect(result.current.ranges[0]).toBeNull()
  })

  it('crosshair broadcast：A 报时间 → B 收到，A 置 null', () => {
    const { result } = renderHook(() => useChartSync(4))
    act(() => result.current.broadcastCrosshair(0, 1_788_307_200))
    expect(result.current.crosshairTimes[1]).toBe(1_788_307_200)
    expect(result.current.crosshairTimes[2]).toBe(1_788_307_200)
    expect(result.current.crosshairTimes[0]).toBeNull()
  })

  it('crosshair broadcast：回显相同时间不再广播（防回环）', () => {
    const { result } = renderHook(() => useChartSync(3))
    act(() => result.current.broadcastCrosshair(0, 1234))
    // B 收到 1234 后原样回显给 A：不再次传播
    act(() => result.current.broadcastCrosshair(1, 1234))
    expect(result.current.crosshairTimes[2]).toBe(1234) // 保持第一次广播的结果
    expect(result.current.crosshairTimes[0]).toBeNull()
  })

  it('crosshair broadcast：null（移出）同步到其他图', () => {
    const { result } = renderHook(() => useChartSync(2))
    act(() => result.current.broadcastCrosshair(0, 1234))
    act(() => result.current.broadcastCrosshair(0, null))
    expect(result.current.crosshairTimes[1]).toBeNull()
  })
})