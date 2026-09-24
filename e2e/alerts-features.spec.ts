import { expect, test, type Page } from '@playwright/test'

async function openMore(page: Page) {
  const button = page.getByTestId('header-more')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

async function openAlerts(page: Page) {
  await openMore(page)
  await page.getByText('提醒', { exact: true }).click()
  await expect(page.getByRole('region', { name: /价格提醒/ })).toBeVisible()
}

async function addAlert(page: Page, price: string) {
  const priceInput = page.getByPlaceholder(/[\d.,]+/).first()
  await priceInput.fill(price)
  await page.getByRole('button', { name: '添加提醒' }).click()
}

/**
 * E 阶段提醒增强 E2E（确定性，?perf 不依赖网络）：
 * - E13 快捷键 a 开关提醒面板
 * - E1 推送渠道持久化（localStorage）
 * - E15 备注 / E10 精度 / E6 到期 透传到提醒行
 * - E4 模板保存/套用/删除（持久化）
 * - E7 批量停用/删除
 * - E12 待触发角标
 * - E14 JSON 导出下载
 */
test.describe('E 阶段提醒增强', () => {
  test.use({ acceptDownloads: true })
  test.beforeEach(async ({ page }) => {
    // 一条导航就够：每条用例的 context 是新建的，首次 goto 之前 localStorage 本来就是空的。
    // 原先的启动走两遍（goto → evaluate(localStorage.clear()) → reload），实测两种启动落到的存储
    // 逐键相同（55 键、值无差异），第二遍纯属多余；更要紧的是那次 reload 是 CI 上 webkit 的崩点：
    // E4（run 36004500928）、E1（run 36004956326）报 `page.reload: WebKit encountered an internal
    // error`，E6（run 36014344212）是 reload 迟迟不落地、把 60s 用例预算整笔吃掉。
    // 用例内自己为验证持久化而做的那次 reload 保留不动。
    await page.goto('/?perf=600')
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
  })

  test('E13 快捷键 a：打开/关闭提醒面板', async ({ page }) => {
    await page.keyboard.press('a')
    await expect(page.getByRole('region', { name: /价格提醒/ })).toBeVisible()
    await page.keyboard.press('a')
    await expect(page.getByRole('region', { name: /价格提醒/ })).toHaveCount(0)
  })

  test('E1 推送渠道：改为站内横幅并持久化，刷新保留', async ({ page }) => {
    await openAlerts(page)
    const channel = page.getByTestId('alert-channel')
    await channel.selectOption('web')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kline-buty:alertChannel'))).toBe('web')
    await page.reload()
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    // alertsOpen 持久化 → 面板自动打开；渠道选择值保留
    await expect(page.getByRole('region', { name: /价格提醒/ })).toBeVisible()
    await expect(page.getByTestId('alert-channel')).toHaveValue('web')
  })

  test('E15/E10/E6 备注+精度+到期：创建透传并在行内展示', async ({ page }) => {
    await openAlerts(page)
    await page.getByPlaceholder(/[\d.,]+/).first().fill('99999')
    await page.getByTestId('alert-note-input').fill('突破后回调买')
    await page.getByTestId('alert-precision').selectOption('4')
    await page.getByRole('button', { name: '添加提醒' }).click()
    // 行内显示备注 + 4 位精度价格 + 到期空（无到期标记；限定 alert-row 避免「清理已过期」按钮文案）
    await expect(page.getByText('突破后回调买')).toBeVisible()
    await expect(page.getByText(/≥ 99999\.0000/)).toBeVisible()
    await expect(page.getByTestId('alert-row').getByText(/已过期/)).toHaveCount(0)
  })

  test('E6 到期：创建过期提醒显示「已过期」', async ({ page }) => {
    await openAlerts(page)
    await page.getByPlaceholder(/[\d.,]+/).first().fill('99999')
    await page.getByTestId('alert-expiry-input').fill('2020-01-01T00:00')
    await page.getByRole('button', { name: '添加提醒' }).click()
    // 行内（alert-row）已过期徽标可见（「清理已过期」按钮也在页面上，需限定行）
    await expect(page.getByTestId('alert-row').getByText(/已过期/)).toBeVisible()
  })

  test('E4 模板：保存当前条件 → 出现模板按钮 → 刷新保留 → 套用回填', async ({ page }) => {
    await openAlerts(page)
    await page.getByPlaceholder(/[\d.,]+/).first().fill('88888')
    await page.getByTestId('alert-group-input').fill('趋势')
    await page.getByTestId('alert-template-name').fill('突破8万8')
    await page.getByTestId('alert-template-save').click()
    await expect(page.getByTestId('alert-template-突破8万8')).toBeVisible()
    // 持久化：刷新后模板仍在（alertsOpen 持久化 → 面板自动打开）
    await page.reload()
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await expect(page.getByRole('region', { name: /价格提醒/ })).toBeVisible()
    await expect(page.getByTestId('alert-template-突破8万8')).toBeVisible()
    // 套用：回填价格与分组
    await page.getByTestId('alert-template-load-突破8万8').click()
    await expect(page.getByPlaceholder(/[\d.,]+/).first()).toHaveValue('88888')
    await expect(page.getByTestId('alert-group-input')).toHaveValue('趋势')
    // 删除模板
    await page.getByTestId('alert-template-del-突破8万8').click()
    await expect(page.getByTestId('alert-template-突破8万8')).toHaveCount(0)
  })

  test('E7 批量操作：勾选停用 → 重新勾选删除', async ({ page }) => {
    await openAlerts(page)
    await addAlert(page, '99990')
    await addAlert(page, '99980')
    await expect(page.getByTestId('alert-row')).toHaveCount(2)
    await page.getByTestId('alert-batch-toggle').click()
    const ids = await page.locator('[data-testid^="alert-select-"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')!.replace('alert-select-', '')),
    )
    expect(ids.length).toBe(2)
    await page.getByTestId(`alert-select-${ids[0]}`).check()
    await page.getByTestId('alert-batch-disable').click()
    // 停用后选择清空；重新勾选第一行删除
    await page.getByTestId(`alert-select-${ids[0]}`).check()
    await page.getByTestId('alert-batch-delete').click()
    await expect(page.getByTestId('alert-row')).toHaveCount(1)
  })

  test('E12 待触发角标：创建未触发提醒后头部提醒项显示计数', async ({ page }) => {
    await openAlerts(page)
    await addAlert(page, '99999')
    // E13 快捷键 a 关闭面板后展开 More：提醒项出现角标（待触发 1）
    await page.keyboard.press('a')
    await expect(page.getByRole('region', { name: /价格提醒/ })).toHaveCount(0)
    await openMore(page)
    await expect(page.getByTestId('alerts-pending-badge')).toHaveText('1')
  })

  test('E14 JSON 导出：点击导出触发下载 alerts.json', async ({ page }) => {
    await openAlerts(page)
    await addAlert(page, '99999')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('alert-export-json').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/alerts\.json$/)
  })

  test('E1 站内横幅：种一条已满足的提醒，重载后 toast 弹出且可手动关闭', async ({ page }) => {
    // 合成价约 5 万：above/40000 在第一个价格 tick 就已触达 → 引擎 dispatch price-alert-triggered
    await page.evaluate(() =>
      localStorage.setItem(
        'kline-buty:alerts',
        JSON.stringify([{ id: 'seed-e1', symbol: 'BTCUSDT', direction: 'above', price: 40000, triggered: false, repeat: false }]),
      ),
    )
    // toast 只在触发后停留 4 秒：先等它出现再断言，不能先等价格文本再看它还在不在
    await page.reload()
    await page.waitForSelector('[data-testid="alert-toast"]', { timeout: 20_000 })
    const toast = page.getByTestId('alert-toast')
    await expect(toast).toContainText('BTC/USDT')
    await expect(toast).toContainText(/≥ 40000/)
    await expect(toast).toContainText('→')
    await page.getByTestId('alert-toast-dismiss').click()
    await expect(page.getByTestId('alert-toast')).toHaveCount(0)
  })
})
