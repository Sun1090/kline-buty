/**
 * I14 图表快照画廊：把图表截图（dataURL PNG）存到 localStorage，供 gallery 面板
 * 对比/删除。纯函数、可注入 storage 便于单测。
 *
 * 配额：单张上限 + 总量预算。超过预算时按 createdAt 最旧优先淘汰（FIFO），
 * 并跳过超过单张上限的写入——画廊只存轻量对比图，不替代截图导出。
 */

export interface ChartSnapshot {
  id: string
  /** 默认 `${symbol}_${period}_${本地时间}`，可由用户在画廊重命名 */
  name: string
  symbol: string
  period: string
  createdAt: number
  dataUrl: string
  width: number
  height: number
}

const KEY = 'kline-buty:snapshots'
/** 独立预算：与提醒/画线等其它 key 的用量分开计（storageMonitor 看全量） */
export const SNAPSHOT_MAX_ITEMS = 8
export const SNAPSHOT_BYTES_BUDGET = 2 * 1024 * 1024
/** 单张 dataURL 上限：超过直接拒绝（画廊缩略图 ~100-400KB，1MB 余量足够） */
export const SNAPSHOT_ITEM_MAX_BYTES = 1024 * 1024

/** 估算 UTF-16 存储用量（与浏览器实际计法一致） */
function storageBytes(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    n += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code >= 0xd800 && code <= 0xdfff ? 2 : 3
  }
  return n
}

function readAll(storage: Storage): ChartSnapshot[] {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as ChartSnapshot[]
    if (!Array.isArray(arr)) return []
    return arr.filter((s) => s && typeof s.dataUrl === 'string' && s.dataUrl.startsWith('data:image/png'))
  } catch {
    return []
  }
}

function writeAll(storage: Storage, snaps: ChartSnapshot[]) {
  try {
    storage.setItem(KEY, JSON.stringify(snaps))
  } catch {
    // QuotaExceeded 等：静默失败（保存入口已有反馈，画廊仍读旧数据）
  }
}

/** 读取全部快照（新在前） */
export function listSnapshots(storage: Storage = localStorage): ChartSnapshot[] {
  return readAll(storage).sort((a, b) => b.createdAt - a.createdAt)
}

export function saveSnapshot(
  snap: Omit<ChartSnapshot, 'id' | 'createdAt'>,
  storage: Storage = localStorage,
): string | null {
  const dataBytes = storageBytes(snap.dataUrl)
  if (dataBytes > SNAPSHOT_ITEM_MAX_BYTES) return null
  const now = Date.now()
  const item: ChartSnapshot = {
    ...snap,
    // 时间戳 + 短随机串：同一毫秒多存也能区分
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    // 严格递增：同毫秒连存时 +1，保证「新在前」排序稳定
    createdAt: Math.max(now, ...readAll(storage).map((s) => s.createdAt), now) + 1,
  }
  let snaps = readAll(storage)
  snaps.push(item)
  // 条数上限：淘汰最旧（readAll 无序，按 createdAt 升序）
  if (snaps.length > SNAPSHOT_MAX_ITEMS) {
    snaps = snaps.slice(snaps.length - SNAPSHOT_MAX_ITEMS)
  }
  // 总量预算：超了从最旧开始淘汰新条目
  const total = (): number => snaps.reduce((n, s) => n + storageBytes(s.dataUrl), 0)
  while (snaps.length > 1 && total() > SNAPSHOT_BYTES_BUDGET) {
    snaps.shift()
  }
  if (total() > SNAPSHOT_BYTES_BUDGET && snaps[snaps.length - 1]?.id === item.id) {
    // 大图挤爆预算且只剩它：单图超过预算也拒绝（宁可返回 null 让调用方提示）
    return null
  }
  writeAll(storage, snaps)
  return item.id
}

export function deleteSnapshot(id: string, storage: Storage = localStorage): boolean {
  const snaps = readAll(storage)
  const next = snaps.filter((s) => s.id !== id)
  if (next.length === snaps.length) return false
  writeAll(storage, next)
  return true
}

export function clearSnapshots(storage: Storage = localStorage): void {
  writeAll(storage, [])
}

/** 默认名称：BTCUSDT_1m_2026-09-09 23:20 样式（用于保存入口未手填名时） */
export function defaultSnapshotName(symbol: string, period: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${symbol}_${period}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}