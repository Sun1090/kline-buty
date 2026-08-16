// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SentimentPanel } from '../SentimentPanel'
import type { SentimentData } from '../../hooks/useSentiment'

afterEach(cleanup)

const ratio = [
  { timestamp: 1786860000000, long: 0.6724, short: 0.3276, longShortRatio: 2.0525 },
  { timestamp: 1786863600000, long: 0.673, short: 0.327, longShortRatio: 2.0581 },
]
const taker = [
  { timestamp: 1786860000000, buyVol: 331.55, sellVol: 354.761, buySellRatio: 0.9346 },
  { timestamp: 1786863600000, buyVol: 235.558, sellVol: 260.3, buySellRatio: 0.9049 },
]
const oi = [
  { timestamp: 1786866300000, oi: 111331.031, oiValue: 7016972221.868 },
  { timestamp: 1786869900000, oi: 111496.105, oiValue: 7036865429.396 },
]

const topTrader = [
  { timestamp: 1786860000000, long: 0.5959, short: 0.4041, longShortRatio: 1.4744 },
  { timestamp: 1786863600000, long: 0.5959, short: 0.4041, longShortRatio: 1.4749 },
]
const data: SentimentData = { globalRatio: ratio, topTraderRatio: topTrader, takerRatio: taker, oiHistory: oi }

describe('SentimentPanel', () => {
  it('渲染 4 个指标块与当前值', () => {
    render(<SentimentPanel data={data} />)
    expect(screen.getByText('全账户多空比')).toBeDefined()
    expect(screen.getByText('大户持仓多空比')).toBeDefined()
    expect(screen.getByText('主动买卖比')).toBeDefined()
    expect(screen.getByText('未平仓 24h')).toBeDefined()
    expect(screen.getByText('2.06')).toBeDefined() // 全账户多空比（四舍五入）
    expect(screen.getByText('1.47')).toBeDefined() // 大户持仓多空比
    expect(screen.getByText('0.90')).toBeDefined() // 买卖比
    expect(screen.getByText('11.15万')).toBeDefined() // OI 币数量（万）
    expect(screen.getByText('+0.15%')).toBeDefined() // OI 24h 变化
  })

  it('无数据时显示加载占位（不崩溃）', () => {
    render(<SentimentPanel data={{ globalRatio: [], topTraderRatio: [], takerRatio: [], oiHistory: [] }} />)
    expect(screen.getAllByText('加载中…')).toHaveLength(4)
  })
})
