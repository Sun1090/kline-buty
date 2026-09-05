/**
 * N11 localStorage 容量监控：估算当前用量（字符数 → KB/MB），
 * 超阈值时给出提示。纯函数便于单测。
 *
 * 估算口径：key + value 的 UTF-8 字节数近似（实际浏览器按 16-bit code unit 计，
 * 这里用字节估算作为上界，足够保守）。
 */

/** 阈值：超过该 KB 视为高水位（提示用户清理） */
export const WARN_THRESHOLD_KB = 4000
/** 硬上限：接近该值可能触发 QuotaExceededError */
export const HARD_LIMIT_KB = 10_000

/** 字符串 UTF-8 字节估算 */
export function utf8Bytes(s: string): number {
  let bytes = 0
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdfff) {
      // 代理对：合并计算（高代理 + 低代理 = 4 字节）
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < s.length) {
        const low = s.charCodeAt(i + 1)
        if (low >= 0xdc00 && low <= 0xdfff) {
          bytes += 4
          i++
          continue
        }
      }
      bytes += 3
    } else bytes += 3
  }
  return bytes
}

/** 遍历 localStorage 统计用量（字节 + 条目数） */
export function measureStorage(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): { bytes: number; keys: number } {
  let bytes = 0
  let keys = 0
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k === null) continue
    const v = storage.getItem(k)
    bytes += utf8Bytes(k) + utf8Bytes(v ?? '')
    keys++
  }
  return { bytes, keys }
}

export interface StorageHealth {
  /** 已用字节 */
  bytes: number
  /** 条目数 */
  keys: number
  /** 已用 KB */
  usedKb: number
  /** 是否接近硬上限（> 80% 的 5MB 配额估算） */
  nearLimit: boolean
  /** 是否超过警告阈值 */
  warn: boolean
}

/** 汇总用量健康度 */
export function checkStorageHealth(storage: Pick<Storage, 'length' | 'key' | 'getItem'>, warnKb = WARN_THRESHOLD_KB): StorageHealth {
  const { bytes, keys } = measureStorage(storage)
  const usedKb = bytes / 1024
  return {
    bytes,
    keys,
    usedKb,
    // 常见 5MB 配额：> 80% 视为接近上限
    nearLimit: usedKb > 5_000 * 0.8,
    warn: usedKb > warnKb,
  }
}

/** 提示文案（i18n 用）——返回是否需要提醒与用量 */
export function storageAdvisory(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): { warn: boolean; message: string } {
  const h = checkStorageHealth(storage)
  if (!h.warn) return { warn: false, message: '' }
  const size = h.usedKb > 1024 ? `${(h.usedKb / 1024).toFixed(1)} MB` : `${h.usedKb.toFixed(0)} KB`
  return { warn: true, message: size }
}
