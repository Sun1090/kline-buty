import type { DrawingTool } from '../drawings/logic'
import type { MessageKey } from '../i18n'

/** 工具栏选项：固定缩写走 label（MA/VOL…），否则走 labelKey 字典（SAR/无…） */
export interface HeaderOption {
  value: string
  label?: string
  labelKey?: MessageKey
}

export const TYPE_OPTIONS: HeaderOption[] = [
  { value: 'candlestick', labelKey: 'chartType.candlestick' },
  { value: 'line', labelKey: 'chartType.line' },
  { value: 'area', labelKey: 'chartType.area' },
]

export const MAIN_OPTIONS: HeaderOption[] = [
  { value: 'ma', label: 'MA' },
  { value: 'ema', label: 'EMA' },
  { value: 'boll', label: 'BOLL' },
  { value: 'vwap', label: 'VWAP' },
  { value: 'sar', labelKey: 'indicator.sar' },
  { value: 'ichimoku', labelKey: 'indicator.ichimoku' },
  { value: 'none', labelKey: 'common.none' },
]

export const SUB_OPTIONS: HeaderOption[] = [
  { value: 'volume', label: 'VOL' },
  { value: 'macd', label: 'MACD' },
  { value: 'kdj', label: 'KDJ' },
  { value: 'rsi', label: 'RSI' },
  { value: 'wr', label: 'WR' },
  { value: 'obv', label: 'OBV' },
  { value: 'atr', label: 'ATR' },
  { value: 'dmi', label: 'DMI' },
  { value: 'cci', label: 'CCI' },
  { value: 'psy', label: 'PSY' },
  { value: 'stoch', label: 'STOCH' },
  { value: 'roc', label: 'ROC' },
  { value: 'mom', label: 'MOM' },
  { value: 'none', labelKey: 'common.none' },
]

export const DRAWING_TOOLS: { value: DrawingTool; labelKey: MessageKey }[] = [
  { value: 'none', labelKey: 'drawing.mouse' },
  { value: 'horizontal', labelKey: 'drawing.horizontal' },
  { value: 'vertical', labelKey: 'drawing.vertical' },
  { value: 'cross', labelKey: 'drawing.cross' },
  { value: 'trend', labelKey: 'drawing.trend' },
  { value: 'extended', labelKey: 'drawing.extended' },
  { value: 'angle', labelKey: 'drawing.angle' },
  { value: 'channel', labelKey: 'drawing.channel' },
  { value: 'fib', labelKey: 'drawing.fib' },
  { value: 'rect', labelKey: 'drawing.rect' },
  { value: 'ellipse', labelKey: 'drawing.ellipse' },
  { value: 'circle', labelKey: 'drawing.circle' },
  { value: 'triangle', labelKey: 'drawing.triangle' },
  { value: 'wedge', labelKey: 'drawing.wedge' },
  { value: 'arc', labelKey: 'drawing.arc' },
  { value: 'ray', labelKey: 'drawing.ray' },
  { value: 'hray', labelKey: 'drawing.hray' },
  { value: 'vray', labelKey: 'drawing.vray' },
  { value: 'parray', labelKey: 'drawing.parray' },
  { value: 'pchannel', labelKey: 'drawing.pchannel' },
  { value: 'text', labelKey: 'drawing.text' },
  { value: 'fibext', labelKey: 'drawing.fibext' },
  { value: 'fibchannel', labelKey: 'drawing.fibchannel' },
  { value: 'fibfan', labelKey: 'drawing.fibfan' },
  { value: 'fibtimed', labelKey: 'drawing.fibTime' },
  { value: 'cycle', labelKey: 'drawing.cycle' },
  { value: 'fibtz', labelKey: 'drawing.fibtz' },
  { value: 'timerange', labelKey: 'drawing.timerange' },
  { value: 'pband', labelKey: 'drawing.pband' },
  { value: 'pricerange', labelKey: 'drawing.pricerange' },
  { value: 'rr', labelKey: 'drawing.rr' },
  { value: 'gann', labelKey: 'drawing.gann' },
  { value: 'gannbox', labelKey: 'drawing.gannbox' },
  { value: 'pricelabel', labelKey: 'drawing.pricelabel' },
  { value: 'arrow', labelKey: 'drawing.arrow' },
  { value: 'polyline', labelKey: 'drawing.polyline' },
  { value: 'measure', labelKey: 'drawing.measure' },
  { value: 'speedlines', labelKey: 'drawing.speedlines' },
  { value: 'regchan', labelKey: 'drawing.regchan' },
  { value: 'hchannel', labelKey: 'drawing.hchannel' },
  { value: 'pitchfork', labelKey: 'drawing.pitchfork' },
  { value: 'xabcd', labelKey: 'drawing.xabcd' },
  { value: 'elliott', labelKey: 'drawing.elliott' },
]

/** 选项标签：有 labelKey 走字典，否则为固定缩写（MA/VOL 等） */
export function optionLabel(o: HeaderOption, t: (k: MessageKey) => string): string {
  return o.labelKey ? t(o.labelKey) : (o.label ?? o.value)
}
