import { test, expect, type Page } from '@playwright/test'

/**
 * O8 E2E 场景扩充（第四批）：H12 副图 Y 轴固定范围切换 + 移动端 H9 信息条。
 * - H12：有界副图（RSI）显示固定范围开关，无界（VOL）不显示；开关 aria-pressed 往返切换
 * - 移动端 H9：触屏视口下信息条照常渲染 MA 值
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

test('H12 副图 Y 轴固定范围：VOL 无开关 → 切 RSI 出现 → 往返切换 aria-pressed', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  // 默认副图 volume（无界）→ 无固定范围开关
  await expect(page.getByTestId('sub-scale-toggle')).toHaveCount(0)
  // 更多面板副图区 → 切 RSI（0-100 有界）→ 开关出现
  await openPath(page, 'header-more')
  await page.getByTestId('sub-indicator-rsi').click()
  const toggle = page.getByTestId('sub-scale-toggle')
  await toggle.waitFor({ timeout: 10_000 })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  // 开启固定范围 → aria-pressed=true → 再点关闭
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})

test('移动端 H9：触屏视口下指标信息条照常渲染 MA 值', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const info = page.getByTestId('chart-indicator-last')
  await info.waitFor({ timeout: 15_000 })
  await expect(info).toContainText(/MA\d+\s*:\s*[\d.,]+/, { timeout: 15_000 })
})
