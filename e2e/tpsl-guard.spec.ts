import { test, expect, type Page } from '@playwright/test'

/**
 * v0.5.x 止盈止损结算路径（?perf 合成行情，全程不联网）：
 * - 当前图表品种与持仓面板的行内编辑走同一条结算链路（usePositionSettlement）：命中只结算一次；
 * - 其他品种在压测模式无轮询价 → 守护不得凭空平仓；
 * - 移动止损：只朝有利方向推进止损线，回落到推进后的线才平仓；窄屏下价位编辑器（含 t% 输入）不换行溢出。
 */

const POSITIONS_KEY = 'kline-buty:positionsBySymbol'
const TRADES_KEY = 'kline-buty:paperTrades'

interface TradeRow {
  symbol: string
  kind: string
  side: string
  price: number
}

function stored(page: Page, key: string) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null') as unknown, key)
}

/** 压测合成序列基准价 50000（±5000 漂移）：止盈设在此之下即首帧命中 */
const LONG_WITH_LOW_TP = {
  entry: 40_000,
  quantity: 0.001,
  direction: 'long',
  takeProfit: 1_000,
  stopLoss: 500,
}

test.describe('v0.5 止盈止损结算', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
  })

  test('当前品种触止盈：按最新价结算一次并写流水（无跨品种重复结算）', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [POSITIONS_KEY, LONG_WITH_LOW_TP] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    await expect
      .poll(() => stored(page, TRADES_KEY), { timeout: 20_000 })
      .toBeTruthy()
    const trades = (await stored(page, TRADES_KEY)) as TradeRow[]
    expect(trades).toHaveLength(1)
    // 流水 side 记被平掉的方向：平多记 buy（面板按此显示「多」）
    expect(trades[0]).toMatchObject({ symbol: 'BTCUSDT', kind: 'close', side: 'buy' })
    expect(trades[0].price).toBeGreaterThan(40_000)

    // 再等若干实时帧：同一持仓不得被重复结算
    await page.waitForTimeout(5_000)
    expect((await stored(page, TRADES_KEY)) as TradeRow[]).toHaveLength(1)
    const positions = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: unknown } }
    expect(positions.BTCUSDT.long).toBeNull()
  })

  test('其他品种持仓在压测模式下保持挂账：无价源时守护静默', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ ETHUSDT: { long: payload, short: null } })),
      [POSITIONS_KEY, LONG_WITH_LOW_TP] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    // 覆盖若干个实时帧周期：非当前品种既无 tick 价也无轮询价 → 不应产生任何平仓
    await page.waitForTimeout(8_000)
    const trades = ((await stored(page, TRADES_KEY)) ?? []) as TradeRow[]
    expect(trades).toHaveLength(0)
    const positions = (await stored(page, POSITIONS_KEY)) as { ETHUSDT: { long: { entry: number } } }
    expect(positions.ETHUSDT.long.entry).toBe(40_000)
  })

  test('面板改止盈价到现价下方：保存即触价结算并留一条流水', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [
        POSITIONS_KEY,
        { entry: 40_000, quantity: 0.001, direction: 'long', takeProfit: 90_000, stopLoss: 30_000 },
      ] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const current = Number((await page.getByTestId('live-price').innerText()).replace(/[^\d.]/g, ''))
    // 止盈改到现价之下（仍高于开仓价 → 校验通过）→ 保存后必然触价
    const nextTp = Math.round(current * 0.98)
    expect(nextTp).toBeGreaterThan(40_000)

    const panel = await openPositionPanel(page)
    await panel.getByTestId('position-edit-levels-long').click()
    await expect(panel.getByTestId('position-level-tp-long')).toHaveValue('90000')
    await panel.getByTestId('position-level-tp-long').fill(String(nextTp))
    await panel.getByTestId('position-level-save-long').click()
    await expect(panel.getByTestId('position-levels-editor-long')).toHaveCount(0)

    await expect
      .poll(() => stored(page, TRADES_KEY), { timeout: 20_000 })
      .toBeTruthy()
    const trades = (await stored(page, TRADES_KEY)) as TradeRow[]
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({ symbol: 'BTCUSDT', kind: 'close', side: 'buy' })
    expect(trades[0].price).toBeGreaterThanOrEqual(nextTp)
    await expect
      .poll(async () => {
        const p = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: unknown } }
        return p.BTCUSDT.long
      })
      .toBeNull()
  })

  test('移动止损：面板设 t% 后止损随实时价推进，回落即按新线结算一次', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [
        POSITIONS_KEY,
        { entry: 40_000, quantity: 0.001, direction: 'long', takeProfit: 999_000, stopLoss: 30_000 },
      ] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    // 未开移动止损：实时价始终远在止损 30000 之上 → 若干帧内既不写回也不平仓
    await page.waitForTimeout(3_000)
    expect(((await stored(page, TRADES_KEY)) ?? []) as TradeRow[]).toHaveLength(0)
    let positions = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: { stopLoss: number } | null } }
    expect(positions.BTCUSDT.long?.stopLoss).toBe(30_000)

    const panel = await openPositionPanel(page)
    await panel.getByTestId('position-edit-levels-long').click()
    // 0.02% ≈ 现价 5 万出头的十位数：合成实时帧的抖动幅度足以触发回落
    await panel.getByTestId('position-level-trail-long').fill('0.02')
    await panel.getByTestId('position-level-save-long').click()

    await expect
      .poll(() => stored(page, TRADES_KEY), { timeout: 25_000 })
      .toBeTruthy()
    const trades = (await stored(page, TRADES_KEY)) as TradeRow[]
    expect(trades).toHaveLength(1)
    // 平仓价远高于原止损 30000：说明触发的线是推进后的止损，而非存值
    expect(trades[0]).toMatchObject({ symbol: 'BTCUSDT', kind: 'close', side: 'buy' })
    expect(trades[0].price).toBeGreaterThan(50_000)

    await page.waitForTimeout(5_000)
    expect((await stored(page, TRADES_KEY)) as TradeRow[]).toHaveLength(1)
    positions = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: { stopLoss: number } | null } }
    expect(positions.BTCUSDT.long).toBeNull()
  })

  test('同方向加仓：均价与数量合并，自己定的止盈/止损线不被重置', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [
        POSITIONS_KEY,
        { entry: 40_000, quantity: 0.002, direction: 'long', takeProfit: 90_000, stopLoss: 47_000 },
      ] as const,
    )
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const market = Number((await page.getByTestId('live-price').innerText()).replace(/[^\d.]/g, ''))

    const panel = await openPositionPanel(page)
    await panel.getByRole('button', { name: '开多', exact: true }).click()
    const inputs = panel.locator('input')
    // 开仓价交给输入框「聚焦即填现价」；数量加 0.001（表单默认止盈 3% / 止损 2%）
    await inputs.nth(0).click()
    await inputs.nth(1).fill('0.001')
    await page.getByRole('button', { name: '开仓', exact: true }).click()

    type Held = { BTCUSDT: { long: { entry: number; quantity: number; takeProfit: number; stopLoss: number } } }
    await expect
      .poll(async () => ((await stored(page, POSITIONS_KEY)) as Held).BTCUSDT.long?.quantity ?? 0)
      .toBeCloseTo(0.003, 12)
    const held = (await stored(page, POSITIONS_KEY)) as Held
    // 均价上移但仍低于现价；两条线保持用户设定值——按新均价重算会得到 ≈44.9k / 42.7k
    expect(held.BTCUSDT.long.entry).toBeGreaterThan(40_000)
    expect(held.BTCUSDT.long.entry).toBeLessThan(market)
    expect(held.BTCUSDT.long.takeProfit).toBe(90_000)
    expect(held.BTCUSDT.long.stopLoss).toBe(47_000)
    // 加仓不是结算：不该出现平仓流水
    const rows = (((await stored(page, TRADES_KEY)) ?? []) as TradeRow[]).filter((r) => r.kind === 'close')
    expect(rows).toHaveLength(0)
  })

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

  test('窄屏 320px：价位编辑器换行展示，面板不产生横向滚动', async ({ page }) => {
    await page.addInitScript(
      ([key, payload]) => localStorage.setItem(key, JSON.stringify({ BTCUSDT: { long: payload, short: null } })),
      [
        POSITIONS_KEY,
        { entry: 40_000, quantity: 0.001, direction: 'long', takeProfit: 90_000, stopLoss: 30_000 },
      ] as const,
    )
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    const panel = await openPositionPanel(page)
    await panel.getByTestId('position-edit-levels-long').click()

    const editor = panel.getByTestId('position-levels-editor-long')
    await expect(editor).toBeVisible()
    // 编辑器独占一行（flex-wrap 后宽度≈面板内容宽），三个价位输入可见
    await expect(panel.getByTestId('position-level-tp-long')).toBeInViewport()
    await expect(panel.getByTestId('position-level-sl-long')).toBeInViewport()
    // 宽松的移动止损（5% ≈ 现价下方两千多点）：合成帧不会触线，徽标可稳定断言
    await panel.getByTestId('position-level-trail-long').fill('5')
    await expect(panel.getByTestId('position-level-trail-long')).toBeInViewport()
    const editorBox = await editor.boundingBox()
    const panelBox = await panel.boundingBox()
    expect(editorBox && panelBox ? editorBox.width / panelBox.width : 0).toBeGreaterThan(0.6)
    // 移动端功能区不得横向溢出
    const overflow = await panel.evaluate((node) => node.scrollWidth - node.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await panel.getByTestId('position-level-save-long').click()
    await expect(editor).toHaveCount(0)
    await expect(panel.getByTestId('position-trail-long')).toBeVisible()
    const saved = (await stored(page, POSITIONS_KEY)) as {
      BTCUSDT: { long: { takeProfit: number; trailPct: number } }
    }
    expect(saved.BTCUSDT.long.takeProfit).toBe(90_000)
    expect(saved.BTCUSDT.long.trailPct).toBe(5)
    // 止损被推进到现价下方 5% 处（≈48000 以上），远高于种子值 30000
    await expect
      .poll(async () => {
        const p = (await stored(page, POSITIONS_KEY)) as { BTCUSDT: { long: { stopLoss: number } | null } }
        return p.BTCUSDT.long?.stopLoss ?? 0
      })
      .toBeGreaterThan(45_000)
  })
})
