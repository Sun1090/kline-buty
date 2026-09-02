import { expect, test, type Page } from '@playwright/test'

async function openMore(page: Page) {
  const button = page.getByTestId('header-more')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openDrawings(page: Page) {
  const button = page.getByTestId('drawing-toggle')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openLayers(page: Page) {
  await openDrawings(page)
  await page.getByTestId('drawing-layers-open').click()
  await expect(page.getByTestId('drawing-layers')).toBeVisible()
}

async function drawHorizontalLine(page: Page) {
  await openDrawings(page)
  await page.getByRole('button', { name: '水平线', exact: true }).click()
  const chart = page.locator('.chart-container').first()
  const box = await chart.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width * 0.47, box!.y + box!.height * 0.4)
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
    return Object.values(all).flat().length
  })).toBeGreaterThan(0)
}

test.describe('2026-08 新功能回归', () => {
  test.use({ acceptDownloads: true })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('模拟交易：档位填价、百分比仓位、余额撮合、流水持久化与清空', async ({ page }) => {
    await openMore(page)
    await page.getByRole('button', { name: '盘口' }).click()
    const bid = page.getByTestId('ob-bid').first()
    await expect(bid).toBeVisible({ timeout: 20_000 })
    await bid.hover()
    await bid.getByTestId('qo-buy').click()

    const order = page.getByTestId('quick-order')
    await expect(order).toBeVisible()
    await order.getByTestId('qo-ask').click()
    await expect(order.getByTestId('qo-price')).not.toHaveValue('')
    await order.getByTestId('qo-pct-25').click()
    await expect(order.getByTestId('qo-qty')).not.toHaveValue('')
    const balanceBefore = Number((await order.getByTestId('qo-balance').textContent())?.replace(/[^\d.]/g, ''))
    await order.getByTestId('qo-confirm').click()
    await expect(page.getByText('浮动盈亏')).toBeVisible()
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]').length)).toBe(1)
    expect(Number(await page.evaluate(() => localStorage.getItem('kline-buty:paperBalance')))).toBeLessThan(balanceBefore)

    await page.getByRole('button', { name: '平仓' }).click()
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]').length)).toBe(2)
    await openMore(page)
    await page.getByRole('button', { name: '流水' }).click()
    await expect(page.getByTestId('trade-history-row')).toHaveCount(2)
    await page.getByTestId('trade-history-clear').click()
    await expect(page.getByTestId('trade-history-row')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kline-buty:paperTrades'))).toBeNull()
  })

  test('画线：吸附三态循环、批量显隐、JSON 导出和去重导入', async ({ page }) => {
    await openDrawings(page)
    const snap = page.getByTestId('drawing-snap-toggle')
    // C3：默认 ohlc，点击循环 off → time → ohlc（持久化为 JSON 字符串，需 parse）
    const snapMode = () => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:drawingSnap') ?? '""') as string)
    await expect.poll(snapMode).toBe('ohlc')
    await snap.click()
    await expect.poll(snapMode).toBe('off')
    await snap.click()
    await expect.poll(snapMode).toBe('time')
    await page.getByTestId('drawing-toggle').click()
    await drawHorizontalLine(page)
    await openLayers(page)

    await page.getByTestId('drawing-layer-hide-all').click()
    await expect.poll(() => page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, { hidden?: boolean }[]>
      return Object.values(all).flat().every((drawing) => drawing.hidden)
    })).toBe(true)
    await page.getByTestId('drawing-layer-show-all').click()
    await expect.poll(() => page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, { hidden?: boolean }[]>
      return Object.values(all).flat().every((drawing) => !drawing.hidden)
    })).toBe(true)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('drawing-layer-export').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/BTCUSDT.*\.json$/)
    await page.getByTestId('drawing-layer-import').locator('xpath=following-sibling::input[@type="file"]').setInputFiles(await download.path())
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(1)
    await expect(page.getByTestId('drawing-import-error')).toHaveCount(0)
  })

  test('四图布局：每格周期独立，修改一格不联动其余格', async ({ page }) => {
    await openMore(page)
    const layout = page.getByTestId('layout-toggle')
    await layout.click()
    await layout.click()
    const selectors = page.locator('[data-testid^="quad-period-"]')
    await expect(selectors).toHaveCount(4)
    const before = await selectors.evaluateAll((nodes) => nodes.map((node) => (node as HTMLSelectElement).value))
    await selectors.nth(1).selectOption('4h')
    await expect(selectors.nth(1)).toHaveValue('4h')
    expect(await selectors.nth(0).inputValue()).toBe(before[0])
    expect(await selectors.nth(2).inputValue()).toBe(before[2])
    expect(await selectors.nth(3).inputValue()).toBe(before[3])
  })

  test('图表右键菜单：复制价格、创建提醒、清空画线', async ({ page }) => {
    await drawHorizontalLine(page)
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    await chart.click({ button: 'right', position: { x: box!.width * 0.55, y: box!.height * 0.45 } })
    await page.getByTestId('ctx-add-alert').click()
    await expect(page.getByRole('region', { name: /价格提醒/ })).toBeVisible()
    await openMore(page)
    await page.getByRole('button', { name: '提醒', exact: true }).click()
    await expect(page.getByRole('region', { name: /价格提醒/ })).toHaveCount(0)

    await chart.click({ button: 'right', position: { x: box!.width * 0.55, y: box!.height * 0.45 } })
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByTestId('ctx-clear-drawings').click()
    await expect.poll(() => page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
      return Object.values(all).flat().length
    })).toBe(0)

    await chart.click({ button: 'right', position: { x: box!.width * 0.55, y: box!.height * 0.45 } })
    await expect(page.getByTestId('ctx-copy-price')).toContainText(/\d/)
    await page.getByTestId('ctx-copy-price').click()
    await expect(page.getByTestId('chart-ctx-menu')).toHaveCount(0, { timeout: 2_000 })
  })

  test('快捷键帮助：分组展示、关键字过滤和无结果态', async ({ page }) => {
    await page.keyboard.press('?')
    const help = page.getByTestId('shortcuts-help')
    await expect(help).toBeVisible()
    await expect(help.getByText('导航')).toBeVisible()
    const filter = help.getByTestId('shortcuts-filter')
    await filter.fill('回放')
    await expect(help.getByText(/回放/).first()).toBeVisible()
    await expect(help.getByText('导航')).toHaveCount(0)
    await filter.fill('no-such-shortcut')
    await expect(help).toContainText('无匹配')
  })

  test('移动端下拉刷新：超过阈值后展示刷新态并重新请求行情', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    const wrap = page.getByTestId('pull-to-refresh')
    const start = { identifier: 1, clientX: 180, clientY: 150, screenX: 180, screenY: 150, pageX: 180, pageY: 150 }
    const end = { identifier: 1, clientX: 182, clientY: 260, screenX: 182, screenY: 260, pageX: 182, pageY: 260 }
    await wrap.dispatchEvent('touchstart', { touches: [start], changedTouches: [start] })
    await wrap.dispatchEvent('touchmove', { touches: [end], changedTouches: [end] })
    await expect(page.getByTestId('pull-indicator')).toContainText('松开刷新')
    await page.waitForTimeout(100)
    await wrap.dispatchEvent('touchend', { touches: [], changedTouches: [end] })
    await expect(page.getByTestId('pull-indicator')).toHaveCount(0, { timeout: 2_000 })
  })

  test('画线撤销/重做：新建后撤销回到 0，重做恢复', async ({ page }) => {
    await drawHorizontalLine(page)
    await openLayers(page)
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(1)
    await page.getByTestId('drawing-layer-undo').click()
    await expect(page.getByTestId('drawing-layer-empty')).toBeVisible()
    await expect.poll(() => page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
      return Object.values(all).flat().length
    })).toBe(0)
    await page.getByTestId('drawing-layer-redo').click()
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(1)
  })

  test('画线模板：保存当前组合 → 套用新增一份 → 模板持久化', async ({ page }) => {
    await drawHorizontalLine(page)
    await openLayers(page)
    await page.getByTestId('drawing-template-name').fill('回归模板')
    await page.getByTestId('drawing-template-save').click()
    await expect(page.getByTestId('drawing-template-row')).toHaveCount(1)
    await page.getByTestId('drawing-template-apply').click()
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(2)
    await expect.poll(() => page.evaluate(() => {
      const t = JSON.parse(localStorage.getItem('kline-buty:drawingTemplates') ?? '{}')
      return Object.keys(t as Record<string, unknown>).length
    })).toBe(1)
  })

  test('画线复制/粘贴：复制选中后粘贴生成新画线，剪贴板按钮可用', async ({ page }) => {
    await drawHorizontalLine(page)
    await openLayers(page)
    await page.getByTestId('drawing-layer-row').first().click()
    await page.getByTestId('drawing-layer-copy').click()
    const paste = page.getByTestId('drawing-layer-paste')
    await expect(paste).toBeEnabled()
    await paste.click()
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(2)
  })
})
