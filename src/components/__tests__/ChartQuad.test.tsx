// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useChartSync } from '../ChartQuad'

beforeEach(() => {})

afterEach(cleanup)

describe('useChartSync', () => {
  it('A 上报 → 广播给其他图（source 自身不收到）', () => {
    const { result } = renderHook(() => useChartSync(4))
    act(() => {
      result.current.broadcast(0, { from: 10, to: 50 })
    })
    expect(result.current.ranges[0]).toBeNull()
    expect(result.current.ranges[1]).toEqual({ from: 10, to: 50 })
    expect(result.current.ranges[2]).toEqual({ from: 10, to: 50 })
    expect(result.current.ranges[3]).toEqual({ from: 10, to: 50 })
  })

  it('回显（同值回调）不再广播', () => {
    const { result } = renderHook(() => useChartSync(4))
    act(() => {
      result.current.broadcast(0, { from: 10, to: 50 })
    })
    const before = JSON.stringify(result.current.ranges)
    act(() => {
      result.current.broadcast(1, { from: 10, to: 50 })
    })
    expect(JSON.stringify(result.current.ranges)).toBe(before)
  })

  it('B 独立拖动新值 → 正常广播', () => {
    const { result } = renderHook(() => useChartSync(4))
    act(() => {
      result.current.broadcast(0, { from: 10, to: 50 })
    })
    act(() => {
      result.current.broadcast(1, { from: 20, to: 80 })
    })
    expect(result.current.ranges[0]).toEqual({ from: 20, to: 80 })
    expect(result.current.ranges[2]).toEqual({ from: 20, to: 80 })
  })

  it('两图时只有对方收到', () => {
    const { result } = renderHook(() => useChartSync(2))
    act(() => {
      result.current.broadcast(1, { from: 5, to: 9 })
    })
    expect(result.current.ranges[0]).toEqual({ from: 5, to: 9 })
    expect(result.current.ranges[1]).toBeNull()
  })
})
