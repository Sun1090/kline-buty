/**
 * 行情数字格式化的三档价格精度与两档成交额缩写。
 * 各档位对应固定 UI 场景：精度是刻意的展示策略，调用方按场景选函数，不要在组件内另写阈值。
 */

/** 高精度价格：≥1000 两位小数、≥1 四位、否则六位（十字光标信息窗 / 行情信息条） */
export function fmtPricePrecise(v: number): string {
  return v >= 1000 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(6)
}

/** 紧凑价格：≥1000 一位小数、否则两位（盘口 / 深度图，窄列容不下更长小数） */
export function fmtPriceCompact(v: number): string {
  return v >= 1000 ? v.toFixed(1) : v.toFixed(2)
}

/** 中精度价格：≥1000 整数、≥1 两位、否则四位（自选列表 / 筹码分布轴标） */
export function fmtPriceMedium(v: number): string {
  return v >= 1000 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4)
}

/** 成交额缩写 B/M：≥1e9 十亿、≥1e6 百万、否则整数（行情信息条 24h 额） */
export function fmtVolumeBM(v: number): string {
  return v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v.toFixed(0)
}

/** 成交量缩写 M/K：≥1e6 百万、≥1e3 千、否则整数（十字光标成交量行） */
export function fmtVolumeMK(v: number): string {
  return v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(2)}K` : v.toFixed(0)
}

/**
 * E8 数字格式国际化（千分位）：按 locale 对价格加千分位分隔，精度策略与 fmtPricePrecise 一致。
 * 用于大数字展示场景（行情列表/信息条成交额等），locale 由调用方传入（localeFor(lang)）。
 * Intl 在窄环境下可能抛异常（极旧引擎），回退为纯 toFixed。
 */
export function fmtPriceLocale(v: number, locale: string): string {
  const digits = v >= 1000 ? 2 : v >= 1 ? 4 : 6
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
      useGrouping: true,
    }).format(v)
  } catch {
    return v.toFixed(digits)
  }
}
