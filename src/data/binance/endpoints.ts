export type EndpointMode = 'proxy' | 'direct'

/**
 * P12 自定义数据源：localStorage 可配置 REST 基址与 WS 基址（覆盖默认直连域名）。
 * key 固定 `kline-buty:customDataBases`，JSON `{ api?, ws? }`。
 * 用于自建行情代理/内部网关/测试环境等场景。
 */
export const CUSTOM_BASES_KEY = 'kline-buty:customDataBases'

export interface CustomDataBases {
  /** REST 基址（缺省 data-api.binance.vision / fapi 按路径推断） */
  api?: string
  /** WS 基址（缺省 stream.binance.com / fstream 按模式推断） */
  ws?: string
}

/** 读自定义数据源配置（非法/损坏 → null） */
export function readCustomBases(storage: Pick<Storage, 'getItem'> = localStorage): CustomDataBases | null {
  try {
    const raw = storage.getItem(CUSTOM_BASES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CustomDataBases
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed
  } catch {
    return null
  }
}

/** 写自定义数据源配置（返回是否成功） */
export function writeCustomBases(bases: CustomDataBases, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  try {
    storage.setItem(CUSTOM_BASES_KEY, JSON.stringify(bases))
    return true
  } catch {
    return false
  }
}

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
  dapi: 'https://dapi.binance.com',
}

/**
 * COIN-M 期货兜底域名（部分网络环境 fapi.binance.com 被阻断时，
 * dapi.binance.com 提供同构的 /dapi/v1 与 /futures/data 公开端点，带 CORS）。
 */
export const DAPI_BASE = 'https://dapi.binance.com'

/** USDT-M 交易对 → COIN-M 永续交易对（BTCUSDT → BTCUSD_PERP） */
export function toCoinMSymbol(symbol: string): string {
  return symbol.endsWith('USDT') ? `${symbol.slice(0, -4)}USD_PERP` : symbol
}

/** USDT-M 交易对 → COIN-M pair（BTCUSDT → BTCUSD，futures/data 用 pair= 参数） */
export function toCoinMPair(symbol: string): string {
  return symbol.endsWith('USDT') ? `${symbol.slice(0, -4)}USD` : symbol
}

/** 构造请求 URL：direct 模式拼直连域名（路径原样保留）；P12 自定义 api 基址优先 */
export function buildApiUrl(mode: EndpointMode, path: string, custom?: CustomDataBases | null): string {
  if (mode === 'proxy') return path
  if (custom?.api) {
    const base = custom.api.replace(/\/$/, '')
    return base + path
  }
  // /fapi（永续行情）与 /futures/data（衍生品情绪）均来自 fapi.binance.com（带 CORS）；
  // data-api.binance.vision 的 /futures/data 不带 CORS 头，浏览器直连会被拦截
  const key = path.startsWith('/fapi') || path.startsWith('/futures') ? 'fapi' : 'api'
  return DIRECT_BASES[key] + path
}

/** 直连 WebSocket 地址（币安公开流允许跨域）；P12 自定义 ws 基址优先 */
export function buildWsUrl(mode: EndpointMode, stream: string, custom?: CustomDataBases | null): string {
  if (mode === 'proxy') {
    const protocol = typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss' : 'ws'
    const host = typeof location !== 'undefined' ? location.host : 'localhost'
    return `${protocol}://${host}/ws/${stream}`
  }
  if (custom?.ws) {
    const base = custom.ws.replace(/\/$/, '')
    return `${base}/ws/${stream}`
  }
  return `wss://stream.binance.com:9443/ws/${stream}`
}

/** 直连模式盘口深度候选流：spot → USDT-M 期货 → COIN-M 期货（流名同构/同构化） */
const DIRECT_WS_BASES = ['wss://stream.binance.com:9443', 'wss://fstream.binance.com']
const COINM_WS_BASE = 'wss://dstream.binance.com'

export function buildDepthWsUrls(mode: EndpointMode, stream: string, coinmStream?: string, custom?: CustomDataBases | null): string[] {
  if (mode === 'proxy') {
    const protocol = typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss' : 'ws'
    const host = typeof location !== 'undefined' ? location.host : 'localhost'
    return [`${protocol}://${host}/ws/${stream}`]
  }
  if (custom?.ws) {
    const base = custom.ws.replace(/\/$/, '')
    return [`${base}/ws/${stream}`]
  }
  const urls = DIRECT_WS_BASES.map((b) => `${b}/ws/${stream}`)
  if (coinmStream) urls.push(`${COINM_WS_BASE}/ws/${coinmStream}`)
  return urls
}

/** 仅测试用：重置检测缓存 */
export function __resetModeForTests() {
  cached = null
}
