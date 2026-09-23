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
    const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, unknown[]>
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

  test('盘口在 ?perf 压测模式下走合成档位：两端都有数据、价差与失衡可算', async ({ page }) => {
    // 压测模式的契约是「数据源全部合成、不联网」：深度此前仍去连真实 WS，
    // 于是无网络的运行器上盘口整块空着，依赖档位下单的用例也进不了确定性清单。
    await openMore(page)
    await page.getByRole('button', { name: '盘口' }).click()
    const book = page.getByTestId('order-book')
    await expect(book).toBeVisible()
    // 档位会按聚合粒度合并，行数不必等于原始 20 档；两端成规模地有数据即可
    await expect(page.getByTestId('ob-bid')).not.toHaveCount(0)
    await expect(page.getByTestId('ob-ask')).not.toHaveCount(0)
    expect(await page.getByTestId('ob-bid').count()).toBeGreaterThan(4)
    expect(await page.getByTestId('ob-ask').count()).toBeGreaterThan(4)
    // 买一 < 卖一：价差为正且显示出来
    const bestBid = Number((await page.getByTestId('ob-bid').first().getAttribute('data-price')) ?? '0')
    const bestAsk = Number((await page.getByTestId('ob-ask').first().getAttribute('data-price')) ?? '0')
    expect(bestBid).toBeGreaterThan(0)
    expect(bestAsk).toBeGreaterThan(bestBid)
    await expect(page.getByTestId('ob-spread')).toContainText(/[\d.,]+/)
    await expect(page.getByTestId('ob-imbalance')).toBeVisible()
    // 合成档位随最新价走：不是一次性快照
    const first = await page.getByTestId('ob-bid').first().getAttribute('data-price')
    await expect
      .poll(async () => await page.getByTestId('ob-bid').first().getAttribute('data-price'), { timeout: 15_000 })
      .not.toBe(first)
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

    // 平掉开多行（v0.5.x 反手按钮同在此行，需按「平仓」按钮名精确定位，避免命中「反手」）
    await page.getByTestId('position-row-long').getByRole('button', { name: '平仓 开多' }).click()
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]').length)).toBe(2)
    await openMore(page)
    await page.getByRole('button', { name: '流水' }).click()
    await expect(page.getByTestId('trade-history-row')).toHaveCount(2)
    // v0.5.x 期间盈亏条：有平仓后显示今日/本周/本月已实现（真实数值）
    await expect(page.getByTestId('trade-period-pnl')).toContainText(/[+-]\d+\.\d{2}/)
    await page.getByTestId('trade-history-clear').click()
    await expect(page.getByTestId('trade-history-row')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kline-buty:paperTrades'))).toBeNull()
  })

  test('模拟交易：持仓反手——平多开空、流水 close+open 记账', async ({ page }) => {
    await openMore(page)
    await page.getByRole('button', { name: '盘口' }).click()
    const bid = page.getByTestId('ob-bid').first()
    await expect(bid).toBeVisible({ timeout: 20_000 })
    await bid.hover()
    await bid.getByTestId('qo-buy').click()
    const order = page.getByTestId('quick-order')
    await expect(order).toBeVisible()
    await order.getByTestId('qo-pct-25').click()
    await order.getByTestId('qo-confirm').click()
    await expect(page.getByTestId('position-row-long')).toBeVisible()

    // 反手：平多开空（现价同量反向开仓）
    const reverseBtn = page.getByTestId('position-reverse-long')
    await expect(reverseBtn).toBeVisible()
    await expect(reverseBtn).toBeEnabled()
    await reverseBtn.click()

    await expect(page.getByTestId('position-row-long')).toHaveCount(0)
    await expect(page.getByTestId('position-row-short')).toBeVisible()
    // 反手平掉旧仓 → 今日已实现盈亏出现真实数值（不再 +0.00）
    await expect(page.getByTestId('position-today-pnl')).toContainText(/[+-]\d+\.\d{2}/)

    // 记账：反手 = 新空仓 open + 旧多仓 close（结算 effect 落 close），加最初开仓 open 共 3 条，close 为最新
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]').length)).toBe(3)
    const kinds = await page.evaluate(() => (JSON.parse(localStorage.getItem('kline-buty:paperTrades') ?? '[]') as { kind: string }[]).map((t) => t.kind))
    expect(kinds[0]).toBe('close')
    expect(kinds[1]).toBe('open')
    expect(kinds[2]).toBe('open')
  })

  test('交易绩效：权益曲线渲染 + 最大回撤 + 悬停 tooltip', async ({ page }) => {
    // 确定性：种入成交流水（新记录在前：亏损平仓 → 开仓），不依赖盘口实时数据。
    // 两条记录同 at（同一 UTC 日），避免跨午夜把 2 笔拆成两天 → 按日分组断言稳定
    await page.addInitScript(() => {
      const now = Date.now()
      localStorage.setItem(
        'kline-buty:paperTrades',
        JSON.stringify([
          { id: 'seed2', at: now, symbol: 'BTCUSDT', side: 'sell', kind: 'close', price: 90, qty: 5, fee: 0.45, feeRate: 0.001, pnl: -50 },
          { id: 'seed1', at: now, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 100, qty: 5, fee: 0.5, feeRate: 0.001 },
        ]),
      )
    })
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    // 交易流水 → 交互式权益曲线
    await openMore(page)
    await page.getByRole('button', { name: '流水' }).click()
    await expect(page.getByTestId('trade-history-panel')).toBeVisible()
    const equity = page.getByTestId('trade-history-equity')
    await expect(equity).toBeVisible()
    const curve = page.getByTestId('equity-curve')
    await expect(curve).toBeVisible()
    await expect(curve.locator('svg path[stroke]')).toHaveCount(1)

    // 权益 10,000 → 9,999.5（开仓费）→ 9,949.5（-50 平仓）：峰 10,000 → 谷 9,949.5，回撤 0.51%
    await expect(equity).toContainText('最大回撤')
    await expect(equity).toContainText('回撤')
    await expect(equity).toContainText('0.51%')
    await expect(equity).toContainText('9949.50')

    // 逐笔盈亏条形图：一笔亏损平仓 → 1 根柱
    await expect(page.getByTestId('pnl-bars')).toBeVisible()
    await expect(page.getByTestId('pnl-bars').locator('rect')).toHaveCount(1)

    // v0.5 按日分组：UTC 日标题可见（种子流水均为今天）
    await expect(page.getByTestId('trade-history-day').first()).toBeVisible()
    await expect(page.getByTestId('trade-history-day').first()).toContainText('笔数 2')

    // 悬停曲线 → tooltip 显示时点权益
    await curve.hover()
    await expect(page.getByTestId('equity-curve-tooltip')).toBeVisible()
    await expect(page.getByTestId('equity-curve-tooltip')).toContainText('权益')
  })

  test('按品种汇总：点击品种行切主图品种并关闭流水面板', async ({ page }) => {
    // 种入两个品种的流水（ETHUSDT 在前，BTCUSDT 在后）
    await page.addInitScript(() => {
      const now = Date.now()
      localStorage.setItem(
        'kline-buty:paperTrades',
        JSON.stringify([
          { id: 'e1', at: now, symbol: 'ETHUSDT', side: 'sell', kind: 'close', price: 3_500, qty: 2, fee: 0.7, feeRate: 0.001, pnl: 12.3 },
          { id: 'b1', at: now - 3_600_000, symbol: 'BTCUSDT', side: 'buy', kind: 'open', price: 60_000, qty: 1, fee: 0.6, feeRate: 0.001 },
        ]),
      )
    })
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    await openMore(page)
    await page.getByRole('button', { name: '流水' }).click()
    await expect(page.getByTestId('trade-history-panel')).toBeVisible()
    await page.getByTestId('trade-by-symbol-toggle').click()
    await page.getByTestId('trade-by-symbol-row-BTCUSDT').click()
    // 面板关闭 + 主图品种切换为 BTCUSDT
    await expect(page.getByTestId('trade-history-panel')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:symbol') ?? '""') as string)).toBe('BTCUSDT')
  })

  test('仓位账户总览：可用余额 + 浮动盈亏占位 + 今日已实现 +0.00（无交易）', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await openMore(page)
    await page.getByRole('button', { name: '仓位' }).click()
    await expect(page.getByRole('region', { name: /模拟仓位/ })).toBeVisible()
    const summary = page.getByTestId('position-account-summary')
    await expect(summary).toBeVisible()
    // 初始余额 10,000 + 无持仓浮动盈亏占位 — + 今日已实现盈亏（无交易 → +0.00）
    await expect(summary).toContainText('10000.00')
    await expect(summary).toContainText('—')
    await expect(page.getByTestId('position-today-pnl')).toHaveText('+0.00')
  })

  test('行情列表：排序持久化——点列头排序写入 localStorage 并立即高亮', async ({ page }) => {
    // 注：describe beforeEach 的 addInitScript 会在每次页面加载（含 reload）清空 localStorage，
    // 故此处验证写入侧；刷新恢复路径由 useTickerList/MarketList 单测覆盖
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const priceHeader = page.getByTestId('market-sort-price')
    await expect(priceHeader).toBeVisible()
    await priceHeader.click()
    // 排序写入 localStorage + 列头立即高亮
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kline-buty:marketSort'))).toContain('price')
    await expect(priceHeader).toContainText(/[▲▼]/)
  })

  test('当日高低线：开关开/关 + 持久化（无 pageerror）', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const toggle = page.getByTestId('session-lines-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    // 开启 → aria-pressed true + localStorage 持久化
    await toggle.click({ force: true })
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kline-buty:sessionLines'))).toBe('true')
    // 关闭 → aria-pressed false + localStorage 清为 false
    await toggle.click({ force: true })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kline-buty:sessionLines'))).toBe('false')
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
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, { hidden?: boolean }[]>
      return Object.values(all).flat().every((drawing) => drawing.hidden)
    })).toBe(true)
    await page.getByTestId('drawing-layer-show-all').click()
    await expect.poll(() => page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, { hidden?: boolean }[]>
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
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, unknown[]>
      return Object.values(all).flat().length
    })).toBe(0)

    await chart.click({ button: 'right', position: { x: box!.width * 0.55, y: box!.height * 0.45 } })
    await expect(page.getByTestId('ctx-copy-price')).toContainText(/\d/)
    await page.getByTestId('ctx-copy-price').click()
    await expect(page.getByTestId('chart-ctx-menu')).toHaveCount(0, { timeout: 2_000 })
  })

  test('图表右键菜单：复制 OHLC 文本', async ({ page, context, browserName }) => {
    // 剪贴板 readText 依赖 clipboard-read 权限，仅 chromium 语义（firefox/webkit 保留菜单关闭功能断言）
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    await chart.click({ button: 'right', position: { x: box!.width * 0.55, y: box!.height * 0.45 } })
    await page.getByTestId('ctx-copy-ohlc').click()
    if (browserName === 'chromium') {
      const text = await page.evaluate(() => navigator.clipboard.readText())
      expect(text).toMatch(/^O:.+ H:.+ L:.+ C:.+ V:.+$/)
    }
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

  test('移动端下拉刷新：超过阈值后展示刷新态并重新请求行情', async ({ page, browserName }) => {
    // firefox 无 Touch 构造器（Playwright dispatchEvent 创建 TouchEvent 报 Touch is not defined），
    // 下拉刷新手势由 chromium/webkit 覆盖
    test.skip(browserName === 'firefox', 'firefox 无 Touch 构造器（Playwright dispatchEvent 限制）')
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
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, unknown[]>
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
      const all = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]> as Record<string, { id: string }[]>
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

  test('I8 深链增强：?ind=&sub= 直达主图/副图指标（白名单校验，非法静默忽略）', async ({ page }) => {
    const ind = () => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:mainIndicator') ?? '""') as string)
    const sub = () => page.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:subIndicator') ?? '""') as string)
    await page.goto('/?perf=600&ind=boll&sub=rsi')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await expect.poll(ind).toBe('boll')
    await expect.poll(sub).toBe('rsi')
    // 非法值 → 静默忽略，回落默认（ma / volume）
    await page.goto('/?perf=600&ind=notreal&sub=alsonot')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await expect.poll(ind).toBe('ma')
    await expect.poll(sub).toBe('volume')
  })

  test('I8 深链增强：?tab= 直达面板（position / trades / alerts）', async ({ page }) => {
    await page.goto('/?perf=600&tab=position')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await expect(page.getByRole('region', { name: /模拟仓位/ })).toBeVisible()
    // trades 面板
    await page.goto('/?perf=600&tab=trades')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await expect(page.getByTestId('trade-history-panel')).toBeVisible()
    // 未知 tab 值 → 静默忽略（无面板打开）
    await page.goto('/?perf=600&tab=whatever')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await expect(page.getByTestId('trade-history-panel')).toHaveCount(0)
  })

  test('I9 定时主题：切到定时档 → 深色/浅色时刻可配 → 跨切换点后主题自动切换', async ({ browserName, context }) => {
    test.skip(browserName !== 'chromium', 'page.clock 仅 chromium 语义（其余浏览器覆盖由单测承担）')
    // 固定当前时刻为 06:50（默认深色区间 18:00–07:00 内），时钟须在页面加载前安装才作用于应用定时器
    const page2 = await context.newPage()
    await page2.clock.install({ time: new Date('2026-01-01T06:50:00') })
    await page2.goto('/?perf=600')
    await expect(page2.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    // 默认档 dark → 按钮文案「浅色」；循环切主题 dark→light→auto→schedule（每次点击切到下一档）
    const more = page2.getByTestId('header-more')
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click()
    const themeToggle = page2.getByTestId('theme-toggle')
    await expect(themeToggle).toContainText('浅色') // dark 档 → 文案为下一档「浅色」
    await themeToggle.click() // → light
    await expect(themeToggle).toContainText('深色')
    await themeToggle.click() // → auto
    await expect(themeToggle).toContainText('自动（跟随系统）')
    await themeToggle.click() // → schedule

    // 定时档下出现深/浅色时刻输入
    const darkInput = page2.getByTestId('schedule-dark-time')
    const lightInput = page2.getByTestId('schedule-light-time')
    await expect(darkInput).toBeVisible()
    await expect(lightInput).toBeVisible()

    // 配置深色 18:00 / 浅色 07:00；当前 06:50 → 深色生效
    await darkInput.fill('18:00')
    await lightInput.fill('07:00')
    await expect(page2.locator('html')).toHaveAttribute('data-theme', 'dark')

    // 越过 07:00 切换点 → 应切为浅色（fake clock 驱动应用 30s 定时器）
    await page2.clock.runFor(11 * 60 * 1000) // +11min → 07:01
    await expect(page2.locator('html')).toHaveAttribute('data-theme', 'light')

    // 配置持久化
    const persisted = await page2.evaluate(() => JSON.parse(localStorage.getItem('kline-buty:scheduleTheme') ?? 'null'))
    expect(persisted).toEqual({ darkTime: '18:00', lightTime: '07:00' })

    await page2.close()
  })
})

test.describe('v0.5.x 快速下单面板窄屏几何', () => {
  test('320px：面板整块落在视口内，标签与按钮都可见，无横向滚动', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    const chart = page.locator('.chart-container').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    await chart.click({ button: 'right', position: { x: box.width * 0.5, y: box.height * 0.5 } })
    await page.getByTestId('ctx-limit-buy').click()
    const order = page.getByTestId('quick-order')
    await expect(order).toBeVisible()

    const geo = await order.evaluate((n) => {
      const el = n as HTMLElement
      const r = el.getBoundingClientRect()
      // 越出左边界 = 被裁到屏幕外（320px 档只剩两个裸输入框，正是本次要修的缺陷）
      const clipped = Array.from(el.querySelectorAll('span,b,button,input,label')).filter(
        (c) => Math.round(c.getBoundingClientRect().x) < 0,
      ).length
      return { x: Math.round(r.x), right: Math.round(r.right), overflow: el.scrollWidth - el.clientWidth, clipped }
    })
    expect(geo.x).toBeGreaterThanOrEqual(0)
    expect(geo.right).toBeLessThanOrEqual(320)
    expect(geo.clipped).toBe(0)
    expect(geo.overflow).toBeLessThanOrEqual(1)
    await expect(order.getByText('价格', { exact: true })).toBeInViewport()
    await expect(order.getByTestId('qo-pct-100')).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  })
})

test.describe('v0.5.x 行情信息条窄屏几何', () => {
  test('320px：信息条换行而不是横向滚动，最新价与配置入口都在视口内', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    // 信息条本身：容器 scrollWidth 不得大于 clientWidth（溢出即横向滚动）
    const strip = page.locator('[data-testid="live-price"]').locator('xpath=ancestor::*[@role="region"][1]')
    await expect(strip).toBeVisible()
    const geo = await strip.evaluate((el) => {
      const box = el as HTMLElement
      return { overflow: box.scrollWidth - box.clientWidth, h: Math.round(box.getBoundingClientRect().height) }
    })
    expect(geo.overflow).toBeLessThanOrEqual(1)
    // 换行后信息条变高（单行约 24px）：证明是折行而不是把内容挤掉
    expect(geo.h).toBeGreaterThan(28)

    await expect(page.getByTestId('live-price')).toBeInViewport()
    await expect(page.getByTestId('statsbar-config-toggle')).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  })
})

test.describe('H7/H8 设置快照：导出文件必须能原样导回', () => {
  test.use({ acceptDownloads: true })

  test('导出下载 → 清空设置 → 导入同一份文件 → 重载后逐键字节一致', async ({ page }) => {
    // 不在这里 addInitScript(localStorage.clear)：导入成功即整页重载，
    // 而页级 initScript 会在重载前再跑一次，把刚导入的值一起抹掉。
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })

    // 启动时的版本检测把 kline-buty:lastVersion 写成裸串 "0.5.x"（非 JSON）——
    // 旧导出实现对其 JSON.parse，点击导出直接抛 SyntaxError 且不产生文件
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('kline-buty:lastVersion')))
      .toMatch(/^\d+\.\d+\.\d+$/)
    const readSettings = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.keys(localStorage)
            .filter((k) => k.startsWith('kline-buty:'))
            .map((k) => [k, localStorage.getItem(k) ?? '']),
        ),
      )
    const before = await readSettings()
    expect(Object.keys(before).length).toBeGreaterThan(5)

    await openMore(page)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('settings-export').click(),
    ])
    expect(download.suggestedFilename()).toBe('kline-buty-settings.json')
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const snapshotText = Buffer.concat(chunks).toString('utf-8')
    const snap = JSON.parse(snapshotText) as { version: number; settings: Record<string, unknown> }
    expect(snap.version).toBe(2)
    // 快照覆盖全部设置键，且裸串值不被二次编码
    expect(Object.keys(snap.settings).sort()).toEqual(Object.keys(before).sort())
    expect(snap.settings['kline-buty:lastVersion']).toBe(before['kline-buty:lastVersion'])

    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('kline-buty:')) localStorage.removeItem(k)
    })
    await page.getByTestId('settings-import-file').setInputFiles({
      name: 'settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(snapshotText),
    })
    // 导入成功即整页重载：先等重载后的页面重新起来，再逐键比对（比对的是重启后仍在那儿的值）
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 30_000 })
    await expect
      .poll(
        async () => {
          try {
            return await readSettings()
          } catch {
            return null // 导航会销毁执行上下文，poll 会重试到落地
          }
        },
        { timeout: 30_000, message: '导入后未逐键原样恢复' },
      )
      .toEqual(before)
  })
})
