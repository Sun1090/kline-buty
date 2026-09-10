import { expect, test, type Page } from '@playwright/test'

/**
 * I14 图表快照画廊：保存快照 → More「快照画廊」可见 → 预览/删除。
 * 依赖 ?perf=600 合成数据（离线），不依赖交易所网络。
 */

async function gotoChart(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/?perf=600')
  await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  await page.waitForFunction(() => {
    const c = [...document.querySelectorAll('canvas')].find((x) => x.width > 200)
    return Boolean(c)
  })
}

test.describe('I14 图表快照画廊', () => {
  test('存快照 → 画廊可见 → 预览 → 删除', async ({ page }) => {
    await gotoChart(page)

    // 保存快照：反馈文案切换
    const saveBtn = page.getByTestId('snapshot-save')
    await saveBtn.click()
    await expect(saveBtn).toHaveText(/已保存到画廊/, { timeout: 5_000 })

    // More → 快照画廊
    await page.getByTestId('header-more').click()
    await page.getByRole('button', { name: '快照画廊', exact: true }).click()
    await expect(page.getByTestId('snapshot-gallery')).toBeVisible()
    await expect(page.getByTestId('snapshot-grid')).toBeVisible()
    const items = page.getByTestId(/snapshot-item-/)
    await expect(items.first()).toBeVisible()

    // 缩略图预览全图
    await page.locator('[data-testid^="snapshot-item-"] img').first().click()
    await expect(page.getByTestId('snapshot-preview')).toBeVisible()
    await page.getByTestId('snapshot-preview').click({ position: { x: 8, y: 8 } })
    await expect(page.getByTestId('snapshot-preview')).toHaveCount(0)

    // 删除后回到空状态
    await page.locator('[data-testid^="snapshot-delete-"]').first().click()
    await expect(page.getByTestId('snapshot-empty')).toBeVisible()
  })
})