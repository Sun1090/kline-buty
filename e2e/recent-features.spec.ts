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
    // 持仓面板出现开多行且含浮动盈亏数值（「浮动盈亏」标签早已移除，改为断言数值存在）
    const posRow = page.getByTestId('position-row-long')
    await expect(posRow).toBeVisible()
    await expect(posRow).toContainText(/-?\d+(\.\d+)?/)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]').length)).toBe(1)
    expect(Number(await page.evaluate(() => localStorage.getItem('kline-buty:paperBalance')))).toBeLessThan(balanceBefore)

    // 平掉开多行（该行唯一按钮即「平仓」；避免 name 子串命中「全部平仓」）
    await page.getByTestId('position-row-long').getByRole('button').click()
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
    // C6 四态循环：默认 ohlc → grid → off → time（持久化为 JSON 字符串，需 parse）
    const snapMode = () => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:drawingSnap') ?? '""') as string)
    await expect.poll(snapMode).toBe('ohlc')
    await snap.click()
    await expect.poll(snapMode).toBe('grid')
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

  test('I15 模板市场：导出下载 JSON → 导入合并（同名自动序号化）→ 套用生效', async ({ page }) => {
    await drawHorizontalLine(page)
    await openLayers(page)
    await page.getByTestId('drawing-template-name').fill('回归模板')
    await page.getByTestId('drawing-template-save').click()
    await expect(page.getByTestId('drawing-template-row')).toHaveCount(1)

    // 导出：触发下载并读取内容校验结构
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('drawing-template-export').click(),
    ])
    expect(download.suggestedFilename()).toBe('drawing-templates.json')
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const exported = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
      version: number
      templates: { name: string; drawings: unknown[] }[]
    }
    expect(exported.version).toBe(1)
    expect(exported.templates).toHaveLength(1)
    expect(exported.templates[0].name).toBe('回归模板')

    // 导入同一份导出内容（模拟他人分享的模板文件）：同名 → 序号化为「回归模板 (2)」
    await page.getByTestId('drawing-template-import-file').setInputFiles({
      name: 'shared.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exported)),
    })
    await expect(page.getByText('已导入')).toBeVisible()
    await expect(page.getByTestId('drawing-template-row')).toHaveCount(2)
    await expect(page.getByTestId('drawing-template-row').nth(1)).toContainText('回归模板 (2)')

    // 导入的模板可套用（应用后画线数 1 → 2）
    await page.getByTestId('drawing-template-apply').nth(1).click()
    await expect(page.getByTestId('drawing-layer-row')).toHaveCount(2)
  })

  test('I15 模板市场：导入非法 JSON → 显示失败提示，模板列表不变', async ({ page }) => {
    await drawHorizontalLine(page)
    await openLayers(page)
    await page.getByTestId('drawing-template-name').fill('回归模板')
    await page.getByTestId('drawing-template-save').click()
    await expect(page.getByTestId('drawing-template-row')).toHaveCount(1)
    await page.getByTestId('drawing-template-import-file').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ not-json'),
    })
    await expect(page.getByText('导入失败')).toBeVisible()
    await expect(page.getByTestId('drawing-template-row')).toHaveCount(1)
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

  test('I8 画线深链：带 ?drawing=<id> 打开选中该画线（图层行高亮选中）', async ({ page, context }) => {
    // 先画一条线并拿到其持久化 id
    await drawHorizontalLine(page)
    const drawingId = await page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, { id: string }[]>
      return Object.values(all).flat()[0]?.id as string
    })
    expect(drawingId).toBeTruthy()
    // 带深链参数在同 context 新页面打开（page.addInitScript 的 localStorage.clear 会在原 page
    // 每次导航时触发，用新页面绕开；context 级 localStorage 共享，画线数据保留）
    const page2 = await context.newPage()
    await page2.goto(`/?perf=600&symbol=BTCUSDT&period=1m&drawing=${encodeURIComponent(drawingId)}`)
    await expect(page2.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await openLayers(page2)
    await expect(page2.getByTestId('drawing-layer-row').first()).toHaveAttribute('data-selected', 'true')
    await page2.close()
  })
})
