/**
 * H7/H8 设置快照：把全部 `kline-buty:*` 持久化键导出为一个 JSON 文件，导入时逐键写回。
 *
 * 编码约定（v2）：值一律按 **localStorage 里的原始字符串** 逐字搬运，导出侧不做 JSON.parse。
 * 原因是并非所有持久化值都是 JSON——`kline-buty:lastVersion`（"0.5.29"）、`kline-buty:lang`
 * （"en"）、`kline-buty:alertChannel` 由各自的读写方写成裸串。v1 实现「导出前 JSON.parse、
 * 导入后 JSON.stringify」，于是点击导出即在 lastVersion 上抛 SyntaxError（快照功能整体失效）；
 * 而按值类型猜要不要加引号又会在往返中把 usePersistedState 写的 `"BTCUSDT"` 降级成裸
 * `BTCUSDT`，下次启动读不回。v1 文件仍可读，按旧编码写回。
 */

/** 快照文件版本：2 = 原始字符串编码，1 = 旧的「解析后结构」编码 */
export const SNAPSHOT_VERSION = 2

/** 只搬运应用自己的持久化命名空间（K 线缓存是 `kline-cache:*`，不属于设置） */
const SETTINGS_PREFIX = 'kline-buty:'

/** 导出快照的形状：version + 逐键原始字符串 + 落盘时间 */
export interface SettingsSnapshotV2 {
  version: 2
  settings: Record<string, string>
  savedAt: number
}

/** localStorage 的最小子集，便于注入替身 */
export interface SettingsStorage {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** 收集全部设置键 → 快照 JSON 文本（不解析值，因此不会因为脏值/裸串抛错） */
export function buildSettingsSnapshot(storage: SettingsStorage, savedAt = Date.now()): string {
  const settings: Record<string, string> = {}
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !key.startsWith(SETTINGS_PREFIX)) continue
    const raw = storage.getItem(key)
    if (raw !== null) settings[key] = raw
  }
  const snap: SettingsSnapshotV2 = { version: SNAPSHOT_VERSION, settings, savedAt }
  return JSON.stringify(snap, null, 2)
}

/**
 * 校验并逐键写回快照文本；成功返回 true（调用方随后重载），失败返回 false 且不改写任何键。
 * v2 的字符串值逐字写回；v1 的值是已解析结构，写回时补回 JSON 编码。
 */
export function applySettingsSnapshot(text: string, storage: SettingsStorage): boolean {
  let parsed: { version?: unknown; settings?: unknown }
  try {
    parsed = JSON.parse(text) as { version?: unknown; settings?: unknown }
  } catch {
    return false
  }
  if (!parsed || typeof parsed !== 'object') return false
  const version = parsed.version
  if (version !== 1 && version !== SNAPSHOT_VERSION) return false
  if (!parsed.settings || typeof parsed.settings !== 'object') return false
  for (const [key, value] of Object.entries(parsed.settings as Record<string, unknown>)) {
    if (!key.startsWith(SETTINGS_PREFIX)) continue
    // v2 的值就是原始字符串；v1 的值是已解析结构，写回时补回 JSON 编码
    storage.setItem(key, version === SNAPSHOT_VERSION && typeof value === 'string' ? value : JSON.stringify(value))
  }
  return true
}
