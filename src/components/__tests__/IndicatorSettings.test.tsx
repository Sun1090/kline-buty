// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IndicatorSettings } from '../IndicatorSettings'
import { DEFAULT_INDICATOR_PARAMS, type IndicatorParams } from '../../indicators/params'
import type { MainIndicatorKind, SubIndicatorKind } from '../ChartView'

afterEach(cleanup)

function setup(main: MainIndicatorKind, sub: SubIndicatorKind, params: IndicatorParams = DEFAULT_INDICATOR_PARAMS) {
  const onChange = vi.fn()
  const onClose = vi.fn()
  render(<IndicatorSettings params={params} mainIndicator={main} subIndicator={sub} onChange={onChange} onClose={onClose} />)
  return { onChange, onClose }
}

function inputOf(label: string): HTMLInputElement {
  // label span 的直接父级即该字段所在行（span + input 同级）
  const row = screen.getByText(label).parentElement
  const input = row?.querySelector('input')
  if (!input) throw new Error(`no input for ${label}`)
  return input as HTMLInputElement
}

describe('IndicatorSettings', () => {
  it('RSI 字段：默认 14，修改触发 onChange', () => {
    const { onChange } = setup('ma', 'rsi')
    const input = inputOf('RSI 周期')
    expect(input.value).toBe('14')
    fireEvent.change(input, { target: { value: '7' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rsiPeriod: 7 }))
  })

  it('SAR 显示 3 个加速参数字段', () => {
    setup('sar', 'volume')
    for (const label of ['SAR 起始加速', 'SAR 加速步进', 'SAR 加速上限']) {
      expect(screen.getByText(label)).toBeDefined()
    }
  })

  it('Ichimoku 显示 4 个周期字段', () => {
    setup('ichimoku', 'volume')
    for (const label of ['转换线周期', '基准线周期', '先行带B周期', '位移周期']) {
      expect(screen.getByText(label)).toBeDefined()
    }
  })

  it.each([
    ['wr', 'WR 周期'],
    ['obv', 'OBV 平滑(1=原始)'],
    ['atr', 'ATR 周期'],
    ['dmi', 'DMI 周期'],
    ['cci', 'CCI 周期'],
    ['psy', 'PSY 周期'],
  ] as const)('副图 %s 显示 %s 字段', (sub, label) => {
    setup('ma', sub)
    expect(screen.getByText(label)).toBeDefined()
  })

  it.each([
    ['stoch', 'STOCH %K 周期'],
    ['roc', 'ROC 周期'],
    ['mom', 'MOM 周期'],
  ] as const)('副图 %s 显示 %s 字段', (sub, label) => {
    setup('ma', sub)
    expect(screen.getByText(label)).toBeDefined()
  })

  it('STOCH 三个参数均可修改', () => {
    const { onChange } = setup('ma', 'stoch')
    const k = inputOf('STOCH %K 周期')
    expect(k.value).toBe('14')
    fireEvent.change(k, { target: { value: '9' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ stochK: 9 }))
  })

  it('MA 周期列表输入：逗号分隔解析 + 过滤非法值', () => {
    const { onChange } = setup('ma', 'volume')
    const input = inputOf('MA 周期(逗号分隔)')
    fireEvent.change(input, { target: { value: '5, 20, 0, abc' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maPeriods: [5, 20] }))
  })

  it('VWAP + 无副图 → 显示提示', () => {
    setup('vwap', 'none')
    expect(screen.getByText('当前指标无参数可调')).toBeDefined()
  })

  it('G10 成交量显示均量线周期参数', () => {
    setup('vwap', 'volume')
    expect(inputOf('VOL 均量线周期(1=关)')).toBeDefined()
  })

  it('修改 SAR 上限参数触发 onChange', () => {
    const { onChange } = setup('sar', 'volume')
    const input = inputOf('SAR 加速上限')
    fireEvent.change(input, { target: { value: '0.3' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sarAfMax: 0.3 }))
  })

  it('关闭按钮触发 onClose', () => {
    const { onClose } = setup('ma', 'rsi')
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('H8 导出：按钮存在且可点击（触发下载不抛错）', () => {
    // jsdom 无 URL.createObjectURL → 导出会走 a.click，容忍不抛错
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    setup('ma', 'rsi')
    const btn = screen.getByTestId('indicator-export')
    expect(btn).toBeDefined()
    fireEvent.click(btn)
    expect(anchorClickSpy).toHaveBeenCalled()
    anchorClickSpy.mockRestore()
  })

  it('H8 导入：按钮触发文件选择器', () => {
    const fileClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    setup('ma', 'rsi')
    fireEvent.click(screen.getByTestId('indicator-import'))
    expect(fileClickSpy).toHaveBeenCalled()
    fileClickSpy.mockRestore()
  })

  it('H10 副图叠加：副图激活时显示叠加 select，默认 none', () => {
    const { onChange } = setup('ma', 'rsi')
    const select = screen.getByLabelText('副图叠加指标') as HTMLSelectElement
    expect(select.value).toBe('none')
    fireEvent.change(select, { target: { value: 'kdj' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ subOverlay: 'kdj' }))
  })

  it('H10 副图叠加：无副图时隐藏叠加 select', () => {
    setup('vwap', 'none')
    expect(screen.queryByLabelText('副图叠加指标')).toBeNull()
  })
})
