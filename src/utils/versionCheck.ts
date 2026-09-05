/**
 * P4 更新提示：版本检测纯函数。
 *
 * 思路：构建时把 package.json version 写入 `<meta name="app-version">`（见 docs-build/vite 注入或 index.html 静态）。
 * 前端启动读当前 meta 版本，与 localStorage 记录的「上次运行版本」对比：
 * - 首次运行：记录当前版本，不提示；
 * - 再次运行版本升级：返回 true（有新版本，提示刷新），并更新记录。
 * 纯函数便于单测。
 */

export const VERSION_KEY = 'kline-buty:lastVersion'

/** 读 meta app-version（缺省 ''） */
export function readMetaVersion(doc: { querySelector: (s: string) => { getAttribute: (n: string) => string | null } | null }): string {
  return doc.querySelector('meta[name="app-version"]')?.getAttribute('content') ?? ''
}

/** 读上次运行版本（localStorage 缺省 ''） */
export function readLastVersion(storage: { getItem: (k: string) => string | null }): string {
  try {
    return storage.getItem(VERSION_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * 检测是否有新版本：
 * - 无 meta 版本（非注入环境）→ false，不干扰；
 * - 首次运行（无记录）→ 记录当前版本，false；
 * - 版本升级 → true 并更新记录；同版本 → false。
 * 返回 { hasUpdate, version }。
 */
export function checkVersionUpdate(
  currentVersion: string,
  storage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void },
): { hasUpdate: boolean; version: string } {
  if (!currentVersion) return { hasUpdate: false, version: '' }
  const last = readLastVersion(storage)
  if (!last) {
    // 首次运行：只记录不提示
    try {
      storage.setItem(VERSION_KEY, currentVersion)
    } catch {
      /* noop */
    }
    return { hasUpdate: false, version: currentVersion }
  }
  if (last !== currentVersion) {
    try {
      storage.setItem(VERSION_KEY, currentVersion)
    } catch {
      /* noop */
    }
    return { hasUpdate: true, version: currentVersion }
  }
  return { hasUpdate: false, version: currentVersion }
}

/** 版本号字符串比较（semver 三段，用于可选的范围判断；缺省按不相等处理） */
export function isNewerVersion(current: string, last: string): boolean {
  if (!current || !last) return current !== last
  const toNum = (v: string) => v.split('.').map((n) => Number(n) || 0)
  const a = toNum(current)
  const b = toNum(last)
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return false
}
