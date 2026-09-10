import { describe, expect, it, beforeEach } from 'vitest'
import {
  listSnapshots,
  saveSnapshot,
  deleteSnapshot,
  clearSnapshots,
  defaultSnapshotName,
  SNAPSHOT_MAX_ITEMS,
  SNAPSHOT_ITEM_MAX_BYTES,
  type ChartSnapshot,
} from '../snapshotGallery'

function makeSnap(overrides: Partial<ChartSnapshot> = {}): Omit<ChartSnapshot, 'id' | 'createdAt'> {
  return {
    // 一个 100 字符的伪 dataURL（约 100+ 字节），加 symbol/period 区分
    dataUrl: `data:image/png;base64,${'A'.repeat(80)}`,
    name: 'test',
    symbol: 'BTCUSDT',
    period: '1m',
    width: 800,
    height: 400,
    ...overrides,
  }
}

describe('snapshotGallery（I14 图表快照画廊存储）', () => {
  let storage: Storage
  beforeEach(() => {
    // 可读写的内存 Storage 替身
    const map = new Map<string, string>()
    storage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
      clear: () => map.clear(),
      key: (i) => [...map.keys()][i] ?? null,
      length: map.size,
    } as Storage
  })

  it('保存后读取（新在前）并默认名称含品种/周期/时间', () => {
    const name = defaultSnapshotName('BTCUSDT', '1m', new Date(2026, 8, 9, 23, 30))
    expect(name).toBe('BTCUSDT_1m_2026-09-09 23:30')
    const id1 = saveSnapshot({ ...makeSnap(), name: 'first' }, storage)
    const id2 = saveSnapshot({ ...makeSnap({ symbol: 'ETHUSDT', name: 'second' }) }, storage)
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    const list = listSnapshots(storage)
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('second') // 新在前
    expect(list[1].name).toBe('first')
    expect(list.every((s) => s.id && s.createdAt > 0)).toBe(true)
  })

  it('条数上限 FIFO：超出淘汰最旧', () => {
    for (let i = 0; i < SNAPSHOT_MAX_ITEMS + 3; i++) {
      saveSnapshot(makeSnap({ name: `snap-${i}` }), storage)
    }
    const list = listSnapshots(storage)
    expect(list).toHaveLength(SNAPSHOT_MAX_ITEMS)
    // 最旧的 3 条被淘汰，最新的 SNAPSHOT_MAX_ITEMS 条保留
    for (let i = SNAPSHOT_MAX_ITEMS + 2; i >= 3; i--) {
      expect(list.some((s) => s.name === `snap-${i}`)).toBe(true)
    }
    expect(list.some((s) => s.name === 'snap-0')).toBe(false)
  })

  it('单张超上限拒绝保存（返回 null 且不写入）', () => {
    const huge = { ...makeSnap(), dataUrl: `data:image/png;base64,${'B'.repeat(SNAPSHOT_ITEM_MAX_BYTES)}` }
    const id = saveSnapshot(huge, storage)
    expect(id).toBeNull()
    expect(listSnapshots(storage)).toHaveLength(0)
  })

  it('删除与清空', () => {
    const id = saveSnapshot(makeSnap(), storage)!
    expect(deleteSnapshot('nope', storage)).toBe(false)
    expect(deleteSnapshot(id, storage)).toBe(true)
    expect(listSnapshots(storage)).toHaveLength(0)
    saveSnapshot(makeSnap(), storage)
    clearSnapshots(storage)
    expect(listSnapshots(storage)).toHaveLength(0)
  })

  it('坏数据防御：非法 JSON / 非数组 / 非 PNG 条目被忽略', () => {
    const map = new Map<string, string>()
    const bad = () =>
      ({
        getItem: (k) => map.get(k) ?? null,
        setItem: (k, val) => void map.set(k, val),
        removeItem: (k) => void map.delete(k),
        clear: () => map.clear(),
        key: (i) => [...map.keys()][i] ?? null,
        length: map.size,
      }) as Storage
    map.set('kline-buty:snapshots', 'not-json{')
    expect(listSnapshots(bad())).toEqual([])
    map.set('kline-buty:snapshots', JSON.stringify([{ ...makeSnap(), dataUrl: 'https://x' }]))
    expect(listSnapshots(bad())).toEqual([])
  })
})