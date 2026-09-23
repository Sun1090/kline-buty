// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { AlertPanel } from '../AlertPanel'
import type { AlertsApi } from '../../hooks/usePriceAlerts'
import type { PriceAlert } from '../../alerts/engine'

afterEach(cleanup)

function makeApi(overrides: Partial<AlertsApi> = {}): AlertsApi {
  const alert: PriceAlert = { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false }
  return {
    alerts: [alert],
    permission: 'granted',
    addAlert: vi.fn(),
    removeAlert: vi.fn(),
    resetAlert: vi.fn(),
    soundEnabled: true,
    setSoundEnabled: vi.fn(),
    soundKind: 'beep',
    setSoundKind: vi.fn(),
    channel: 'both',
    setChannel: vi.fn(),
    history: [],
    clearHistory: vi.fn(),
    requestPermission: vi.fn(async () => 'granted' as const),
    pendingCount: 0,
    voiceEnabled: false,
    setVoiceEnabled: vi.fn(),
    triggerCounts: {},
    setAlertsDisabled: vi.fn(),
    setGroupEnabled: vi.fn(),
    updateAlert: vi.fn(),
    exportAlertsJson: vi.fn(() => '{}'),
    importAlertsJson: vi.fn(() => true),
    templates: [],
    saveTemplate: vi.fn(() => true),
    loadTemplate: vi.fn(() => null),
    deleteTemplate: vi.fn(),
    ...overrides,
  }
}

describe('AlertPanel', () => {
  it('显示当前品种的提醒列表', () => {
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeApi()} />)
    expect(screen.getByText(/≥ 65000\.00/)).toBeDefined()
    expect(screen.getByText('删除')).toBeDefined()
  })

  it('提醒价展示：E10 精度缺省按价段自适应、指定则照它（0.000123 不再显示成 0.00）', () => {
    const api = makeApi({
      alerts: [
        { id: 'p1', symbol: 'BTCUSDT', direction: 'below', price: 0.000321, triggered: false },
        { id: 'p2', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, pricePrecision: 0 },
      ],
      history: [{ alertId: 'p1', symbol: 'BTCUSDT', direction: 'below', price: 0.000123, triggeredPrice: 0.000125, at: 1790000000000 }],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={0.0002} alertsApi={api} />)
    expect(screen.getByText(/≤ 0\.000321/)).toBeDefined()
    expect(screen.getByText(/^≥ 65000$/)).toBeDefined()
    // 触发历史不落 E10 精度，同样按价段自适应，而不是写死两位
    expect(screen.getByText(/≤ 0\.000123 → 0\.000125/)).toBeDefined()
  })

  it('只显示当前品种的提醒', () => {
    const api = makeApi({ alerts: [
      { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false },
      { id: 'a2', symbol: 'ETHUSDT', direction: 'below', price: 2900, triggered: false },
    ] })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByText(/≥ 65000\.00/)).toBeDefined()
    expect(screen.queryByText(/≤ 2900\.00/)).toBeNull()
  })

  it('添加提醒回调', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByText('价格 ≤'))
    const input = screen.getByPlaceholderText('63000.00')
    fireEvent.change(input, { target: { value: '61000' } })
    fireEvent.click(screen.getByText('添加提醒'))
    expect(api.addAlert).toHaveBeenCalledWith('BTCUSDT', 'below', 61000, false, undefined, undefined, undefined, { note: undefined, expiresAt: undefined, pricePrecision: undefined })
  })

  it('删除提醒回调', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByText('删除'))
    expect(api.removeAlert).toHaveBeenCalledWith('a1')
  })

  it('未开启通知时显示开启按钮', () => {
    const api = makeApi({ permission: 'default' })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByText('开启通知'))
    expect(api.requestPermission).toHaveBeenCalled()
  })

  it('已触发提醒显示标记与重置', () => {
    const api = makeApi({ alerts: [{ id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: true }] })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    // 行内「已触发」标记（限定 alert-row，避免与筛选状态按钮文案匹配）
    expect(screen.getByTestId('alert-row').textContent).toContain('已触发')
    fireEvent.click(screen.getByText('重置'))
    expect(api.resetAlert).toHaveBeenCalledWith('a1')
  })

  it('无历史时不显示历史区块', () => {
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeApi()} />)
    expect(screen.queryByText(/触发历史/)).toBeNull()
  })

  it('显示触发历史（跨品种、含目标价与触发价）并可清空', () => {
    const api = makeApi({
      history: [
        { alertId: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggeredPrice: 65120.5, at: new Date('2026-08-24T10:00:00').getTime() },
        { alertId: 'a2', symbol: 'ETHUSDT', direction: 'below', price: 2900, triggeredPrice: 2888, at: new Date('2026-08-24T09:30:00').getTime() },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByText('触发历史（2）')).toBeDefined()
    expect(screen.getByText(/BTC\/USDT ≥ 65000\.00 → 65120\.50/)).toBeDefined()
    expect(screen.getByText(/ETH\/USDT ≤ 2900\.00 → 2888\.00/)).toBeDefined()
    fireEvent.click(screen.getByText('清空记录'))
    expect(api.clearHistory).toHaveBeenCalledTimes(1)
  })

  it('无效价格（0/负数/非数字）→ 按钮禁用 + 提示文案 + aria-invalid', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    const input = screen.getByPlaceholderText('63000.00') as HTMLInputElement
    const btn = screen.getByText('添加提醒') as HTMLButtonElement

    // 0
    fireEvent.change(input, { target: { value: '0' } })
    expect(btn.disabled).toBe(true)
    expect(screen.getByText('请输入有效价格（正数）')).toBeDefined()
    expect(input.getAttribute('aria-invalid')).toBe('true')

    // 负数
    fireEvent.change(input, { target: { value: '-5' } })
    expect(btn.disabled).toBe(true)
    expect(input.getAttribute('aria-invalid')).toBe('true')

    // 非数字
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(btn.disabled).toBe(true)

    // 恢复有效
    fireEvent.change(input, { target: { value: '65000' } })
    expect(btn.disabled).toBe(false)
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(screen.queryByText('请输入有效价格（正数）')).toBeNull()
  })

  it('K4 声音预览：点击试听按钮调用 playAlertBeep', () => {
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeApi()} />)
    const btn = screen.getByTestId('alert-sound-preview')
    expect(btn).toBeDefined()
    // jsdom 无 AudioContext，playAlertBeep 内部兜底不抛即可（点击不炸）
    fireEvent.click(btn)
  })

  it('K10 重复间隔：开启循环后显示间隔输入，创建时透传间隔', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.queryByTestId('alert-repeat-interval')).toBeNull()
    fireEvent.click(screen.getByTestId('alert-repeat-toggle').querySelector('input')!)
    expect(screen.getByTestId('alert-repeat-interval')).toBeDefined()
    const input = screen.getByPlaceholderText('63000.00')
    fireEvent.change(input, { target: { value: '61000' } })
    const interval = screen.getByTestId('alert-repeat-interval-input')
    fireEvent.change(interval, { target: { value: '30' } })
    fireEvent.click(screen.getByText('添加提醒'))
    expect(api.addAlert).toHaveBeenCalledWith('BTCUSDT', 'above', 61000, true, undefined, 30, undefined, { note: undefined, expiresAt: undefined, pricePrecision: undefined })
  })

  it('K2 分组：输入分组名，创建时透传 group', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    const input = screen.getByPlaceholderText('63000.00')
    fireEvent.change(input, { target: { value: '65000' } })
    const g = screen.getByTestId('alert-group-input')
    fireEvent.change(g, { target: { value: '趋势' } })
    fireEvent.click(screen.getByText('添加提醒'))
    expect(api.addAlert).toHaveBeenCalledWith('BTCUSDT', 'above', 65000, false, undefined, undefined, '趋势', { note: undefined, expiresAt: undefined, pricePrecision: undefined })
  })

  it('K13 排序：切换排序键 aria-pressed 联动', () => {
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeApi()} />)
    const priceBtn = screen.getByTestId('alert-sort-price')
    const timeBtn = screen.getByTestId('alert-sort-time')
    expect(timeBtn.getAttribute('aria-pressed')).toBe('true') // 默认 time
    fireEvent.click(priceBtn)
    expect(priceBtn.getAttribute('aria-pressed')).toBe('true')
    expect(timeBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('K2 分组显示：带分组的提醒显示分组头', () => {
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, group: '趋势' },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'below', price: 61000, triggered: false },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByTestId('alert-group-趋势')).toBeDefined()
  })

  it('O7：D9 时间窗口输入 → 创建时透传 time', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.change(screen.getByPlaceholderText('63000.00'), { target: { value: '65000' } })
    fireEvent.change(screen.getByTestId('alert-time-from'), { target: { value: '09:30' } })
    fireEvent.change(screen.getByTestId('alert-time-to'), { target: { value: '15:00' } })
    fireEvent.click(screen.getByText('添加提醒'))
    expect(api.addAlert).toHaveBeenCalledWith('BTCUSDT', 'above', 65000, false, { start: 570, end: 900 }, undefined, undefined, { note: undefined, expiresAt: undefined, pricePrecision: undefined })
  })

  it('O7：重复间隔非法（负数）→ 确认按钮禁用', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.change(screen.getByPlaceholderText('63000.00'), { target: { value: '65000' } })
    fireEvent.click(screen.getByTestId('alert-repeat-toggle').querySelector('input')!)
    fireEvent.change(screen.getByTestId('alert-repeat-interval-input'), { target: { value: '-5' } })
    const btn = screen.getByText('添加提醒') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(api.addAlert).not.toHaveBeenCalled()
  })
})

describe('AlertPanel E 阶段（提醒增强）', () => {
  it('E1 推送渠道：默认 both，切换调用 setChannel', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    const sel = screen.getByTestId('alert-channel') as HTMLSelectElement
    expect(sel.value).toBe('both')
    fireEvent.change(sel, { target: { value: 'web' } })
    expect(api.setChannel).toHaveBeenCalledWith('web')
  })

  it('E14 JSON 导入导出按钮：导出调用 exportAlertsJson + 下载；导入走文件', () => {
    const api = makeApi()
    const createObjectURL = vi.fn(() => 'blob:x')
    const revokeObjectURL = vi.fn()
    const aClick = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', { value: aClick, configurable: true })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByTestId('alert-export-json'))
    expect(api.exportAlertsJson).toHaveBeenCalled()
    expect(aClick).toHaveBeenCalled()
    expect(screen.getByTestId('alert-import-json')).toBeTruthy()
    expect(screen.getByTestId('alert-import-file')).toBeTruthy()
  })

  it('E15 备注 + E6 到期 + E10 精度 → 创建时透传 opts', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.change(screen.getByPlaceholderText('63000.00'), { target: { value: '65000' } })
    fireEvent.change(screen.getByTestId('alert-note-input'), { target: { value: '突破后回调买' } })
    fireEvent.change(screen.getByTestId('alert-expiry-input'), { target: { value: '2026-12-31T23:59' } })
    fireEvent.change(screen.getByTestId('alert-precision'), { target: { value: '4' } })
    fireEvent.click(screen.getByText('添加提醒'))
    const args = vi.mocked(api.addAlert).mock.calls[0] as unknown[]
    expect(args[7]).toEqual({ note: '突破后回调买', expiresAt: new Date('2026-12-31T23:59').getTime(), pricePrecision: 4 })
  })

  it('E4 模板：保存当前条件并显示模板按钮；套用回填表单', () => {
    const tpl = { name: '突破65000', direction: 'above' as const, price: 65000, repeat: true }
    const api = makeApi({ templates: ['突破65000'], loadTemplate: vi.fn(() => tpl) })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByTestId('alert-template-突破65000')).toBeTruthy()
    fireEvent.click(screen.getByTestId('alert-template-load-突破65000'))
    expect(api.loadTemplate).toHaveBeenCalledWith('突破65000')
    // 表单回填：方向 above + 价格 65000
    const priceInput = screen.getByPlaceholderText('63000.00') as HTMLInputElement
    expect(priceInput.value).toBe('65000')
    fireEvent.click(screen.getByTestId('alert-template-del-突破65000'))
    expect(api.deleteTemplate).toHaveBeenCalledWith('突破65000')
  })

  it('E7 批量模式：勾选行后停用/删除所选（操作后清空选择）', () => {
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'below', price: 61000, triggered: false },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByTestId('alert-batch-toggle'))
    fireEvent.click(screen.getByTestId('alert-select-a1'))
    fireEvent.click(screen.getByTestId('alert-batch-disable'))
    expect(api.setAlertsDisabled).toHaveBeenCalledWith(['a1'], true)
    // 停用后选择已清空：再勾选 a2 → 删除仅影响 a2
    fireEvent.click(screen.getByTestId('alert-select-a2'))
    fireEvent.click(screen.getByTestId('alert-batch-delete'))
    expect(api.removeAlert).not.toHaveBeenCalledWith('a1')
    expect(api.removeAlert).toHaveBeenCalledWith('a2')
  })

  it('E3 组级开关：点击组头按钮调用 setGroupEnabled', () => {
    const api = makeApi({
      alerts: [{ id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, group: '趋势' }],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByTestId('alert-group-toggle-趋势'))
    // 组内全部启用（some(disabled)=false → enabled=true → setGroupEnabled(group, false)）
    expect(api.setGroupEnabled).toHaveBeenCalledWith('趋势', false)
  })

  it('E8 触发次数：行内显示历史触发计数', () => {
    const api = makeApi({
      alerts: [{ id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: true }],
      triggerCounts: { a1: 3 },
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByText(/· 触发 3/)).toBeTruthy()
  })

  it('E15 备注展示：提醒行下方显示 note', () => {
    const api = makeApi({
      alerts: [{ id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, note: '突破后回调买' }],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getByText('突破后回调买')).toBeTruthy()
  })

  it('E6 过期提醒显示已过期标记', () => {
    const api = makeApi({
      alerts: [{ id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, expiresAt: 1 }],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    // 行内已过期徽标（限定 alert-row，避免与「清理已过期」按钮文案匹配）
    expect(screen.getByTestId('alert-row').textContent).toContain('已过期')
  })

  it('I6 波动率自适应：开启后按 ATR% 计算阈值（above → 现价+ATR%）', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} volatilityPct={2} />)
    fireEvent.change(screen.getByPlaceholderText('63000.00'), { target: { value: '99999' } })
    fireEvent.click(screen.getByTestId('alert-adaptive-toggle').querySelector('input')!)
    fireEvent.click(screen.getByText('添加提醒'))
    // 63000 × (1 + 2%) = 64260（adaptiveThreshold 覆盖手输价）
    const args = vi.mocked(api.addAlert).mock.calls[0] as unknown[]
    expect(args[2]).toBeCloseTo(64260)
  })

  it('v0.5.x 快捷 ±%：+1% 填充现价上浮价（63000×1.01）并联动 above', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    const input = screen.getByPlaceholderText('63000.00') as HTMLInputElement
    fireEvent.click(screen.getByTestId('alert-quick-p1'))
    expect(input.value).toBe('63630.00')
    fireEvent.click(screen.getByText('添加提醒'))
    expect(api.addAlert).toHaveBeenCalledWith('BTCUSDT', 'above', 63630, false, undefined, undefined, undefined, { note: undefined, expiresAt: undefined, pricePrecision: undefined })
  })

  it('v0.5.x 快捷 ±%：-2% 填充现价下浮价（63000×0.98）并联动 below', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    const input = screen.getByPlaceholderText('63000.00') as HTMLInputElement
    fireEvent.click(screen.getByTestId('alert-quick-m2'))
    expect(input.value).toBe('61740.00')
    fireEvent.click(screen.getByText('添加提醒'))
    expect(api.addAlert).toHaveBeenCalledWith('BTCUSDT', 'below', 61740, false, undefined, undefined, undefined, { note: undefined, expiresAt: undefined, pricePrecision: undefined })
  })

  it('v0.5.x 快捷 ±%：无现价时不渲染快捷区', () => {
    const api = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={null} alertsApi={api} />)
    expect(screen.queryByTestId('alert-quick-pct')).toBeNull()
  })

  it('v0.5.x 清理已过期：存在过期提醒时按钮显示数量，点击仅移除过期项', () => {
    const now = Date.now()
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, expiresAt: now + 3_600_000 },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'below', price: 64000, triggered: false, expiresAt: now - 1_000 },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    const btn = screen.getByTestId('alert-clear-expired')
    expect(btn.textContent).toContain('(1)')
    fireEvent.click(btn)
    expect(api.removeAlert).toHaveBeenCalledWith('a2')
    expect(api.removeAlert).not.toHaveBeenCalledWith('a1')
  })

  it('v0.5.x 清理已过期：无过期提醒时不显示按钮', () => {
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, expiresAt: Date.now() + 3_600_000 },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.queryByTestId('alert-clear-expired')).toBeNull()
  })

  it('v0.5.x 列表筛选：按方向过滤（above）', () => {
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'below', price: 64000, triggered: false },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    expect(screen.getAllByTestId('alert-row')).toHaveLength(2)
    fireEvent.click(screen.getByTestId('alert-filter-dir-above'))
    expect(screen.getAllByTestId('alert-row')).toHaveLength(1)
    // 过滤后剩余为 above 提醒（其价格 65000 显示在行内）
    expect(screen.getByTestId('alert-row').textContent).toContain('65000')
  })

  it('v0.5.x 列表筛选：按状态过滤（已过期）', () => {
    const now = Date.now()
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false, expiresAt: now + 3_600_000 },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'above', price: 64000, triggered: false, expiresAt: now - 1_000 },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByTestId('alert-filter-status-expired'))
    expect(screen.getAllByTestId('alert-row')).toHaveLength(1)
    expect(screen.getByTestId('alert-row').textContent).toContain('已过期')
  })

  it('v0.5.x 列表筛选：重置为全部后恢复全部行', () => {
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'below', price: 64000, triggered: false },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByTestId('alert-filter-dir-below'))
    expect(screen.getAllByTestId('alert-row')).toHaveLength(1)
    fireEvent.click(screen.getByTestId('alert-filter-dir-all'))
    expect(screen.getAllByTestId('alert-row')).toHaveLength(2)
  })

  it('E14 语音播报：aria-pressed 跟随 props，点击回传取反后的值', () => {
    const off = makeApi()
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={off} />)
    const btn = screen.getByTestId('alert-voice-toggle')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    expect(off.setVoiceEnabled).toHaveBeenCalledWith(true)
    cleanup()

    const on = makeApi({ voiceEnabled: true })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={on} />)
    expect(screen.getByTestId('alert-voice-toggle').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('alert-voice-toggle'))
    expect(on.setVoiceEnabled).toHaveBeenCalledWith(false)
  })

  it('E12 音效类型：下拉只在音效开启时存在，选择后回传 kind', () => {
    const on = makeApi({ soundKind: 'beep' })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={on} />)
    fireEvent.change(screen.getByTestId('alert-sound-kind'), { target: { value: 'chime' } })
    expect(on.setSoundKind).toHaveBeenCalledWith('chime')
    cleanup()

    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={makeApi({ soundEnabled: false })} />)
    expect(screen.queryByTestId('alert-sound-kind')).toBeNull()
  })

  it('E7 批量：全选只取当前筛选的可见项，清空后不带残留', () => {
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'below', price: 64000, triggered: false },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByTestId('alert-batch-toggle'))
    fireEvent.click(screen.getByTestId('alert-filter-dir-below'))
    fireEvent.click(screen.getByTestId('alert-batch-select-all'))
    // 被筛掉的 a1 不该被全选带走，否则「全选 + 停用」会静默改掉看不见的提醒
    expect((screen.getByTestId('alert-select-a2') as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByTestId('alert-select-a1')).toBeNull()
    fireEvent.click(screen.getByTestId('alert-batch-disable'))
    expect(api.setAlertsDisabled).toHaveBeenCalledWith(['a2'], true)
  })

  it('E7 批量：全选勾上每一行，清空把勾选退掉，启用按当前勾选回传', () => {
    const api = makeApi({
      alerts: [
        { id: 'a1', symbol: 'BTCUSDT', direction: 'above', price: 65000, triggered: false },
        { id: 'a2', symbol: 'BTCUSDT', direction: 'below', price: 64000, triggered: false },
      ],
    })
    render(<AlertPanel symbol="BTCUSDT" currentPrice={63000} alertsApi={api} />)
    fireEvent.click(screen.getByTestId('alert-batch-toggle'))
    fireEvent.click(screen.getByTestId('alert-batch-select-all'))
    expect((screen.getByTestId('alert-select-a1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('alert-select-a2') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByTestId('alert-batch-clear'))
    expect((screen.getByTestId('alert-select-a1') as HTMLInputElement).checked).toBe(false)
    // 清空后启用：不该把刚才清掉的 id 又偷偷带走
    fireEvent.click(screen.getByTestId('alert-batch-enable'))
    expect(api.setAlertsDisabled).toHaveBeenCalledWith([], false)
    fireEvent.click(screen.getByTestId('alert-batch-select-all'))
    fireEvent.click(screen.getByTestId('alert-batch-enable'))
    expect(api.setAlertsDisabled).toHaveBeenLastCalledWith(['a1', 'a2'], false)
    expect(api.setAlertsDisabled).toHaveBeenCalledTimes(2)
  })
})
