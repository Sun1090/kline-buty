import { describe, expect, it } from 'vitest'
import { calcAO } from '../ao'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

describe('calcAO', () => {
  it('空数组返回空', () => {
    expect(calcAO([])).toEqual([])
  })
  it('数据不足 slow 根返回空', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 30; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    expect(calcAO(candles, 5, 34)).toEqual([])
  })
  it('输出长度 = 数据量 − slow + 1', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 100; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    expect(calcAO(candles, 5, 34)).toHaveLength(100 - 34 + 1)
  })
  it('单调上行 → AO 为正', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 100; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    for (const p of calcAO(candles, 5, 34)) expect(p.value).toBeGreaterThan(0)
  })
  it('慢线恒等于快线时 AO=0（fast=slow 恒等）', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 60; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    for (const p of calcAO(candles, 5, 5)) expect(p.value).toBeCloseTo(0)
  })
  it('自定义 fast/slow 生效', () => {
    const candles: Candle[] = []
    for (let i = 1; i <= 100; i++) candles.push(c(i, i, i + 2, i - 1, i + 1, 100))
    const out = calcAO(candles, 3, 10)
    expect(out).toHaveLength(100 - 10 + 1)
  })
})