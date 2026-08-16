import { test, expect, type Page } from '@playwright/test'

/** 等待蜡烛真正渲染（canvas 出现涨跌色像素） */
async function waitCandlesRendered(page: Page) {
  await page.waitForFunction(
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
    { timeout: 20_000 },
  )
}

test.describe('K 线应用冒烟', () => {
  test('页面加载 → 实时行情 + 图表渲染', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('canvas').first()).toBeVisible()
    // 信息条数据（资金费率等）
    await expect(page.getByText('资金费率', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  })

  test('切换周期/指标/交易对无异常', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 等蜡烛真正渲染（canvas 涨跌色像素）
    await waitCandlesRendered(page)
    await page.getByRole('button', { name: '1时' }).click()
    await page.getByRole('button', { name: 'MACD' }).click()
    await page.getByRole('button', { name: 'BOLL' }).click()
    // 打开当前交易对下拉，用搜索过滤后切换
    await page.getByRole('button', { name: 'BTC/USDT ▾' }).click()
    await page.getByPlaceholder('搜索交易对…').fill('doge')
    await page.getByText('DOGE/USDT', { exact: true }).first().click()
    await page.waitForTimeout(1500)
    expect(errors).toHaveLength(0)
  })

  test('回放：进入 → 播放 → 游标推进 → 退出', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '回放', exact: true }).click()
    await expect(page.getByRole('button', { name: '播放' })).toBeVisible()
    await page.getByRole('button', { name: '播放' }).click()
    await page.waitForTimeout(2500)
    await expect(page.getByRole('button', { name: '暂停' })).toBeVisible()
    await page.getByRole('button', { name: '退出回放' }).click()
    await expect(page.getByRole('button', { name: '退出回放' })).toHaveCount(0)
  })

  test('仓位：开仓 → 浮动盈亏显示 → 平仓', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '仓位' }).click()
    await expect(page.getByText('模拟仓位')).toBeVisible()
    await page.getByRole('button', { name: '开空' }).click()
    const inputs = page.locator('input')
    await inputs.nth(0).fill('60000')
    await inputs.nth(1).fill('1')
    await page.getByRole('button', { name: '开仓' }).click()
    await expect(page.getByText(/浮动盈亏/)).toBeVisible()
    await expect(page.getByText('止盈线', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: '平仓' }).click()
    await expect(page.getByRole('button', { name: '开仓' })).toBeVisible()
  })

  test('画线：绘制水平线 → 选中 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await page.getByRole('button', { name: '水平线' }).click()
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 在图表中部按住拖动画一条水平线
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.4, { steps: 5 })
    await page.mouse.up()
    // 画线已提交并持久化
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
              return Object.values(d).reduce((n, arr) => n + (arr as unknown[]).length, 0)
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0)
    // 创建后自动选中 → 删除按钮出现
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：平行通道 → 选中 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await page.getByRole('button', { name: '平行通道' }).click()
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖出两锚点（基线 + 平行线）
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.42, { steps: 4 })
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.3, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：文本标注 → 输入文字 → 确定 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await page.getByRole('button', { name: '文本' }).click()
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 单击放置（down → 微动 → up）
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.52, box!.y + box!.height * 0.4, { steps: 2 })
    await page.mouse.up()
    await expect(page.getByPlaceholder('文本内容')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('文本内容').fill('关键位')
    await page.getByRole('button', { name: '确定' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('深度/筹码面板开关', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '深度' }).click()
    await expect(page.getByText(/盘口深度/)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: '筹码' }).click()
    await expect(page.getByText(/筹码分布/)).toBeVisible()
    await page.getByRole('button', { name: '深度' }).click()
    await expect(page.getByText(/盘口深度/)).toHaveCount(0)
  })


  test('画线：矩形 + 射线 → 绘制 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 矩形：拖出两对角锚点
    await page.getByRole('button', { name: '矩形' }).click()
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 射线：锚点 + 方向点
    await page.getByRole('button', { name: '射线' }).click()
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.35, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('i18n：中/英文切换 → 界面文案切换并持久化', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    // 默认中文 → 点 EN 切英文
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByText('Live', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Type', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fullscreen', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '中文', exact: true })).toBeVisible()
    // 语言持久化：刷新后仍为英文
    await page.reload()
    await expect(page.getByText('Live', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: '中文', exact: true })).toBeVisible()
    // 切回中文恢复
    await page.getByRole('button', { name: '中文', exact: true }).click()
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })
})

test.describe('移动端（390×844 触屏视口）', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('页面无横向溢出 + 工具栏可滚动 + 触屏操作可用', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('canvas').first()).toBeVisible()
    // 无横向页面溢出（工具栏在容器内部横向滚动，不撑破页面）
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
    // 触屏点击周期按钮（工具栏自动滚动到可见）
    await page.getByRole('button', { name: '1时' }).tap()
    await page.waitForTimeout(500)
    // 触屏进入画线模式（矩形）
    await page.getByRole('button', { name: '矩形' }).tap()
    await page.waitForTimeout(300)
    // 图表仍有足够宽度
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(300)
  })
})
