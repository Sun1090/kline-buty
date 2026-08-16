// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { loadFavorites, useFavorites } from '../useFavorites'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('loadFavorites', () => {
  it('解析合法列表并去重', () => {
    expect(loadFavorites(JSON.stringify(['BTCUSDT', 'ETHUSDT', 'BTCUSDT', 42, null]))).toEqual(['BTCUSDT', 'ETHUSDT'])
  })

  it('非法数据回退空数组', () => {
    expect(loadFavorites('not-json')).toEqual([])
    expect(loadFavorites('"str"')).toEqual([])
    expect(loadFavorites(null)).toEqual([])
  })

  it('超长截断到 50', () => {
    const arr = Array.from({ length: 80 }, (_, i) => `T${i}USDT`)
    expect(loadFavorites(JSON.stringify(arr))).toHaveLength(50)
  })
})

describe('useFavorites', () => {
  it('toggle 收藏/取消并持久化', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
    act(() => result.current.toggleFavorite('SOLUSDT'))
    expect(result.current.favorites).toEqual(['SOLUSDT'])
    expect(JSON.parse(localStorage.getItem('kline-buty:favorites')!)).toEqual(['SOLUSDT'])
    act(() => result.current.toggleFavorite('SOLUSDT'))
    expect(result.current.favorites).toEqual([])
  })

  it('初始化读取已有收藏', () => {
    localStorage.setItem('kline-buty:favorites', JSON.stringify(['ETHUSDT', 'BNBUSDT']))
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual(['ETHUSDT', 'BNBUSDT'])
  })
})
