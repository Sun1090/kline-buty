/** 带 HTTP 状态码的请求错误：调用方要区分「该品种在这个市场不存在」（400，重试永远不会成功）与网络/5xx（值得重试） */
export class BinanceHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'BinanceHttpError'
  }
}

/** 币安对未知品种回 400（-1121 Invalid symbol）；请求体在失败时未被解析，状态码即可判定 */
export function isSymbolNotFound(error: unknown): boolean {
  return error instanceof BinanceHttpError && error.status === 400
}
