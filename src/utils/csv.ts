import type { Candle, Period } from '../chart/types'
import { PERIOD_MS } from '../chart/types'
import type { MainIndicatorKind, SubIndicatorKind } from '../components/ChartView'
import type { IndicatorParams } from '../indicators/params'
import { calcMA, calcEMA } from '../indicators/sma'
import { calcBOLL, bollToLines } from '../indicators/boll'
import { calcVWAP } from '../indicators/vwap'
import { calcSAR } from '../indicators/sar'
import { calcIchimoku } from '../indicators/ichimoku'
import { calcMACD } from '../indicators/macd'
import { calcKDJ } from '../indicators/kdj'
import { calcRSI } from '../indicators/rsi'
import {
  calcWR,
  calcOBV,
  calcATR,
  calcCCI,
  calcPSY,
  calcDMI,
  calcSTOCH,
  calcROC,
  calcMOM,
} from '../indicators/extras'
import { calcMFI } from '../indicators/mfi'
import { calcAO } from '../indicators/ao'
import { calcCMF } from '../indicators/cmf'
import { calcDonchian } from '../indicators/donchian'
import { calcAroon } from '../indicators/aroon'

/** 导出列：header + 与 K 线逐根对齐的数值（缺省为 null） */
export interface CsvColumn {
  header: string
  values: (number | null)[]
}

export interface CsvExportOptions {
  symbol: string
  period: Period
  mainIndicator: MainIndicatorKind
  subIndicator: SubIndicatorKind
  params: IndicatorParams
}

/** 数值 → CSV 字段：null/undefined/NaN/Infinity → 空串；-0 归一为 0；默认 8 位小数去尾零 */
export function fmtCsv(v: number | null | undefined, precision = 8): string {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return ''
  const n = Object.is(v, -0) ? 0 : v
  const s = n.toFixed(precision)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/** CSV 字段转义：含逗号/引号/换行/回车时包双引号，内嵌引号翻倍 */
export function escapeCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) return `"${field.replace(/"/g, '""')}"`
  return field
}

function cell(v: string | number | null | undefined): string {
  if (typeof v === 'number') return fmtCsv(v)
  return escapeCsvField(v ?? '')
}

/** 行数组 → CSV 文本（CRLF 行尾；每行字段自动转义） */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** 时间点数组 → 按 K 线时间对齐的列（缺失补 null） */
function columnFromPoints(
  candles: Candle[],
  header: string,
  points: { time: number; value: number }[],
): CsvColumn {
  const byTime = new Map(points.map((p) => [p.time, p.value]))
  return { header, values: candles.map((c) => byTime.get(c.time) ?? null) }
}

/** 当前主/副图指标的数值列（与 ChartView 相同算法/参数，导出时对全量 K 线计算） */
export function indicatorColumns(candles: Candle[], opts: CsvExportOptions): CsvColumn[] {
  const { mainIndicator, subIndicator, params } = opts
  const cols: CsvColumn[] = []

  if (mainIndicator === 'ma') {
    for (const p of params.maPeriods) cols.push(columnFromPoints(candles, `MA${p}`, calcMA(candles, p)))
  } else if (mainIndicator === 'ema') {
    const closes = candles.map((c) => ({ time: c.time, value: c.close }))
    for (const p of params.maPeriods) cols.push(columnFromPoints(candles, `EMA${p}`, calcEMA(closes, p)))
  } else if (mainIndicator === 'boll') {
    const b = bollToLines(calcBOLL(candles, params.bollPeriod, params.bollMult))
    cols.push(columnFromPoints(candles, 'BOLL_UPPER', b.upper))
    cols.push(columnFromPoints(candles, 'BOLL_MID', b.mid))
    cols.push(columnFromPoints(candles, 'BOLL_LOWER', b.lower))
  } else if (mainIndicator === 'vwap') {
    cols.push(columnFromPoints(candles, 'VWAP', calcVWAP(candles)))
  } else if (mainIndicator === 'sar') {
    cols.push(columnFromPoints(candles, 'SAR', calcSAR(candles, params.sarAfStart, params.sarAfStep, params.sarAfMax)))
  } else if (mainIndicator === 'ichimoku') {
    const r = calcIchimoku(candles, {
      tenkanPeriod: params.ichimokuTenkan,
      kijunPeriod: params.ichimokuKijun,
      senkouBPeriod: params.ichimokuSpanB,
      displacement: params.ichimokuDisplacement,
      periodSeconds: PERIOD_MS[opts.period] / 1000,
    })
    cols.push(columnFromPoints(candles, 'ICH_TENKAN', r.tenkan))
    cols.push(columnFromPoints(candles, 'ICH_KIJUN', r.kijun))
    cols.push(columnFromPoints(candles, 'ICH_SPANA', r.spanA))
    cols.push(columnFromPoints(candles, 'ICH_SPANB', r.spanB))
    cols.push(columnFromPoints(candles, 'ICH_CHIKOU', r.chikou))
  }

  if (subIndicator === 'volume') {
    // 成交量已含在基础列中，不重复
  } else if (subIndicator === 'macd') {
    const macd = calcMACD(candles, params.macdFast, params.macdSlow, params.macdSignal)
    cols.push(columnFromPoints(candles, 'DIF', macd.map((p) => ({ time: p.time, value: p.dif }))))
    cols.push(columnFromPoints(candles, 'DEA', macd.map((p) => ({ time: p.time, value: p.dea }))))
    cols.push(columnFromPoints(candles, 'MACD_HIST', macd.map((p) => ({ time: p.time, value: p.hist }))))
  } else if (subIndicator === 'kdj') {
    const kdj = calcKDJ(candles, params.kdjN, params.kdjM1, params.kdjM2)
    cols.push(columnFromPoints(candles, 'K', kdj.map((p) => ({ time: p.time, value: p.k }))))
    cols.push(columnFromPoints(candles, 'D', kdj.map((p) => ({ time: p.time, value: p.d }))))
    cols.push(columnFromPoints(candles, 'J', kdj.map((p) => ({ time: p.time, value: p.j }))))
  } else if (subIndicator === 'rsi') {
    cols.push(columnFromPoints(candles, 'RSI', calcRSI(candles, params.rsiPeriod)))
  } else if (subIndicator === 'wr') {
    cols.push(columnFromPoints(candles, 'WR', calcWR(candles, params.wrPeriod)))
  } else if (subIndicator === 'obv') {
    cols.push(columnFromPoints(candles, 'OBV', calcOBV(candles, params.obvMaPeriod)))
  } else if (subIndicator === 'atr') {
    cols.push(columnFromPoints(candles, 'ATR', calcATR(candles, params.atrPeriod)))
  } else if (subIndicator === 'dmi') {
    const dmi = calcDMI(candles, params.dmiPeriod)
    cols.push(columnFromPoints(candles, 'PDI', dmi.map((p) => ({ time: p.time, value: p.pdi }))))
    cols.push(columnFromPoints(candles, 'MDI', dmi.map((p) => ({ time: p.time, value: p.mdi }))))
    cols.push(columnFromPoints(candles, 'ADX', dmi.map((p) => ({ time: p.time, value: p.adx }))))
  } else if (subIndicator === 'cci') {
    cols.push(columnFromPoints(candles, 'CCI', calcCCI(candles, params.cciPeriod)))
  } else if (subIndicator === 'psy') {
    cols.push(columnFromPoints(candles, 'PSY', calcPSY(candles, params.psyPeriod)))
  } else if (subIndicator === 'stoch') {
    const { k, d } = calcSTOCH(candles, params.stochK, params.stochSmooth, params.stochD)
    cols.push(columnFromPoints(candles, 'K', k))
    cols.push(columnFromPoints(candles, 'D', d))
  } else if (subIndicator === 'roc') {
    cols.push(columnFromPoints(candles, 'ROC', calcROC(candles, params.rocPeriod)))
  } else if (subIndicator === 'mom') {
    cols.push(columnFromPoints(candles, 'MOM', calcMOM(candles, params.momPeriod)))
  } else if (subIndicator === 'mfi') {
    cols.push(columnFromPoints(candles, 'MFI', calcMFI(candles, params.mfiPeriod)))
  } else if (subIndicator === 'ao') {
    cols.push(columnFromPoints(candles, 'AO', calcAO(candles, params.aoFast, params.aoSlow)))
  } else if (subIndicator === 'cmf') {
    cols.push(columnFromPoints(candles, 'CMF', calcCMF(candles, params.cmfPeriod)))
  } else if (subIndicator === 'donchian') {
    const dc = calcDonchian(candles, params.donchianPeriod)
    cols.push(columnFromPoints(candles, 'DC_U', dc.map((p) => ({ time: p.time, value: p.upper }))))
    cols.push(columnFromPoints(candles, 'DC_L', dc.map((p) => ({ time: p.time, value: p.lower }))))
  } else if (subIndicator === 'aroon') {
    const aroon = calcAroon(candles, params.aroonPeriod)
    cols.push(columnFromPoints(candles, 'AROON_U', aroon.map((p) => ({ time: p.time, value: p.up }))))
    cols.push(columnFromPoints(candles, 'AROON_D', aroon.map((p) => ({ time: p.time, value: p.down }))))
  }

  return cols
}

/** 构建完整 CSV：time(ISO) + OHLCV + 当前指标列 */
export function buildCsv(candles: Candle[], opts: CsvExportOptions): string {
  const cols = indicatorColumns(candles, opts)
  const headers = ['time', 'open', 'high', 'low', 'close', 'volume', ...cols.map((c) => c.header)]
  const rows: (string | number | null | undefined)[][] = [headers]
  candles.forEach((c, i) => {
    rows.push([
      new Date(c.time * 1000).toISOString(),
      c.open,
      c.high,
      c.low,
      c.close,
      c.volume,
      ...cols.map((col) => col.values[i]),
    ])
  })
  return toCsv(rows)
}

/** 下载文件名：BTCUSDT_1h_20260816.csv */
export function csvFileName(symbol: string, period: Period, now = new Date()): string {
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  return `${symbol}_${period}_${ymd}.csv`
}
