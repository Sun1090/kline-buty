import { describe, expect, it } from 'vitest'
import {
  createReplay,
  tickReplay,
  seekReplay,
  setSpeed,
  DEFAULT_REPLAY_SPEED,
  cycleSpeed,
} from '../engine'

describe('createReplay', () => {
  it('初始：游标 0、暂停、默认速度', () => {
    const r = createReplay(100)
    expect(r).toMatchObject({ cursor: 0, total: 100, playing: false, speed: DEFAULT_REPLAY_SPEED })
  })

  it('空序列游标收敛到 0', () => {
    expect(createReplay(0).cursor).toBe(0)
  })

  it('startCursor 越界被钳制', () => {
    expect(createReplay(10, 999).cursor).toBe(9)
    expect(createReplay(10, -5).cursor).toBe(0)
  })
})

describe('tickReplay', () => {
  it('推进游标', () => {
    const r = tickReplay({ ...createReplay(100), playing: true }, 5)
    expect(r.cursor).toBe(5)
  })

  it('到末尾自动暂停', () => {
    const r = tickReplay({ ...createReplay(10), cursor: 8, playing: true }, 5)
    expect(r.cursor).toBe(9)
    expect(r.playing).toBe(false)
  })

  it('暂停时不推进', () => {
    const r = tickReplay(createReplay(100), 10)
    expect(r.cursor).toBe(0)
  })
})

describe('seekReplay', () => {
  it('前进后退均可，越界钳制', () => {
    expect(seekReplay(createReplay(100), 30).cursor).toBe(30)
    expect(seekReplay(createReplay(100), 999).cursor).toBe(99)
    expect(seekReplay(createReplay(100), -1).cursor).toBe(0)
  })
})

describe('setSpeed', () => {
  it('仅接受合法档位', () => {
    expect(setSpeed(createReplay(100), 20).speed).toBe(20)
    expect(setSpeed(createReplay(100), 7).speed).toBe(DEFAULT_REPLAY_SPEED)
  })
})

describe('cycleSpeed', () => {
  it('在档位间循环：更快 / 更慢 / 首尾环绕', () => {
    expect(cycleSpeed(createReplay(100), 1).speed).toBe(10) // 5 → 10
    expect(cycleSpeed(createReplay(100), -1).speed).toBe(2) // 5 → 2
    const fast = { ...createReplay(100), speed: 50 }
    expect(cycleSpeed(fast, 1).speed).toBe(1) // 末尾环绕到最慢
    const slow = { ...createReplay(100), speed: 1 }
    expect(cycleSpeed(slow, -1).speed).toBe(50) // 首部环绕到最快
  })
})

describe('空序列与边界', () => {
  it('total=0 时 tickReplay 原样返回（不推进、不报错）', () => {
    const r = { ...createReplay(0), playing: true }
    const ticked = tickReplay(r, 5)
    // total=0 直接返回原 state（游标仍 0、playing 不变）
    expect(ticked).toEqual(r)
    expect(ticked.cursor).toBe(0)
  })

  it('total=0 时 seekReplay 游标钳制为 0', () => {
    const r = createReplay(0)
    expect(seekReplay(r, 10).cursor).toBe(0)
    expect(seekReplay(r, -5).cursor).toBe(0)
  })

  it('total=1 时推进到末尾立即暂停', () => {
    const r = { ...createReplay(1), playing: true }
    const ticked = tickReplay(r, 1)
    expect(ticked.cursor).toBe(0) // total-1=0
    expect(ticked.playing).toBe(false)
  })

  it('游标恰好推进到 total-1 时 playing=false', () => {
    const r = { ...createReplay(10), cursor: 5, playing: true }
    const ticked = tickReplay(r, 4) // 5+4=9=total-1
    expect(ticked.cursor).toBe(9)
    expect(ticked.playing).toBe(false)
  })

  it('游标推进到 total-2 时仍播放', () => {
    const r = { ...createReplay(10), cursor: 5, playing: true }
    const ticked = tickReplay(r, 3) // 5+3=8=total-2
    expect(ticked.playing).toBe(true)
  })

  it('setSpeed 非法值保持原速度', () => {
    const r = { ...createReplay(100), speed: 20 }
    expect(setSpeed(r, 0).speed).toBe(20)
    expect(setSpeed(r, -1).speed).toBe(20)
    expect(setSpeed(r, 100).speed).toBe(20)
  })

  it('tickReplay 步数为 0 → 游标不变、playing 不变', () => {
    const r = { ...createReplay(100), cursor: 50, playing: true }
    const ticked = tickReplay(r, 0)
    expect(ticked.cursor).toBe(50)
    expect(ticked.playing).toBe(true)
  })
})
