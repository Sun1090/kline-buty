import { expect, test, type Page } from '@playwright/test'

async function openMore(page: Page) {
  const button = page.getByTestId('header-more')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openPosition(page: Page) {
  await openMore(page)
  await page.getByText('仓位', { exact: true }).click()
  await expect(page.getByRole('region', { name: '模拟仓位' })).toBeVisible()
}

async function openAlerts(page: Page) {
  await openMore(page)
  await page.getByText('提醒', { exact: true }).click()
  await expect(page.getByRole('region', { name: /价格提醒/ })).toBeVisible()
}

test.describe('2026-09 新功能回归（J/K/L 阶段）', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('J1 双向持仓：开多+开空并存，独立平仓', async ({ page }) => {
    // 用 QuickOrder 场景更贴近：通过 PositionPanel 表单依次开多、开空
    await openPosition(page)
    // 开多
    await page.getByText('开多', { exact: true }).click()
    const entryInput = page.getByPlaceholder(/[\d.,]+/).first()
    await entryInput.fill('60000')
    const qtyInput = page.getByText('数量', { exact: true }).locator('..').locator('input')
    await qtyInput.fill('1')
    await page.getByRole('button', { name: '开仓' }).click()
    await expect(page.getByTestId('position-row-long')).toBeVisible()
    // 开空
    await page.getByText('开空', { exact: true }).click()
    await page.getByPlaceholder(/[\d.,]+/).first().fill('60000')
    await qtyInput.fill('1')
    await page.getByRole('button', { name: '开仓' }).click()
    await expect(page.getByTestId('position-row-short')).toBeVisible()
    // 独立平空：short 槽位消失，long 仍在
    await page.getByTestId('position-row-short').locator('button').first().click()
    await expect(page.getByTestId('position-row-short')).toBeHidden()
    await expect(page.getByTestId('position-row-long')).toBeVisible()
  })

  test('J8 一键平所有持仓', async ({ page }) => {
    await openPosition(page)
    // 开多
    await page.getByText('开多', { exact: true }).click()
    await page.getByPlaceholder(/[\d.,]+/).first().fill('60000')
    await page.getByText('数量', { exact: true }).locator('..').locator('input').fill('1')
    await page.getByRole('button', { name: '开仓' }).click()
    await expect(page.getByTestId('position-row-long')).toBeVisible()
    // 全部平仓
    await page.getByTestId('position-close-all').click()
    await expect(page.getByTestId('position-row-long')).toBeHidden()
    await expect(page.getByText('暂无持仓')).toBeVisible()
  })

  test('K2 提醒分组 + K13 排序：分组显示与排序切换', async ({ page }) => {
    await openAlerts(page)
    // 创建带分组的提醒
    const priceInput = page.getByPlaceholder(/[\d.,]+/).first()
    await priceInput.fill('61000')
    const groupInput = page.getByTestId('alert-group-input')
    await groupInput.fill('趋势')
    await page.getByRole('button', { name: '添加提醒' }).click()
    // 分组头显示
    await expect(page.getByTestId('alert-group-趋势')).toBeVisible()
    // 排序切换 aria-pressed
    await page.getByTestId('alert-sort-price').click()
    await expect(page.getByTestId('alert-sort-price')).toHaveAttribute('aria-pressed', 'true')
  })

  test('L1 快捷键可配置：配置面板录制新键并生效', async ({ page }) => {
    // 打开快捷键帮助
    await page.keyboard.press('?')
    await expect(page.getByTestId('shortcuts-help')).toBeVisible()
    // 打开配置面板
    await page.getByTestId('shortcuts-configure').click()
    await expect(page.getByTestId('shortcuts-settings')).toBeVisible()
    // 录制 cycle-main 为新键 o
    await page.getByTestId('shortcut-cycle-main').click()
    await expect(page.getByTestId('shortcuts-recording')).toBeVisible()
    await page.keyboard.press('o')
    // 配置持久化
    await expect.poll(() => page.evaluate(() => {
      const keys = JSON.parse(localStorage.getItem('kline-buty:shortcutKeys') ?? '{}')
      return (keys['cycle-main'] ?? []).length
    })).toBeGreaterThan(0)
  })

  test('L5 动态字号：字号按钮显示百分比并循环切换', async ({ page }) => {
    await openMore(page)
    const btn = page.getByTestId('fontscale-toggle')
    const before = await btn.textContent()
    await btn.click()
    await expect
      .poll(async () => (await btn.textContent()) ?? '')
      .not.toBe(before)
    // 持久化写入非默认值
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kline-buty:fontScale'))).not.toBeNull()
  })

  test('M8 键盘画线：选水平线工具 → Enter 在十字光标处画线', async ({ page }) => {
    // 打开画线面板选水平线
    const drawingToggle = page.getByTestId('drawing-toggle')
    if ((await drawingToggle.getAttribute('aria-expanded')) !== 'true') await drawingToggle.click()
    await page.getByRole('button', { name: '水平线', exact: true }).click()
    // 十字光标定位到某根 K 线（方向键微移），Enter 放置锚点提交
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Enter')
    // 画线提交后落库
    await expect.poll(() => page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
      return Object.values(all).flat().length
    })).toBeGreaterThan(0)
  })
})
