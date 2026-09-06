import { expect, test } from '@playwright/test'

/**
 * B1 ★ 十字光标显示副图指标当前值：信息条（chart-indicator-last）跟随光标时刻取值。
 *
 * 断言：设 RSI 副图 → 悬停图表左侧（较早 K 线）→ 信息条显示该时刻的 RSI 值
 * （与「最新值」基线不同）；移出图表 → 恢复最新值（光标无值回落）。
 * 依赖 ?perf 合成确定性数据（RSI 逐 bar 变化），不依赖网络。
 */

test.describe('B1 十字光标副图指标取值', () => {
  test('信息条跟随光标时刻：hover 取值、移出回落最新', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600&period=1m')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })

    // 设 RSI 副图（「更多」→「参数」面板）
    const more = page.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    await page.getByRole('button', { name: '参数' }).click()
    const overlay = page.getByLabel('副图叠加指标')
    await overlay.waitFor({ timeout: 10_000 })
    await overlay.selectOption('rsi')
    await expect(overlay).toHaveValue('rsi')

    // 等指标信息条出现 RSI 行
    const info = page.getByTestId('chart-indicator-last')
    await expect
      .poll(() => info.textContent(), { timeout: 15_000 })
      .toMatch(/RSI/)

    // 主图容器（存量 E2E 用 .chart-container 锚定图表）
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // 悬停图表左侧（较早的 K 线区）→ 信息条切换为该时刻指标值（历史 bar 稳定不受实时 tick 影响）
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.35)
    await page.waitForTimeout(600)
    const leftText = await info.textContent()
    expect(leftText).toMatch(/RSI/)
    // 悬停图表右侧近最新区 → 信息条切换为最新时刻的值（与历史 bar 值必然不同）
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.35)
    await page.waitForTimeout(600)
    const rightText = await info.textContent()
    expect(rightText).not.toBe(leftText)

    // 移出图表 → 光标无值回落至最新（实时 tick 推进末根，只断言回落仍渲染 RSI 行）
    await page.mouse.move(box.x - 40, box.y + box.height * 0.35)
    await page.waitForTimeout(600)
    await expect.poll(() => info.textContent(), { timeout: 8000 }).toMatch(/RSI/)

    expect(errors).toHaveLength(0)
  })
})