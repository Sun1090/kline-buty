import { expect, test, type Page } from '@playwright/test'

/**
 * A2 ★ 周期切换右侧锚定（不跳到最新之外）：切换后视图相对位置稳定。
 *
 * 断言杠杆用「回到最新」按钮（back-to-latest）：回看历史时出现、停在最新时隐藏。
 * - 停在最新处切周期（1m→5m→1h→1m）→ 仍锚定最新，按钮保持隐藏（不越界）；
 * - 回看历史处切周期 → 仍远离最新，按钮保持可见（不跳回最新）。
 * 精确的右缘时间↔跨度映射由单测 anchorRangeForSwitch（cull.test.ts）覆盖，
 * 此处验证端到端接线（perf 合成数据确定性 + window.__klineButyPerf 就绪探针）。
 */

const PERF_COUNT = 5_000

interface PerfProbe {
  period?: string
  candles?: unknown[]
}

async function perfPeriod(page: Page): Promise<string | undefined> {
  return page.evaluate(() => (window.__klineButyPerf as PerfProbe | undefined)?.period)
}

function waitPerfReady(page: Page, period: string) {
  return expect.poll(() => perfPeriod(page), { timeout: 20_000 }).toBe(period)
}

/** 主图拖拽向右 → 视图进入历史（复用 smoke 平移模式，靠持久视图远离最新） */
async function panIntoHistory(page: Page) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 1; i <= 45; i++) {
    await page.mouse.move(cx + i * 18, cy, { steps: 2 })
  }
  await page.mouse.up()
}

test.describe('A2 周期切换右侧锚定', () => {
  test('停在最新切周期不越界；回看切周期不跳最新（双向稳定 + 范围显示）', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    const back = page.getByTestId('back-to-latest')
    const visibleRange = page.getByTestId('chart-visible-range')

    await page.addInitScript(() => localStorage.clear())
    await page.goto(`/?perf=${PERF_COUNT}&period=1m`)
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 30_000 })
    await waitPerfReady(page, '1m')
    // 初始停在最新 → 无「回到最新」；可视范围已渲染（A11 数据正确性连带修复）
    await expect(back).toHaveCount(0)
    await expect(visibleRange).toBeVisible()

    // 停在最新处切 5m → 仍锚定最新（不越界），范围显示随之更新
    await page.getByTestId('period-5m').click()
    await waitPerfReady(page, '5m')
    await expect(back).toHaveCount(0, { timeout: 8000 }) // 关键：停在最新处切周期不跳出最新
    await expect(visibleRange).toBeVisible()

    // 最新处切 1h → 仍最新
    await page.getByTestId('period-1h').click()
    await waitPerfReady(page, '1h')
    await expect(back).toHaveCount(0, { timeout: 8000 })

    // 回看历史 → 「回到最新」出现
    await panIntoHistory(page)
    await expect(back).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(300) // 惯性停稳后再切周期

    // 回看处切 5m → 右侧锚定，仍远离最新（不跳回最新）
    await page.getByTestId('period-5m').click()
    await waitPerfReady(page, '5m')
    await expect(back).toBeVisible({ timeout: 8000 }) // 关键：回看跨周期保持历史
    await expect(visibleRange).toBeVisible()

    // 点「回到最新」→ 回到最新，按钮消失；再切 1m 仍最新（稳定往返）
    await back.click()
    await expect(back).toHaveCount(0, { timeout: 8000 })
    await page.getByTestId('period-1m').click()
    await waitPerfReady(page, '1m')
    await expect(back).toHaveCount(0, { timeout: 8000 })

    expect(errors).toHaveLength(0)
  })
})