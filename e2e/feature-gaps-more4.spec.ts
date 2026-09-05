import { test, expect, type Page } from '@playwright/test'

/**
 * O8 E2E 场景扩充（第五批）：叠加指标恢复 + 桌面周期点击持久化。
 * - 叠加指标 select 恢复 none → 信息条副图行消失（回到纯主图）
 * - 桌面周期：点击切换活跃周期 → 刷新后持久化保留
 */

async function waitCandlesRendered(page: Page) {
  const hasCandles = () =>
    page.waitForFunction(
      () => {
        const cs = [...document.querySelectorAll('canvas')]
        for (const c of cs) {
          try {
            const ctx = c.getContext('2d')
            if (!ctx || c.width < 100) continue
            const d = ctx.getImageData(0, 0, c.width, c.height).data
            for (let i = 0; i < d.length; i += 200) {
              const r = d[i]
              const g = d[i + 1]
              const b = d[i + 2]
              if ((g > 140 && r < 80 && b < 140) || (r > 200 && g < 120 && b < 120)) return true
            }
          } catch {
            /* noop */
          }
        }
        return false
      },
      { timeout: 30_000 },
    )
  try {
    await hasCandles()
  } catch {
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await hasCandles()
  }
}

async function openPath(page: Page, testId: string) {
  const btn = page.getByTestId(testId)
  const open = await btn.getAttribute('aria-expanded')
  if (open !== 'true') await btn.click()
}

test('叠加指标 select 恢复 none → 信息条副图行消失（回到纯主图）', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const info = page.getByTestId('chart-indicator-last')
  await info.waitFor({ timeout: 15_000 })
  // 参数面板：副图叠加切 RSI（产生叠加行）→ 再切回 none
  await openPath(page, 'header-more')
  await page.getByRole('button', { name: '参数' }).click()
  const overlay = page.getByLabel('副图叠加指标')
  await overlay.waitFor({ timeout: 10_000 })
  await overlay.selectOption('rsi')
  await expect(overlay).toHaveValue('rsi')
  await expect.poll(() => info.textContent(), { timeout: 15_000 }).toMatch(/RSI\s*:/)
  await overlay.selectOption('none')
  await expect(overlay).toHaveValue('none')
  // 副图行消失：信息条不再含 RSI/DIF/DEA 等副图行，但主图 MA 仍在
  await expect
    .poll(() => info.textContent(), { timeout: 15_000 })
    .not.toMatch(/RSI\s*:|DIF\s*:|DEA\s*:/)
  await expect(info).toContainText(/MA\d+\s*:\s*[\d.,]+/)
})

test('桌面周期：点击切换活跃周期 → 刷新后持久化保留', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  const bar = page.getByTestId('period-bar')
  await bar.waitFor({ timeout: 15_000 })
  const activeBefore = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="period-"]')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )?.dataset?.testid,
  )
  // 点击一个当前非活跃周期（先捕获 testid，断言针对具体按钮而非重解析定位器）
  const target = page.locator('[data-testid^="period-"][aria-pressed="false"]').first()
  const chosen = await target.getAttribute('data-testid')
  await target.click()
  await expect(page.getByTestId(chosen!)).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
  expect(chosen).not.toBe(activeBefore)
  // 刷新 → 持久化保留
  await page.reload()
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  const activeAfter = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="period-"]')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )?.dataset?.testid,
  )
  expect(activeAfter).toBe(chosen)
})

test('移动端周期：点击切换活跃周期 → 刷新后持久化保留', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  const bar = page.getByTestId('period-bar')
  await bar.waitFor({ timeout: 15_000 })
  const activeBefore = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="period-"]')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )?.dataset?.testid,
  )
  const target = page.locator('[data-testid^="period-"][aria-pressed="false"]').first()
  const chosen = await target.getAttribute('data-testid')
  await target.click()
  await expect(page.getByTestId(chosen!)).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
  expect(chosen).not.toBe(activeBefore)
  await page.reload()
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  const activeAfter = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="period-"]')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )?.dataset?.testid,
  )
  expect(activeAfter).toBe(chosen)
})

test('M 快捷键循环主图指标 → 信息条内容同步更新', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const info = page.getByTestId('chart-indicator-last')
  await info.waitFor({ timeout: 15_000 })
  const before = await info.textContent()
  await page.keyboard.press('m')
  // 主图指标循环切换 → 信息条行集变化且仍为数值行
  await expect
    .poll(async () => {
      const now = await info.textContent()
      return now !== before && /[\d.,]+/.test(now ?? '')
    }, { timeout: 15_000 })
    .toBe(true)
})
