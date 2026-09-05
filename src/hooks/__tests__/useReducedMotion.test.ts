// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from '../useReducedMotion'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useReducedMotion（M7 减少动效偏好）', () => {
  it('系统未开启 reduced-motion → false', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('系统开启 reduced-motion → true', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('matchMedia 变化 → 响应更新', () => {
    const listeners: ((e: { matches: boolean }) => void)[] = []
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => listeners[0]?.({ matches: true }))
    expect(result.current).toBe(true)
  })

  it('无 matchMedia 环境 → false（不抛错）', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })
})
