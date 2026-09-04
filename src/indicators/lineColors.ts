/** H11 指标线颜色自定义：line id → 覆盖色（空串/未收录视为不覆盖）。 */
export type LineColorOverrides = Record<string, string>

/** 单条线：id + 可选自带颜色（adapter 用 l.color ?? 默认表兜底） */
interface ColorableLine {
  id: string
  points: { time: number; value: number }[]
  color?: string
}

/**
 * H11 把持久化的线色覆盖合并进指标线数据：
 * 对每条线，overrides[id] 为有效色（非空、合法 hex）时写入 color；否则保留原值/undefined。
 * 返回新数组（不修改入参）。
 */
export function applyLineColorOverrides<T extends ColorableLine>(lines: T[], overrides: LineColorOverrides): T[] {
  return lines.map((l) => {
    const override = overrides[l.id]
    if (override && /^#[\da-fA-F]{6}$/.test(override)) {
      return { ...l, color: override }
    }
    return l
  })
}

/**
 * H11 当前指标可调色的线 id 列表（颜色编辑器列出项）。
 * 主图按 maPeriods 展开 MA/EMA；其余返回固定线 id；SAR 为圆点标记、AO/VOL 为柱状 → 无 line。
 */
export function editableLineIds(
  main: string,
  sub: string,
  maPeriods: number[],
  maOverlayEma = false,
  volMaEnabled = false,
): string[] {
  if (main === 'ma') {
    const ids = maPeriods.map((p) => `MA${p}`)
    if (maOverlayEma) ids.push(...maPeriods.map((p) => `EMA${p}`))
    return ids
  }
  if (main === 'ema') return maPeriods.map((p) => `EMA${p}`)
  const MAIN_IDS: Record<string, string[]> = {
    boll: ['BOLL_UPPER', 'BOLL_MID', 'BOLL_LOWER'],
    vwap: ['VWAP'],
    ichimoku: ['ICH_TENKAN', 'ICH_KIJUN', 'ICH_SPANA', 'ICH_SPANB', 'ICH_CHIKOU'],
    supertrend: ['ST_UP', 'ST_DOWN'],
  }
  const mainIds = MAIN_IDS[main]
  if (mainIds) return mainIds

  const SUB_IDS: Record<string, string[]> = {
    macd: ['DIF', 'DEA'],
    kdj: ['K', 'D', 'J'],
    rsi: ['RSI'],
    wr: ['WR'],
    obv: ['OBV'],
    atr: ['ATR'],
    dmi: ['PDI', 'MDI', 'ADX'],
    cci: ['CCI'],
    psy: ['PSY'],
    stoch: ['K', 'D'],
    roc: ['ROC'],
    mom: ['MOM'],
    bbw: ['BBW'],
    mfi: ['MFI'],
    cmf: ['CMF'],
    donchian: ['DC-U', 'DC-L', 'DC-BC'],
    aroon: ['A-U', 'A-D'],
  }
  const subIds = SUB_IDS[sub]
  if (subIds) return subIds
  // VOL 均量线（若开启）
  if (sub === 'volume' && volMaEnabled) return ['VOL-MA']
  return []
}
