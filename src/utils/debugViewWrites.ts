/**
 * #222 诊断插桩的门控开关：URL 带 `?debugViewWrites` 时，多图视角同步链路的两个写点
 * （本格上报逃逸 / 接收格应用外部指令）会向 console 打 `debugViewWrites:` 前缀的日志。
 * 纯观测面：不改变任何行为，不开 flag 时零开销（模块级求值一次）。
 */
export function debugViewWritesEnabled(search: string = typeof location === 'undefined' ? '' : location.search): boolean {
  return new URLSearchParams(search).has('debugViewWrites')
}

/** 带 flag 时的日志出口（前缀固定，e2e 按前缀收集） */
export function logViewWrite(kind: 'report' | 'apply' | 'claim' | 'release', detail: Record<string, unknown>, enabled: boolean): void {
  if (!enabled) return
  console.debug(`debugViewWrites: ${kind} ${JSON.stringify(detail)}`)
}
