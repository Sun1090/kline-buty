import type { SubIndicatorKind } from '../components/ChartView'

/** H12 副图固定 Y 轴范围（有界指标用） */
export interface ScaleRange {
  from: number
  to: number
}

/**
 * H12 副图 Y 轴自动/固定范围：有界指标返回其理论极值区间（固定显示，便于稳定比较超买超卖）。
 * - 0-100 型（RSI/WR/STOCH/MFI/PSY/Aroon）：固定 0-100
 * - CCI：固定 ±300（常用观察带）
 * - 其余（VOL/MACD/KDJ/OBV/ATR/DMI/ROC/MOM/BBW/AO/CMF/Donchian）：无固定界 → null（保持自动）
 */
export function subScaleFixedRange(kind: SubIndicatorKind): ScaleRange | null {
  switch (kind) {
    case 'rsi':
    case 'wr':
    case 'stoch':
    case 'mfi':
    case 'psy':
    case 'aroon':
      return { from: 0, to: 100 }
    case 'cci':
      return { from: -300, to: 300 }
    default:
      return null
  }
}
