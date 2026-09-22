import { expect, test, type Page } from '@playwright/test'
import { findDrawnPixels, pickDrawingTool, waitCandlesRendered } from './helpers/smoke'

/**
 * I5 画线语义识别：按当前品种已画图形建议指标（semantics.ts 纯函数 + 设置面板一键应用）。
 * - 水平线（支撑/阻力）→ 建议 RSI；未画线时不出现建议按钮
 * - 点击建议 → 副图切到 RSI，信息条出现 RSI 值
 */

async function openMore(page: Page) {
  const button = page.getByTestId('header-more')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openDrawings(page: Page) {
  const button = page.getByTestId('drawing-toggle')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openIndicatorSettings(page: Page) {
  await openMore(page)
  // More 面板里的「指标参数」入口（panel.settings 中文标签为「参数」）
  await page.getByRole('button', { name: '参数', exact: true }).click()
  await expect(page.getByTestId('indicator-settings-panel')).toBeVisible()
}

/** 在图表中央画一条水平线（C6 吸附默认 ohlc，水平拖动即可落线） */
async function drawHorizontalLine(page: Page) {
  await openDrawings(page)
  await page.getByRole('button', { name: '水平线', exact: true }).click()
  const chart = page.locator('.chart-container').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  const y = box!.y + box!.height * 0.4
  await page.mouse.move(box!.x + box!.width * 0.4, y)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width * 0.6, y)
  await page.mouse.up()
  await expect.poll(() =>
    page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, unknown[]>
      return Object.values(all).flat().length
    }),
  ).toBeGreaterThan(0)
}

test.describe('留白画线：最新 K 线右侧仍是可画区', () => {
  test('绘图区右缘单击 → 画得出来，且线就落在点击的那一列像素上', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '垂直线')
    const box = await page.locator('.chart-container').first().boundingBox()
    expect(box).not.toBeNull()
    // 绘图区右缘不含右侧价格轴，rightOffset 留出的「未来」空隙就在这条边之前
    const plotRight = await page.evaluate(
      () =>
        [...document.querySelectorAll('canvas')]
          .map((c) => c.getBoundingClientRect())
          .filter((r) => r.width > 300)
          .sort((a, b) => a.width - b.width)[0].right,
    )
    const y = box!.y + box!.height * 0.45
    const readAnchors = () =>
      page.evaluate(() => {
        const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, { type: string; points: { time: number }[] }[]>
        return Object.values(all)
          .flat()
          .flatMap((d) => (d.type === 'vertical' ? d.points.map((p) => p.time) : []))
      })
    const place = async (x: number) => {
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + 1, y, { steps: 2 })
      await page.mouse.up()
      await page.waitForTimeout(400)
    }
    // 先取一根数据范围内的锚点作基准，再点留白：两者都要画得出来
    const insideX = plotRight - 300
    await place(insideX)
    const edgeX = plotRight - 2
    await place(edgeX)
    await expect.poll(readAnchors).toHaveLength(2)
    const sorted = (await readAnchors()).slice().sort((a, b) => a - b)
    // 1) 留白里的点击不再被静默丢弃，且时间落在基准之后（顺序与像素一致）
    expect(sorted[1] ?? 0).toBeGreaterThan(sorted[0] ?? 0)
    // 2) 线就画在点击处：锚点被拽回最新一根时，这里会红（渲染位置差出几十像素）
    const win = { yMin: box!.y, yMax: box!.y + box!.height }
    const edgePixels = await findDrawnPixels(page, { ...win, xMin: edgeX - 6, xMax: edgeX + 6 })
    expect(edgePixels.length).toBeGreaterThan(0)
    const insidePixels = await findDrawnPixels(page, { ...win, xMin: insideX - 6, xMax: insideX + 6 })
    expect(insidePixels.length).toBeGreaterThan(0)
  })

  test('留白里的线可以再选中并拖动，位移与手势一致', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await waitCandlesRendered(page)
    await pickDrawingTool(page, '垂直线')
    const box = await page.locator('.chart-container').first().boundingBox()
    expect(box).not.toBeNull()
    const plotRight = await page.evaluate(
      () =>
        [...document.querySelectorAll('canvas')]
          .map((c) => c.getBoundingClientRect())
          .filter((r) => r.width > 300)
          .sort((a, b) => a.width - b.width)[0].right,
    )
    const y = box!.y + box!.height * 0.45
    const readTimes = () =>
      page.evaluate(() => {
        const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, { type: string; points: { time: number }[] }[]>
        return Object.values(all)
          .flat()
          .flatMap((d) => (d.type === 'vertical' ? d.points.map((p) => p.time) : []))
      })
    const x = plotRight - 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 1, y, { steps: 2 })
    await page.mouse.up()
    await expect.poll(readTimes).toHaveLength(1)
    // 退出画线工具，改成对这条线做「选中 → 整线拖拽」
    await page.keyboard.press('Escape')
    await page.waitForFunction(
      () => {
        const e = document.querySelector('.chart-container')
        return !!e && getComputedStyle(e).cursor !== 'crosshair'
      },
      undefined,
      { timeout: 5_000 },
    )
    const drawn = await findDrawnPixels(page, { ...{ yMin: box!.y, yMax: box!.y + box!.height }, xMin: x - 6, xMax: x + 6 })
    expect(drawn.length).toBeGreaterThan(0)
    const anchorX = drawn[0]?.x ?? 0
    await page.mouse.click(anchorX, y)
    await page.waitForTimeout(300)
    const before = (await readTimes())[0] ?? 0
    await page.mouse.move(anchorX, y)
    await page.mouse.down()
    await page.mouse.move(anchorX + 24, y, { steps: 6 })
    await page.mouse.up()
    // 位移要落在时间轴上：拖 24px 就是几根 K 线，不能整条甩飞或原地不动
    await expect
      .poll(
        async () => {
          const times = await readTimes()
          return times.length === 1 && times[0] !== before ? 'moved' : times.length > 1 ? 'duplicated' : 'same'
        },
        { timeout: 8_000 },
      )
      .toBe('moved')
    const moved = await findDrawnPixels(page, { yMin: box!.y, yMax: box!.y + box!.height, xMin: anchorX + 12 })
    expect(moved.length).toBeGreaterThan(0)
    expect(Math.abs(moved[0]!.x - (anchorX + 24))).toBeLessThanOrEqual(8)
  })
})

test.describe('I5 画线语义识别', () => {
  test.use({ acceptDownloads: true })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('未画线时设置面板不出现建议按钮', async ({ page }) => {
    await openIndicatorSettings(page)
    await expect(page.getByTestId('drawing-suggest')).toHaveCount(0)
  })

  test('画水平线 → 出现 RSI 建议 → 一键应用后副图切 RSI', async ({ page }) => {
    await drawHorizontalLine(page)

    // 建议按钮出现且文案含 RSI（水平支撑/阻力 → 超买超卖）
    await openIndicatorSettings(page)
    const suggest = page.getByTestId('drawing-suggest')
    await expect(suggest).toBeVisible({ timeout: 10_000 })
    await expect(suggest).toContainText(/RSI/)

    // 一键应用 → 副图切 RSI，信息条出现 RSI 值
    await suggest.click()
    await openMore(page)
    const info = page.getByTestId('chart-indicator-last')
    await expect(info).toContainText(/RSI\s*:/, { timeout: 15_000 })
  })

  test('画矩形 → 建议布林带 + RSI（区间语义优先）', async ({ page }) => {
    await openDrawings(page)
    await page.getByRole('button', { name: '矩形', exact: true }).click()
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.6)
    await page.mouse.up()
    await expect.poll(() =>
      page.evaluate(() => {
        const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, unknown[]>
        return Object.values(all).flat().length
      }),
    ).toBeGreaterThan(0)

    await openIndicatorSettings(page)
    const suggest = page.getByTestId('drawing-suggest')
    await expect(suggest).toBeVisible({ timeout: 10_000 })
    await expect(suggest).toContainText(/BOLL/)
    await expect(suggest).toContainText(/RSI/)
  })
})
