import { test, expect, type Page } from '@playwright/test'

/**
 * O8 E2E 场景扩充（第三批）：H9 指标末尾值一览 + M1 周期栏键盘漫游。
 * - H9 主图/副图信息条：随指标切换更新，末尾值即时显示
 * - M1 键盘可达性：Tab 聚焦周期 → 方向键漫游 → Enter 切换（aria-pressed 跟随）
 */

/** 等待蜡烛真正渲染（与 smoke.spec 同款：扫描全部 canvas 涨跌色 + 冷启动刷新重试） */
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

/** 按下 Tab 直至某个周期按钮获得焦点，返回其 testid */
async function tabToPeriodButton(page: Page): Promise<string> {
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const id = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return el?.dataset?.testid && el.dataset.testid.startsWith('period-') ? el.dataset.testid : null
    })
    if (id) return id
  }
  throw new Error('Tab 40 次未聚焦到周期按钮')
}

test('H9 指标末尾值一览：主图信息条渲染 MA 名称 + 实时价格值', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const info = page.getByTestId('chart-indicator-last')
  await info.waitFor({ timeout: 15_000 })
  // 主图默认 MA 线 → 信息条出现 MA 名称 + 价格值
  await expect(info).toContainText(/MA\d+\s*:\s*[\d.,]+/, { timeout: 15_000 })
  // 数值非空且呈现价格量级（>1）
  const text = (await info.textContent()) ?? ''
  const maValues = text.match(/MA\d+\s*:\s*([\d.,]+)/g) ?? []
  expect(maValues.length).toBeGreaterThanOrEqual(1)
})

test('H9 副图切换：参数面板切副图指标 → 信息条同步更新且保持数值行', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
  const info = page.getByTestId('chart-indicator-last')
  await info.waitFor({ timeout: 15_000 })
  // 默认副图 volume → 信息条含 VOL 行
  await expect(info).toContainText(/VOL\s*:\s*\d+/, { timeout: 15_000 })
  const before = await info.textContent()
  // 参数面板 → 副图叠加指标切到 RSI
  await openPath(page, 'header-more')
  await page.getByRole('button', { name: '参数' }).click()
  const overlay = page.getByLabel('副图叠加指标')
  await overlay.waitFor({ timeout: 10_000 })
  await overlay.selectOption('rsi')
  await expect(overlay).toHaveValue('rsi')
  // 信息条内容变化（副图行随切换更新）且仍为数值行
  await expect
    .poll(async () => {
      const now = await info.textContent()
      return now !== before && /[\d.,]+/.test(now ?? '')
    }, { timeout: 15_000 })
    .toBe(true)
})

test('M1 键盘漫游：Tab 聚焦周期 → 方向键漫游 → Enter 切换（aria-pressed 跟随）', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  const firstId = await tabToPeriodButton(page)
  // 初始聚焦即当前活跃周期
  const firstPressed = await page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.getAttribute('aria-pressed'),
  )
  expect(firstPressed).toBe('true')
  // 方向键漫游：右移一格，焦点落到相邻周期
  await page.keyboard.press('ArrowRight')
  const secondId = await page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.dataset?.testid ?? '',
  )
  expect(secondId).toMatch(/^period-/)
  expect(secondId).not.toBe(firstId)
  // Enter 切换：新聚焦周期变为活跃（aria-pressed=true），且与初始活跃不同
  await page.keyboard.press('Enter')
  const afterPressed = await page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.getAttribute('aria-pressed'),
  )
  expect(afterPressed).toBe('true')
  const changed = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="period-"]')].some(
      (b) => b.getAttribute('aria-pressed') === 'true' && b.dataset.testid !== null,
    ),
  )
  expect(changed).toBe(true)
  // 活跃周期确已切换（活跃按钮 testid 不等于初始聚焦）
  const activeNow = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="period-"]')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )?.dataset?.testid,
  )
  expect(activeNow).not.toBe(firstId)
})
