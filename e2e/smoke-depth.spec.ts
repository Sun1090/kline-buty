import { expect, test } from '@playwright/test'
import { openMore, waitCandlesRendered, waitDepthReady, waitOrderBookReady } from './helpers/smoke'
/**
 * 盘口 / 深度 / 情绪面板端到端覆盖（自 smoke 拆出）：实时数据就绪、档位联动与主图参考线。
 * 这些用例走真实行情连接，与画线、冒烟规格分开跑便于定位环境抖动。
 */

test.describe('盘口与深度面板', () => {
  test('深度/筹码面板开关', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitDepthReady(page)
    await expect(page.getByText(/盘口深度/)).toBeVisible()
    // 深度图新标注：价差 + 买卖累计总量（K/M 紧凑格式）
    await expect(page.getByTestId('depth-chart')).toBeVisible()
    await expect(page.getByText(/spread \d/)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^买 [\d.]+[KM]?$/)).toBeVisible()
    await expect(page.getByText(/^卖 [\d.]+[KM]?$/)).toBeVisible()
    await openMore(page)
    await page.getByRole('button', { name: '筹码' }).click()
    await expect(page.getByText(/筹码分布/)).toBeVisible()
    await openMore(page)
    await page.getByRole('button', { name: '深度' }).click()
    await expect(page.getByText(/盘口深度/)).toHaveCount(0)
  })

  test('深度图 hover：十字线 + 买卖累计明细工具提示', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitDepthReady(page)
    const svg = page.getByTestId('depth-chart')
    await expect(svg).toBeVisible()
    const box = await svg.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    // hover 到图表中部 → 十字线 + 工具提示出现
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5)
    await expect(page.getByTestId('depth-crosshair')).toHaveCount(1, { timeout: 5_000 })
    const tip = page.getByTestId('depth-tooltip')
    await expect(tip).toBeVisible({ timeout: 5_000 })
    // 工具提示含买/卖累计文案
    await expect(tip.getByText(/买 [\d.]+[KM]?/)).toBeVisible()
    await expect(tip.getByText(/卖 [\d.]+[KM]?/)).toBeVisible()
    // 移出图表 → 工具提示与十字线消失
    await page.mouse.move(10, 10)
    await expect(page.getByTestId('depth-tooltip')).toHaveCount(0, { timeout: 5_000 })
    await expect(page.getByTestId('depth-crosshair')).toHaveCount(0)
  })

  test('盘口订单簿：开合 + 买卖档位/价差渲染', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await openMore(page)
    await page.getByRole('button', { name: '盘口', exact: true }).click()
    await expect(page.getByTestId('order-book')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/盘口订单簿/)).toBeVisible({ timeout: 15_000 })
    // 等待 WS 档位数据到达：买卖各 8 档 + 价差行
    await expect(page.getByTestId('ob-ask')).toHaveCount(8, { timeout: 15_000 })
    await expect(page.getByTestId('ob-bid')).toHaveCount(8)
    await expect(page.getByTestId('ob-spread')).toBeVisible()
    // 关闭
    await openMore(page)
    await page.getByRole('button', { name: '盘口', exact: true }).click()
    await expect(page.getByTestId('order-book')).toHaveCount(0)
  })

  test('盘口联动：hover 档位 → 主图参考价格线出现，移出清除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await openMore(page)
    await page.getByRole('button', { name: '盘口', exact: true }).click()
    const row = page.getByTestId('ob-bid').first()
    await expect(row).toBeVisible({ timeout: 20_000 })
    // 主图 canvas 上 accent 色（#2962ff）像素数
    const accentPx = () =>
      page.evaluate(() => {
        const c = document.querySelectorAll('canvas')[0]
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
        let n = 0
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
          if (a > 60 && r > 25 && r < 70 && g > 80 && g < 120 && b > 220) n++
        }
        return n
      })
    const box = await row.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeGreaterThan(200)
    // 移出盘口面板 → 参考线清除
    await page.mouse.move(10, 10)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeLessThan(50)
  })

  test('盘口联动：点击档位 → 主图限价标记线（移出鼠标仍保留，同档再点清除）', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await openMore(page)
    await page.getByRole('button', { name: '盘口', exact: true }).click()
    const row = page.getByTestId('ob-bid').first()
    await expect(row).toBeVisible({ timeout: 20_000 })
    const accentPx = () =>
      page.evaluate(() => {
        const c = document.querySelectorAll('canvas')[0]
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
        let n = 0
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
          if (a > 60 && r > 25 && r < 70 && g > 80 && g < 120 && b > 220) n++
        }
        return n
      })
    const box = await row.boundingBox()
    // 点击第一档 → 标记线出现；移出鼠标后仍保留（区别于 hover 参考线）
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.move(10, 10)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeGreaterThan(200)
    // 再点同一档 → 标记线清除
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.move(10, 10)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeLessThan(50)
  })

  test('盘口快速下单：买盘快捷「买」→ 价格预填 + 金额估算 → 确认打开模拟仓位', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await waitOrderBookReady(page)
    const bid = page.getByTestId('ob-bid').first()
    const bidPrice = Number(await bid.getAttribute('data-price'))
    const bidBox = await bid.boundingBox()
    await page.mouse.move(bidBox!.x + bidBox!.width / 2, bidBox!.y + bidBox!.height / 2)
    await expect(bid.getByTestId('qo-buy')).toBeVisible({ timeout: 5000 })
    await bid.getByTestId('qo-buy').click()
    await expect(page.getByTestId('quick-order')).toBeVisible()
    await expect(page.getByTestId('quick-order').getByText('买入')).toBeVisible()
    await page.getByTestId('quick-order').locator('input').last().fill('0.01')
    // 价格预填为盘口档位价（容差 2%），金额估算展示
    const buyPrice = Number(await page.getByTestId('qo-price').inputValue())
    expect(Math.abs(buyPrice - bidPrice) / bidPrice).toBeLessThan(0.02)
    await expect(page.getByText(/预估金额/)).toBeVisible()
    await expect(page.getByText(/手续费/)).toBeVisible()
    // 确认 → 模拟仓位面板打开，持仓行含浮动盈亏数值（「浮动盈亏」标签已移除，改断言数值）
    await page.getByTestId('qo-confirm').click()
    await expect(page.getByTestId('position-row-long')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('position-row-long')).toContainText(/-?\d+(\.\d+)?/)
    await expect(page.getByText('模拟仓位')).toBeVisible()
  })

  test('盘口快速下单：卖盘快捷「卖」→ 确认后建立空头仓位', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await waitOrderBookReady(page)
    const ask = page.getByTestId('ob-ask').first()
    const askBox = await ask.boundingBox()
    await page.mouse.move(askBox!.x + askBox!.width / 2, askBox!.y + askBox!.height / 2)
    await expect(ask.getByTestId('qo-sell')).toBeVisible({ timeout: 5000 })
    await ask.getByTestId('qo-sell').click()
    await expect(page.getByTestId('quick-order')).toBeVisible()
    await expect(page.getByTestId('quick-order').getByText('卖出')).toBeVisible()
    await page.getByTestId('quick-order').locator('input').last().fill('0.01')
    await page.getByTestId('qo-confirm').click()
    await expect(page.getByTestId('position-row-short')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('position-row-short')).toContainText(/-?\d+(\.\d+)?/)
  })

  test('情绪面板：开合 + 四类指标标题可见 + 直连 CORS 修复后真实数据渲染', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await openMore(page)
    await page.getByRole('button', { name: '情绪' }).click()
    await expect(page.getByText('全账户多空比')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('大户持仓多空比')).toBeVisible()
    await expect(page.getByText('主动买卖比')).toBeVisible()
    await expect(page.getByText('未平仓 24h')).toBeVisible()
    // 直连模式下 /futures/data 必须走 fapi.binance.com（带 CORS）：
    // 有「多/空」+ 百分比即代表真实数据已渲染，而非停留在「加载中」
    const panel = page.locator('[data-testid="sentiment-panel"]')
    await expect(panel.getByText(/多/).first()).toBeVisible({ timeout: 15_000 })
    await expect(panel.getByText(/%/).first()).toBeVisible({ timeout: 20_000 })
    await expect(panel.getByText(/^\d+\.\d+$/).first()).toBeVisible()
    await openMore(page)
    await page.getByRole('button', { name: '情绪' }).click()
    await expect(page.getByText('全账户多空比')).toHaveCount(0)
  })

})
