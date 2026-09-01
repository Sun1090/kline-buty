import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  createHistory,
  MAX_HISTORY,
  pushSnapshot,
  redoSnapshot,
  resetHistory,
  undoSnapshot,
} from '../history'

type Item = { id: string }

describe('DrawingHistory 画线撤销/重做历史栈', () => {
  it('新建历史：不可撤销、不可重做', () => {
    const h = createHistory()
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
  })

  it('push 一次变更后：可撤销、不可重做', () => {
    const h = pushSnapshot(createHistory(), [{ id: 'a' }])
    expect(canUndo(h)).toBe(true)
    expect(canRedo(h)).toBe(false)
  })

  it('撤销：回到变更前状态，当前状态进入 redo 栈', () => {
    const before: Item[] = [{ id: 'a' }]
    const current: Item[] = [{ id: 'a' }, { id: 'b' }]
    const h = pushSnapshot(createHistory(), before)
    const { history, state } = undoSnapshot<Item>(h, current)
    expect(state).toEqual(before)
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(true)
  })

  it('重做：回到撤销前状态', () => {
    const before: Item[] = [{ id: 'a' }]
    const current: Item[] = [{ id: 'a' }, { id: 'b' }]
    const h1 = pushSnapshot(createHistory(), before)
    const { history: h2, state: undone } = undoSnapshot<Item>(h1, current)
    expect(undone).toEqual(before)
    const { history: h3, state: redone } = redoSnapshot<Item>(h2, undone)
    expect(redone).toEqual(current)
    expect(canUndo(h3)).toBe(true)
    expect(canRedo(h3)).toBe(false)
  })

  it('撤销后新增操作：清空 redo 栈（新分支，经典行为）', () => {
    const s0: Item[] = []
    const s1: Item[] = [{ id: 'a' }]
    const s2: Item[] = [{ id: 'a' }, { id: 'b' }]
    const h1 = pushSnapshot(createHistory(), s0)
    const h2 = pushSnapshot(h1, s1)
    const { history: h3, state } = undoSnapshot<Item>(h2, s2)
    expect(state).toEqual(s1)
    expect(canRedo(h3)).toBe(true)
    // 撤销后再 push → redo 被清空
    const h4 = pushSnapshot(h3, state)
    expect(canRedo(h4)).toBe(false)
    expect(canUndo(h4)).toBe(true)
  })

  it('空栈撤销/重做：原样返回，不报错', () => {
    const h = createHistory()
    const { history, state } = undoSnapshot<Item>(h, [{ id: 'a' }])
    expect(history).toBe(h)
    expect(state).toEqual([{ id: 'a' }])
    const { history: h2, state: s2 } = redoSnapshot<Item>(h, [{ id: 'a' }])
    expect(h2).toBe(h)
    expect(s2).toEqual([{ id: 'a' }])
  })

  it('容量上限：超过 MAX_HISTORY 丢弃最旧快照，仍可正确撤销', () => {
    let h = createHistory()
    const snapshots: Item[][] = []
    for (let i = 0; i < MAX_HISTORY + 20; i++) {
      snapshots.push([{ id: `s${i}` }])
      h = pushSnapshot(h, snapshots[i])
    }
    // 仅保留最近 MAX_HISTORY 条
    expect(h.past.length).toBe(MAX_HISTORY)
    // 撤销返回栈顶（最近一次 before 状态），即最后 push 的快照
    const current: Item[] = [{ id: 'current' }]
    const { state } = undoSnapshot<Item>(h, current)
    expect(state).toEqual(snapshots[snapshots.length - 1])
    // 最旧快照（s0）已被丢弃：连撤 MAX_HISTORY 步后无法继续（历史深度受限）
    let hist = h
    let s = current
    for (let i = 0; i < MAX_HISTORY; i++) {
      const r = undoSnapshot<Item>(hist, s)
      hist = r.history
      s = r.state
    }
    expect(canUndo(hist)).toBe(false)
    expect(s).toEqual(snapshots[20]) // 第 20 号是容量内最旧，连撤到底应停在此
  })

  it('resetHistory 返回空历史（交易对切换场景）', () => {
    const h = pushSnapshot(createHistory(), [{ id: 'a' }])
    const fresh = resetHistory()
    expect(canUndo(fresh)).toBe(false)
    expect(fresh).not.toBe(h)
  })

  it('history 更新为不可变对象（不就地修改原历史）', () => {
    const h = createHistory()
    const h2 = pushSnapshot(h, [{ id: 'a' }])
    expect(h2).not.toBe(h)
    expect(h.past).toHaveLength(0)
    expect(h2.past).toHaveLength(1)
  })
})
