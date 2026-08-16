export type EndpointMode = 'proxy' | 'direct'

/**
 * 数据端点模式：
 * - proxy：走 nginx/vite 代理（相对路径 /api /ws /fapi），生产自建部署
 * - direct：静态托管（GitHub Pages / Vercel）无代理，直连币安公开 API（支持 CORS）
 *
 * 检测方式：请求 /api/v3/ping，返回 JSON → 代理可用；否则（SPA fallback 返回
 * HTML 或 404）→ 直连。结果缓存，仅检测一次。
 */
let cached: Promise<EndpointMode> | null = null

export function detectMode(): Promise<EndpointMode> {
  if (!cached) {
    cached = (async (): Promise<EndpointMode> => {
      try {
        const res = await fetch('/api/v3/ping')
        const ct = res.headers.get('content-type') ?? ''
        if (res.ok && ct.includes('json')) return 'proxy'
      } catch {
        /* 网络失败 → 直连兜底 */
      }
      return 'direct'
    })()
  }
  return cached
}

const DIRECT_BASES: Record<string, string> = {
  api: 'https://data-api.binance.vision',
  fapi: 'https://fapi.binance.com',
}

/** 构造请求 URL：direct 模式拼直连域名（路径原样保留） */
export function buildApiUrl(mode: EndpointMode, path: string): string {
  if (mode === 'proxy') return path
  const key = path.startsWith('/fapi') ? 'fapi' : 'api'
  return DIRECT_BASES[key] + path
}

/** 直连 WebSocket 地址（币安公开流允许跨域） */
export function buildWsUrl(mode: EndpointMode, stream: string): string {
  if (mode === 'proxy') {
    const protocol = typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss' : 'ws'
    const host = typeof location !== 'undefined' ? location.host : 'localhost'
    return `${protocol}://${host}/ws/${stream}`
  }
  return `wss://stream.binance.com:9443/ws/${stream}`
}

/** 仅测试用：重置检测缓存 */
export function __resetModeForTests() {
  cached = null
}
