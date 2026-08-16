/** 币安 REST /api/v3/klines 单根原始数据：[openTime, open, high, low, close, volume, closeTime, ...] */
export type RawKline = [
  number, string, string, string, string, string,
  number, string, number, string, string, string,
]

export interface RawKlineWsMessage {
  e: 'kline'
  k: {
    t: number
    o: string
    h: string
    l: string
    c: string
    v: string
    x: boolean
  }
}
