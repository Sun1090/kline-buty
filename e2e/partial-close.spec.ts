import { test, expect, type Page } from '@playwright/test'

/**
 * v0.5.x 模拟盘部分平仓（减仓）：?perf 合成行情，全程不联网。
 * 减仓按现价结算「减掉的那一份」，剩余仓位保留开仓价与止盈/止损/移动止损设置；
 * 减到全量等价于全平（槽位清空、只记一条 close）。
 */

const POSITIONS_KEY = 'kline-buty:positionsBySymbol'
const TRADES_KEY = 'kline-buty:paperTrades'
const BALANCE_KEY = 'kline-buty:paperBalance'

interface SlotState {
  entry: number
  quantity: number
  direction: string
  takeProfit: number
  stopLoss: number
  trailPct: number
}
type PositionsState = Record<string, { long: SlotState | null; short: SlotState | null }>

interface TradeRow {
  symbol: string
  kind: string
  side: string
  qty: number
  price: number
}

function stored(page: Page, key: string) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null') as unknown, key)
}

const slotOf = async (page: Page) =>
  ((await stored(page, POSITIONS_KEY)) as PositionsState).BTCUSDT.long

/** 等减仓流水落库：持仓与流水由两次不同的 state 写入，负载高时后者会落后于前者 */
async function closes(page: Page, expected: number) {
  await expect
    .poll(async () =>
      (((await stored(page, TRADES_KEY)) ?? []) as TradeRow[]).filter((r) => r.kind === 'close').length,
    )
    .toBe(expected)
  return (((await stored(page, TRADES_KEY)) ?? []) as TradeRow[]).filter((r) => r.kind === 'close')
}

/** 打开「仓位」面板：桌面走 header-more，窄屏（<768px）走 mobile-more 弹层 */
async function openPositionPanel(page: Page) {
  const desktop = page.getByTestId('header-more')
  const more = (await desktop.count()) > 0 ? desktop : page.getByTestId('mobile-more')
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
  await page.getByRole('button', { name: '仓位', exact: true }).click()
  const panel = page.getByRole('region', { name: '模拟仓位' })
  await expect(panel).toBeVisible()
  return panel
}

// 止盈 90k / 止损 30k 都远在合成价（≈50.7k）之外 → 结算链路不会插手，纯看手动减仓。
// 带 trailPct 是为了顺带验证「减仓不丢已推进的移动止损」：止损线由 tick 自行上移，与减仓无关。
const SEED = { entry: 40_000, quantity: 0.002, direction: 'long', takeProfit: 90_000, stopLoss: 30_000, trailPct: 2 }

test.describe('v0.5 模拟盘部分平仓', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [POSITIONS_KEY, SEED] as const,
    )
  })

  test('减仓 25%：剩余仓位保留设置，流水记一条该部分的 close', async ({ page }) => {
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const market = Number((await page.getByTestId('live-price').innerText()).replace(/[^\d.]/g, ''))

    const panel = await openPositionPanel(page)
    const before = await slotOf(page)
    expect(before?.quantity).toBe(0.002)
    await panel.getByTestId('position-reduce-toggle-long').click()
    // 预填一半
    await expect(panel.getByTestId('position-reduce-qty-long')).toHaveValue(String(SEED.quantity / 2))
    await panel.getByTestId('position-reduce-ratio-long-25').click()

    const remaining = await panel.getByTestId('position-reduce-editor-long').count()
    expect(remaining).toBe(0)
    await expect
      .poll(async () => (await slotOf(page))?.quantity ?? 0)
      .toBeCloseTo(0.0015, 12)
    const kept = await slotOf(page)
    // 开仓价、止盈线、移动止损比例原样保留；止损线只允许由 tick 单向上推进
    expect(kept?.entry).toBe(40_000)
    expect(kept?.takeProfit).toBe(90_000)
    expect(kept?.trailPct).toBe(2)
    expect(kept?.stopLoss).toBeGreaterThanOrEqual(before?.stopLoss ?? 0)

    const rows = await closes(page, 1)
    expect(rows[0]).toMatchObject({ symbol: 'BTCUSDT', side: 'buy' })
    expect(rows[0].qty).toBeCloseTo(0.0005, 12)
    // 按现价结算：减仓价就是当时的最新价
    expect(Math.abs(rows[0].price - market)).toBeLessThan(market * 0.02)
    // 浮盈落袋：余额高于初始 10,000
    const balance = (await stored(page, BALANCE_KEY)) as number
    expect(balance).toBeGreaterThan(10_000)
  })

  test('超量与非法数量：面板内报错、不改持仓', async ({ page }) => {
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const panel = await openPositionPanel(page)
    await panel.getByTestId('position-reduce-toggle-long').click()
    // 数量框是 input[type=number]：非数字被浏览器直接吞掉，非法只有超量/零/负数三种
    for (const bad of ['0.5', '0', '-1']) {
      await panel.getByTestId('position-reduce-qty-long').fill(bad)
      await panel.getByTestId('position-reduce-confirm-long').click()
      await expect(panel.getByTestId('position-reduce-error')).toBeVisible()
    }
    expect((await slotOf(page))?.quantity).toBe(0.002)
    expect(await closes(page, 0)).toHaveLength(0)
  })

  test('减到全量：等价于全平，槽位清空且只记一条 close', async ({ page }) => {
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const panel = await openPositionPanel(page)
    await panel.getByTestId('position-reduce-toggle-long').click()
    await panel.getByTestId('position-reduce-qty-long').fill(String(0.002))
    await panel.getByTestId('position-reduce-confirm-long').click()

    await expect.poll(() => slotOf(page)).toBeNull()
    const rows = await closes(page, 1)
    expect(rows[0].qty).toBeCloseTo(0.002, 12)
    await expect(panel.getByText('暂无持仓')).toBeVisible()
  })

  test('窄屏 320px：减仓编辑器换行展示，比例芯片与数量输入可见且不横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const panel = await openPositionPanel(page)
    await panel.getByTestId('position-reduce-toggle-long').click()
    const editor = panel.getByTestId('position-reduce-editor-long')
    await expect(editor).toBeVisible()
    for (const pct of [25, 50, 75]) {
      await expect(panel.getByTestId(`position-reduce-ratio-long-${pct}`)).toBeInViewport()
    }
    await expect(panel.getByTestId('position-reduce-qty-long')).toBeInViewport()
    await expect(panel.getByTestId('position-reduce-confirm-long')).toBeInViewport()
    const overflow = await panel.evaluate((node) => node.scrollWidth - node.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    // 真实减一次：320px 下交互可用
    await panel.getByTestId('position-reduce-ratio-long-50').click()
    await expect.poll(async () => (await slotOf(page))?.quantity ?? 0).toBeCloseTo(0.001, 12)
    await closes(page, 1)
  })
})
