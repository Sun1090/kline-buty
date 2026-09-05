import { test, expect, type Page } from '@playwright/test'

/**
 * O8 E2E 场景扩充（第二批）：图层管理交互 + 组级批量 + 跟随最新价。
 * - I13 全局透明度 / C15 跟随最新价 / I15 重命名+搜索 / C4 组折叠与组级显隐锁
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
    // 冷启动直连慢：刷新重试一次
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

/** 画一条水平线并进入图层管理面板（绘制方式复刻 smoke：选工具后直接拖拽） */
async function drawHorizontalAndOpenLayers(page: Page) {
  await openPath(page, 'drawing-toggle')
  await page.getByRole('button', { name: '水平线' }).click()
  const chart = page.locator('main div').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.4, { steps: 5 })
  await page.mouse.up()
  // 等等落库（localStorage 计数 >0）
  await expect.poll(() => storedDrawingsCount(page), { timeout: 10_000 }).toBeGreaterThan(0)
  await openPath(page, 'drawing-toggle')
  await page.getByTestId('drawing-layers-open').click()
  await page.getByTestId('drawing-layer-row').first().waitFor({ timeout: 10_000 })
}

const storedDrawingsCount = (page: Page) =>
  page.evaluate(() => {
    try {
      const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
      return Object.values(d).reduce((n, arr) => n + (arr as unknown[]).length, 0)
    } catch {
      return 0
    }
  })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await waitCandlesRendered(page)
})

test('I15 图层重命名：行内改字落库并显示新名', async ({ page }) => {
  await drawHorizontalAndOpenLayers(page)
  await page.getByTestId('drawing-layer-rename').first().click()
  const input = page.getByTestId('drawing-rename-input')
  await input.waitFor({ timeout: 5000 })
  await input.fill('斐波那契线')
  await input.press('Enter')
  await expect(page.getByText('斐波那契线', { exact: true })).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}'))
  const names = Object.values(stored as Record<string, Array<{ name?: string }>>)
    .flat()
    .map((d) => d.name)
  expect(names).toContain('斐波那契线')
})

test('I15 图层搜索：按自定义名过滤图层树，清空恢复', async ({ page }) => {
  await drawHorizontalAndOpenLayers(page)
  // 先命名方便搜索命中
  await page.getByTestId('drawing-layer-rename').first().click()
  await page.getByTestId('drawing-rename-input').fill('斐波那契线')
  await page.getByTestId('drawing-rename-input').press('Enter')
  const search = page.getByTestId('drawing-search')
  await search.fill('斐波那契')
  await expect(page.getByTestId('drawing-layer-row')).toHaveCount(1)
  await search.fill('不存在之线')
  await expect(page.getByTestId('drawing-layer-row')).toHaveCount(0)
})

test('I13 全局透明度：滑杆调整并显示百分比', async ({ page }) => {
  await drawHorizontalAndOpenLayers(page)
  const slider = page.getByTestId('drawing-global-opacity-slider')
  await slider.waitFor({ timeout: 5000 })
  await slider.fill('0.5') // range 0.15–1，0.5 = 50%
  await expect(page.getByText('50%', { exact: true })).toBeVisible()
})

test('C4 组级显隐/锁定：seed 分组画线 → 组头按钮联动组内行', async ({ page }) => {
  await page.evaluate(() => {
    const d: Record<string, unknown[]> = {
      BTCUSDT: [
        { id: 'g1', type: 'horizontal', points: [{ time: 1700000000, price: 60000 }], group: 'A组' },
        { id: 'g2', type: 'trend', points: [{ time: 1700000000, price: 60000 }, { time: 1700000060, price: 59000 }], group: 'A组' },
        { id: 'g3', type: 'horizontal', points: [{ time: 1700000000, price: 61000 }], name: '独立线' },
      ],
    }
    localStorage.setItem('kline-buty:drawings', JSON.stringify(d))
  })
  await page.reload()
  await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
  await openPath(page, 'drawing-toggle')
  await page.getByTestId('drawing-layers-open').click()
  await expect(page.getByTestId('drawing-layer-row')).toHaveCount(3)
  // 组级隐藏 A组（组内均未隐藏 → 点击后 whole group hidden）
  await page.getByTestId('drawing-group-eye-A组').click()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}'))
  const hidden = (stored as { BTCUSDT: Array<{ group?: string; hidden?: boolean }> }).BTCUSDT.filter((d) => d.group === 'A组')
  expect(hidden.every((d) => d.hidden)).toBe(true)
  // 组级锁定 → data-active 体现
  await page.getByTestId('drawing-group-lock-A组').click()
  const locked = await page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}'))
  const lockStates = (locked as { BTCUSDT: Array<{ group?: string; locked?: boolean }> }).BTCUSDT.filter((d) => d.group === 'A组')
  expect(lockStates.every((d) => d.locked)).toBe(true)
})

test('C15 跟随最新价：持仓计划工具 → 图层开启跟随开关', async ({ page }) => {
  await openPath(page, 'drawing-toggle')
  await page.getByRole('button', { name: '持仓计划' }).click()
  const chart = page.locator('main div').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * 0.3, box!.y + box!.height * 0.5)
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
  await page.mouse.click(box!.x + box!.width * 0.7, box!.y + box!.height * 0.5)
  await openPath(page, 'drawing-toggle')
  await page.getByTestId('drawing-layers-open').click()
  const checkbox = page.getByTestId('drawing-follow-latest-checkbox')
  await checkbox.waitFor({ timeout: 10_000 })
  await checkbox.click()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}'))
  const follow = (stored as { BTCUSDT: Array<{ type?: string; followLatest?: boolean }> }).BTCUSDT.find((d) => d.type === 'position')
  expect(follow?.followLatest).toBe(true)
})