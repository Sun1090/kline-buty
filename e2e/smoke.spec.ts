import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/** 等待蜡烛真正渲染（canvas 出现涨跌色像素）；冷启动直连慢时刷新一次重试，避免环境抖动误报 */
/** 等待盘口数据渲染；冷启动直连慢时刷新重试一次（避免实时数据抖动误报） */
/** 等待深度图数据渲染；冷启动直连慢时刷新重试一次 */
async function waitDepthReady(page: Page) {
  const openPanel = async () => {
    await page.getByRole('button', { name: '深度' }).click()
    await page.getByTestId('depth-chart').waitFor({ timeout: 20_000 })
  }
  try {
    await openPanel()
  } catch {
    await page.reload()
    await page.waitForFunction(() => document.body.innerText.includes('实时'), { timeout: 30_000 })
    await waitCandlesRendered(page)
    await openPanel()
  }
}

async function waitOrderBookReady(page: Page) {
  const openPanel = async () => {
    await page.getByRole('button', { name: '盘口' }).click()
    await page.getByTestId('ob-bid').first().waitFor({ timeout: 20_000 })
    await page.getByTestId('ob-ask').first().waitFor({ timeout: 20_000 })
  }
  try {
    await openPanel()
  } catch {
    await page.reload()
    await page.waitForFunction(() => document.body.innerText.includes('实时'), { timeout: 30_000 })
    await waitCandlesRendered(page)
    await openPanel()
  }
}

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
    // 首次冷启动直连币安偶发慢：刷新页面重试一次
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await hasCandles()
  }
}

/** 扫描画线 overlay 画布，返回黄色线条像素的几何中点（CSS 坐标，含容器偏移） */
async function findDrawnLineCenter(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return null
    const ctx = overlay.getContext('2d')
    if (!ctx) return null
    const { width, height } = overlay
    const img = ctx.getImageData(0, 0, width, height).data
    const dpr = window.devicePixelRatio || 1
    const rect = overlay.getBoundingClientRect()
    let sx = 0
    let sy = 0
    let n = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const r = img[i]
        const g = img[i + 1]
        const b = img[i + 2]
        const a = img[i + 3]
        // 画线像素：主题黄 #f5c02f 或选中蓝 #4e9cf5（含抗锯齿容差）
        const yellow = a > 100 && r > 190 && g > 130 && g < 235 && b < 110
        const blue = a > 100 && b > 190 && g > 110 && g < 200 && r < 130
        if (yellow || blue) {
          sx += x / dpr
          sy += y / dpr
          n++
        }
      }
    }
    if (!n) return null
    return { x: rect.left + sx / n, y: rect.top + sy / n }
  })
}

/** 扫描画线 overlay，返回蓝色选中锚点的位置：which='max' 取最右侧（尾锚点），'min' 取最左侧（首锚点） */
async function findDrawingAnchor(
  page: Page,
  which: 'max' | 'min',
): Promise<{ x: number; y: number } | null> {
  return page.evaluate((w) => {
    const overlay = [...document.querySelectorAll('canvas')].find((c) => {
      const st = getComputedStyle(c)
      return st.position === 'absolute' && st.zIndex === '5'
    })
    if (!overlay) return null
    const ctx = overlay.getContext('2d')
    if (!ctx) return null
    const { width, height } = overlay
    const img = ctx.getImageData(0, 0, width, height).data
    const dpr = window.devicePixelRatio || 1
    const rect = overlay.getBoundingClientRect()
    const pts: { x: number; y: number }[] = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const r = img[i]
        const g = img[i + 1]
        const b = img[i + 2]
        const a = img[i + 3]
        // 选中蓝 #4e9cf5（含抗锯齿容差）
        if (a > 100 && b > 190 && g > 110 && g < 200 && r < 130) pts.push({ x: x / dpr, y: y / dpr })
      }
    }
    if (!pts.length) return null
    const ext = w === 'max' ? Math.max(...pts.map((p) => p.x)) : Math.min(...pts.map((p) => p.x))
    const near = pts.filter((p) => (w === 'max' ? p.x > ext - 8 : p.x < ext + 8))
    if (!near.length) return null
    const sx = near.reduce((s, p) => s + p.x, 0) / near.length
    const sy = near.reduce((s, p) => s + p.y, 0) / near.length
    return { x: rect.left + sx, y: rect.top + sy }
  }, which)
}

/**
 * 拖拽选中画线的指定锚点（min=首锚点/max=尾锚点），直到 verify 通过或重试耗尽。
 * 实时行情会平移图表，扫描-拖拽存在竞态：失败则重新扫描（必要时点选线中心重新选中）再拖。
 */
async function dragSelectedAnchorUntil(
  page: Page,
  which: 'min' | 'max',
  dx: number,
  dy: number,
  verify: () => Promise<boolean>,
): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    let anchor = await findDrawingAnchor(page, which)
    if (!anchor) {
      // 画线可能被取消选中：点选线中心重新选中
      const center = await findDrawnLineCenter(page)
      if (center) {
        await page.mouse.move(center.x, center.y)
        await page.mouse.click()
        await page.waitForTimeout(300)
        anchor = await findDrawingAnchor(page, which)
      }
      if (!anchor) {
        await page.waitForTimeout(500)
        continue
      }
    }
    await page.mouse.move(anchor.x, anchor.y)
    await page.mouse.down()
    await page.mouse.move(anchor.x + dx, anchor.y + dy, { steps: 4 })
    await page.mouse.up()
    // 轮询提交结果（最多 3s）
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500)
      if (await verify()) return true
    }
  }
  return false
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
    await waitDepthReady(page)
    await expect(page.getByText(/盘口深度/)).toBeVisible()
    // 深度图新标注：价差 + 买卖累计总量（K/M 紧凑格式）
    await expect(page.getByTestId('depth-chart')).toBeVisible()
    await expect(page.getByText(/spread \d/)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^买 [\d.]+[KM]?$/)).toBeVisible()
    await expect(page.getByText(/^卖 [\d.]+[KM]?$/)).toBeVisible()
    await page.getByRole('button', { name: '筹码' }).click()
    await expect(page.getByText(/筹码分布/)).toBeVisible()
    await page.getByRole('button', { name: '深度' }).click()
    await expect(page.getByText(/盘口深度/)).toHaveCount(0)
  })

  test('深度图 hover：十字线 + 买卖累计明细工具提示', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitDepthReady(page)
    const svg = page.getByTestId('depth-chart')
    await expect(svg).toBeVisible()
    const box = await svg.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    // hover 到图表中部 → 十字线 + 工具提示出现
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5)
    await expect(page.getByTestId('depth-crosshair')).toHaveCount(1, { timeout: 5_000 })
    const tip = page.getByTestId('depth-tooltip')
    await expect(tip).toBeVisible({ timeout: 5_000 })
    // 工具提示含买/卖累计文案
    await expect(tip.getByText(/买 [\d.]+[KM]?/)).toBeVisible()
    await expect(tip.getByText(/卖 [\d.]+[KM]?/)).toBeVisible()
    // 移出图表 → 工具提示与十字线消失
    await page.mouse.move(10, 10)
    await expect(page.getByTestId('depth-tooltip')).toHaveCount(0, { timeout: 5_000 })
    await expect(page.getByTestId('depth-crosshair')).toHaveCount(0)
  })


  test('盘口订单簿：开合 + 买卖档位/价差渲染', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '盘口' }).click()
    await expect(page.getByTestId('order-book')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/盘口订单簿/)).toBeVisible({ timeout: 15_000 })
    // 等待 WS 档位数据到达：买卖各 8 档 + 价差行
    await expect(page.getByTestId('ob-ask')).toHaveCount(8, { timeout: 15_000 })
    await expect(page.getByTestId('ob-bid')).toHaveCount(8)
    await expect(page.getByTestId('ob-spread')).toBeVisible()
    // 关闭
    await page.getByRole('button', { name: '盘口' }).click()
    await expect(page.getByTestId('order-book')).toHaveCount(0)
  })


  test('盘口联动：hover 档位 → 主图参考价格线出现，移出清除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await page.getByRole('button', { name: '盘口' }).click()
    const row = page.getByTestId('ob-bid').first()
    await expect(row).toBeVisible({ timeout: 20_000 })
    // 主图 canvas 上 accent 色（#2962ff）像素数
    const accentPx = () =>
      page.evaluate(() => {
        const c = document.querySelectorAll('canvas')[0]
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
        let n = 0
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
          if (a > 60 && r > 25 && r < 70 && g > 80 && g < 120 && b > 220) n++
        }
        return n
      })
    const box = await row.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeGreaterThan(200)
    // 移出盘口面板 → 参考线清除
    await page.mouse.move(10, 10)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeLessThan(50)
  })


  test('盘口联动：点击档位 → 主图限价标记线（移出鼠标仍保留，同档再点清除）', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await page.getByRole('button', { name: '盘口' }).click()
    const row = page.getByTestId('ob-bid').first()
    await expect(row).toBeVisible({ timeout: 20_000 })
    const accentPx = () =>
      page.evaluate(() => {
        const c = document.querySelectorAll('canvas')[0]
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
        let n = 0
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
          if (a > 60 && r > 25 && r < 70 && g > 80 && g < 120 && b > 220) n++
        }
        return n
      })
    const box = await row.boundingBox()
    // 点击第一档 → 标记线出现；移出鼠标后仍保留（区别于 hover 参考线）
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.move(10, 10)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeGreaterThan(200)
    // 再点同一档 → 标记线清除
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.move(10, 10)
    await expect.poll(() => accentPx(), { timeout: 10_000 }).toBeLessThan(50)
  })


  test('盘口快速下单：买盘快捷「买」→ 价格预填 + 金额估算 → 确认打开模拟仓位', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await waitOrderBookReady(page)
    const bid = page.getByTestId('ob-bid').first()
    const bidPrice = Number(await bid.getAttribute('data-price'))
    const bidBox = await bid.boundingBox()
    await page.mouse.move(bidBox!.x + bidBox!.width / 2, bidBox!.y + bidBox!.height / 2)
    await expect(page.getByTestId('qo-buy')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('qo-buy').click()
    await expect(page.getByTestId('quick-order')).toBeVisible()
    await expect(page.getByTestId('quick-order').getByText('买入')).toBeVisible()
    // 价格预填为盘口档位价（容差 2%），金额估算展示
    const buyPrice = Number(await page.getByTestId('qo-price').inputValue())
    expect(Math.abs(buyPrice - bidPrice) / bidPrice).toBeLessThan(0.02)
    await expect(page.getByText(/预估金额/)).toBeVisible()
    await expect(page.getByText(/手续费/)).toBeVisible()
    // 确认 → 模拟仓位面板打开（浮动盈亏可见）
    await page.getByTestId('qo-confirm').click()
    await expect(page.getByText('浮动盈亏')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('模拟仓位')).toBeVisible()
  })

  test('盘口快速下单：卖盘快捷「卖」→ 确认后建立空头仓位', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await waitOrderBookReady(page)
    const ask = page.getByTestId('ob-ask').first()
    const askBox = await ask.boundingBox()
    await page.mouse.move(askBox!.x + askBox!.width / 2, askBox!.y + askBox!.height / 2)
    await expect(page.getByTestId('qo-sell')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('qo-sell').click()
    await expect(page.getByTestId('quick-order')).toBeVisible()
    await expect(page.getByTestId('quick-order').getByText('卖出')).toBeVisible()
    await page.getByTestId('qo-confirm').click()
    await expect(page.getByText('浮动盈亏')).toBeVisible({ timeout: 5000 })
  })

  test('情绪面板：开合 + 四类指标标题可见（数据可加载中）', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '情绪' }).click()
    await expect(page.getByText('全账户多空比')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('大户持仓多空比')).toBeVisible()
    await expect(page.getByText('主动买卖比')).toBeVisible()
    await expect(page.getByText('未平仓 24h')).toBeVisible()
    await page.getByRole('button', { name: '情绪' }).click()
    await expect(page.getByText('全账户多空比')).toHaveCount(0)
  })

  test('分享链接：URL 参数定位品种/周期 + 复制链接', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/?symbol=ETHUSDT&period=1h')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // URL 参数已定位品种
    await expect(page.getByText('ETH/USDT', { exact: false }).first()).toBeVisible()
    // 1时 周期处于选中态（accent 背景）
    const bg = await page
      .getByRole('button', { name: '1时' })
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(41, 98, 255)')
    // 复制分享链接 → 剪贴板含当前品种与周期
    await page.getByRole('button', { name: '分享' }).click()
    await expect(page.getByText('已复制')).toBeVisible({ timeout: 5000 })
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('symbol=ETHUSDT')
    expect(clip).toContain('period=1h')
  })

  test('CSV 导出：一键下载含当前指标列的 K 线文件', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 默认主图 MA（5/10/20）+ 副图 VOL → 头部应为 time,open,high,low,close,volume,MA5,MA10,MA20
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出', exact: true }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^BTCUSDT_1m_\d{8}\.csv$/)
    const path = await download.path()
    expect(path).toBeTruthy()
    const csv = readFileSync(path!, 'utf8').replace(/^\uFEFF/, '')
    const lines = csv.trimEnd().split('\r\n')
    expect(lines[0]).toBe('time,open,high,low,close,volume,MA5,MA10,MA20')
    expect(lines.length).toBeGreaterThanOrEqual(2)
    // 数据行：ISO 时间 + 至少 5 个数值字段
    expect(lines[1].split(',')[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(lines[1].split(',').slice(1, 6).every((v) => v !== '' && !Number.isNaN(Number(v)))).toBe(true)
  })

  test('区域截图：框选拖拽 → 裁剪导出 PNG + 按钮状态恢复', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 进入框选模式：按钮高亮 + 顶部提示条出现
    await page.getByRole('button', { name: '框选' }).click()
    await expect(page.getByText('拖拽', { exact: false })).toBeVisible({ timeout: 5000 })
    const bg = await page
      .getByRole('button', { name: '框选' })
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toContain('41, 98, 255')
    // 主图拖拽出矩形 → 触发下载（文件名含 _region.png）
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.3)
        await page.mouse.down()
        await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.55, { steps: 6 })
        await page.mouse.up()
      })(),
    ])
    expect(download.suggestedFilename()).toMatch(/^BTCUSDT_1m_region\.png$/)
    const path = await download.path()
    expect(path).toBeTruthy()
    // PNG 有效且非空（文件头 + 尺寸合理）
    const buf = readFileSync(path!)
    expect(buf.subarray(0, 4).toString('latin1')).toBe('\x89PNG')
    expect(buf.length).toBeGreaterThan(1024)
    // 松开后自动退出框选：提示条消失
    await expect(page.getByText('拖拽', { exact: false })).toHaveCount(0)
  })

  test('主题色预设：切换红涨绿跌 → CSS 变量/图表联动 + 持久化', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 默认 classic：--up 为 #26a69a
    const upBefore = await page.evaluate(() => document.documentElement.style.getPropertyValue('--up'))
    expect(upBefore).toBe('#26a69a')
    // 点击「红涨绿跌」预设
    await page.locator('button[data-preset="a-share"]').click()
    await page.waitForTimeout(300)
    const upAfter = await page.evaluate(() => document.documentElement.style.getPropertyValue('--up'))
    expect(upAfter).toBe('#ef5350')
    const downAfter = await page.evaluate(() => document.documentElement.style.getPropertyValue('--down'))
    expect(downAfter).toBe('#26a69a')
    // 选中态按钮 aria-pressed=true
    await expect(page.locator('button[data-preset="a-share"]')).toHaveAttribute('aria-pressed', 'true')
    expect(errors).toHaveLength(0)
    // 刷新后持久化保持
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    const upPersisted = await page.evaluate(() => document.documentElement.style.getPropertyValue('--up'))
    expect(upPersisted).toBe('#ef5350')
  })

  test('自选收藏：星标添加 → 置顶自选区 → 取消', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 打开交易对选择器（按钮文案 = 当前品种）
    await page.locator('button', { hasText: 'BTC/USDT' }).click()
    // 收藏第一行（BTCUSDT）的星标
    await page.getByRole('button', { name: '加入自选' }).first().click()
    // 自选区出现且星标变实心（可取消）
    await expect(page.getByText('自选')).toBeVisible()
    await expect(page.getByRole('button', { name: '取消自选' }).first()).toBeVisible()
    // 取消收藏 → 自选区消失
    await page.getByRole('button', { name: '取消自选' }).first().click()
    await expect(page.getByText('自选')).toHaveCount(0)
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


  test('画线：椭圆 + 圆 → 绘制 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 椭圆：拖出两对角锚点（外接框）
    await page.getByRole('button', { name: '椭圆' }).click()
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 圆：圆心 + 半径点
    await page.getByRole('button', { name: '圆', exact: true }).click()
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.35, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：三角形（3 锚点）+ 圆弧 → 绘制 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 三角形：三点点击（A/B/C）集满提交
    await page.getByRole('button', { name: '三角形' }).click()
    await page.mouse.click(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.55, box!.y + box!.height * 0.5)
    await page.mouse.click(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 圆弧：拖出两点定弦
    await page.getByRole('button', { name: '圆弧' }).click()
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.4, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：斐波那契扩展（3 锚点）+ 扇形 + 价格标签 + 箭头 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 斐波那契扩展：三点点击（A/B/C）集满提交
    await page.getByRole('button', { name: '斐波那契扩展' }).click()
    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.25)
    await page.mouse.click(box!.x + box!.width * 0.6, box!.y + box!.height * 0.45)
    await page.mouse.click(box!.x + box!.width * 0.45, box!.y + box!.height * 0.35)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 斐波那契扇形：拖出原点 + 方向点
    await page.getByRole('button', { name: '斐波那契扇形' }).click()
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 价格标签：单击放置
    await page.getByRole('button', { name: '价格标签' }).click()
    await page.mouse.click(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)

    // 箭头：拖出 A→B
    await page.getByRole('button', { name: '箭头' }).click()
    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：趋势线 → 鼠标拖拽整线移动 → 锚点增量一致 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 趋势线工具画一条线
    await page.getByRole('button', { name: '趋势线' }).click()
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
          const arr = Object.values(d)[0] as {
            id: string
            points: { time: number; price: number }[]
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const before = await readFirst()
    expect(before).not.toBeNull()
    expect(before!.points).toHaveLength(2)

    // 切回鼠标（只读）→ 定位画线实际中心 → 按住拖拽整线
    await page.getByRole('button', { name: '鼠标' }).click()
    await expect.poll(() => findDrawnLineCenter(page), { timeout: 5000 }).not.toBeNull()
    const center = (await findDrawnLineCenter(page))!
    await page.mouse.move(center.x, center.y)
    await page.mouse.down()
    await page.mouse.move(center.x + box!.width * 0.18, center.y + box!.height * 0.12, { steps: 5 })
    await page.mouse.up()

    // 提交后：同一 id，各锚点时间/价格增量一致（整线平移）且确实发生了移动
    await expect
      .poll(
        async () => {
          const after = await readFirst()
          if (!after || after.points.length !== 2) return false
          const dT0 = after.points[0].time - before!.points[0].time
          const dT1 = after.points[1].time - before!.points[1].time
          const dP0 = after.points[0].price - before!.points[0].price
          const dP1 = after.points[1].price - before!.points[1].price
          return (
            after.id === before!.id &&
            dT0 === dT1 &&
            dP0 === dP1 &&
            (Math.abs(dT0) > 0.5 || Math.abs(dP0) > 0.01)
          )
        },
        { timeout: 10_000 },
      )
      .toBe(true)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：趋势线 → 拖拽尾锚点 → 仅该锚点移动 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 画一条趋势线（左→右，锚点按时间排序）
    await page.getByRole('button', { name: '趋势线' }).click()
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.35)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.55, box!.y + box!.height * 0.45, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
          const arr = Object.values(d)[0] as {
            id: string
            points: { time: number; price: number }[]
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const before = await readFirst()
    expect(before).not.toBeNull()
    expect(before!.points).toHaveLength(2)

    // 切回鼠标 → 拖拽最右侧（尾）锚点；实时行情会平移图表，重试直到仅尾锚点移动
    await page.getByRole('button', { name: '鼠标' }).click()
    const tailMoved = await dragSelectedAnchorUntil(
      page,
      'max',
      box!.width * 0.08,
      box!.height * 0.05,
      async () => {
        const after = await readFirst()
        if (!after || after.points.length !== 2) return false
        const headSame =
          after.points[0].time === before!.points[0].time && after.points[0].price === before!.points[0].price
        const tailChanged =
          after.points[1].time !== before!.points[1].time ||
          after.points[1].price !== before!.points[1].price
        return after.id === before!.id && headSame && tailChanged
      },
    )
    expect(tailMoved).toBe(true)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('画线：射线 → 拖拽锚点 → 方向点保留 + 顺序不变 → 删除', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 画一条射线：锚点 → 方向点（向右上延伸）
    await page.getByRole('button', { name: '射线' }).click()
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.35, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    const readFirst = () =>
      page.evaluate(() => {
        try {
          const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}')
          const arr = Object.values(d)[0] as {
            id: string
            points: { time: number; price: number }[]
          }[]
          return arr[0] ?? null
        } catch {
          return null
        }
      })
    const before = await readFirst()
    expect(before).not.toBeNull()
    expect(before!.points).toHaveLength(2)

    // 切回鼠标 → 拖拽最左侧（首）锚点；实时行情会平移图表，重试直到锚点移动且方向点保留
    await page.getByRole('button', { name: '鼠标' }).click()
    const anchorMoved = await dragSelectedAnchorUntil(
      page,
      'min',
      -box!.width * 0.06,
      box!.height * 0.08,
      async () => {
        const after = await readFirst()
        if (!after || after.points.length !== 2) return false
        const dirSame =
          after.points[1].time === before!.points[1].time && after.points[1].price === before!.points[1].price
        const anchorChanged =
          after.points[0].time !== before!.points[0].time ||
          after.points[0].price !== before!.points[0].price
        return after.id === before!.id && dirSame && anchorChanged
      },
    )
    expect(anchorMoved).toBe(true)

    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  })

  test('i18n：5 语循环切换（中/EN/日本語/한국어/ES）→ 界面文案切换并持久化', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    // 默认中文 → 点「中文」切英文
    await page.getByRole('button', { name: '中文', exact: true }).click()
    await expect(page.getByText('Live', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Type', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fullscreen', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()
    // 语言持久化：刷新后仍为英文
    await page.reload()
    await expect(page.getByText('Live', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()
    // EN → 日本語
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByText('リアルタイム', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('タイプ', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '日本語', exact: true })).toBeVisible()
    // 日本語 → 한국어
    await page.getByRole('button', { name: '日本語', exact: true }).click()
    await expect(page.getByText('실시간', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('유형', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '한국어', exact: true })).toBeVisible()
    // 刷新持久化：仍为韩语
    await page.reload()
    await expect(page.getByText('실시간', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: '한국어', exact: true })).toBeVisible()
    // 韩国语 → Español
    await page.getByRole('button', { name: '한국어', exact: true }).click()
    await expect(page.getByText('En vivo', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Tipo', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'ES', exact: true })).toBeVisible()
    // Español → 切回中文
    await page.getByRole('button', { name: 'ES', exact: true }).click()
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })
})


  test('主图指标：SAR 切换无异常 + Ichimoku 云带/线渲染', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 等蜡烛像素出现（不做 reload 重试：云带断言自带 15s 轮询，避免冷启动吃掉用例超时）
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
      { timeout: 30_000 },
    )
    // SAR：切换后不抛错（圆点走 marker 渲染路径）
    await page.getByRole('button', { name: 'SAR', exact: true }).click()
    await page.waitForTimeout(1200)
    expect(errors).toHaveLength(0)
    // Ichimoku：云带填充（0.12 涨色叠深色底 ≈ 暗青 rgb(21,40,48)）+ 先行带 B 橙线 #f57f17
    await page.getByRole('button', { name: 'Ichimoku', exact: true }).click()
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            let cloud = 0
            let orange = 0
            for (const c of document.querySelectorAll('canvas')) {
              const ctx = c.getContext('2d')
              if (!ctx || c.width < 100) continue
              const d = ctx.getImageData(0, 0, c.width, c.height).data
              for (let i = 0; i < d.length; i += 4) {
                const r = d[i]
                const g = d[i + 1]
                const b = d[i + 2]
                if (Math.abs(r - 21) < 14 && Math.abs(g - 40) < 14 && Math.abs(b - 48) < 14) cloud++
                if (r > 200 && g > 80 && g < 180 && b < 80) orange++
              }
            }
            return { cloud, orange }
          }),
        (v) => v.cloud > 60 && v.orange > 40,
        { timeout: 15_000 },
      )
      .toBeTruthy()
    expect(errors).toHaveLength(0)
  })

  test('指标参数：RSI 改 7 即时生效 + 全指标切换无异常 + 参数持久化', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 轻量等待蜡烛像素出现（避免 reload 重试）
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
      { timeout: 30_000 },
    )
    // 打开 RSI 参数：默认 14 → 改为 7
    await page.getByRole('button', { name: 'RSI', exact: true }).click()
    await page.getByRole('button', { name: '参数', exact: true }).click()
    await expect(page.getByText('RSI 周期', { exact: true })).toBeVisible()
    const rsiInput = page.locator('xpath=//span[text()="RSI 周期"]/following-sibling::input')
    await expect(rsiInput).toHaveValue('14')
    await rsiInput.fill('7')
    await page.getByRole('button', { name: '✕', exact: true }).click()
    // 全指标切换无异常（含新接线参数的 WR/OBV/ATR/DMI/CCI/PSY/SAR/Ichimoku）
    for (const name of ['WR', 'OBV', 'ATR', 'DMI', 'CCI', 'PSY', 'STOCH', 'ROC', 'MOM']) {
      await page.getByRole('button', { name, exact: true }).click()
      await page.waitForTimeout(250)
    }
    await page.getByRole('button', { name: 'SAR', exact: true }).click()
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Ichimoku', exact: true }).click()
    await page.waitForTimeout(800)
    expect(errors).toHaveLength(0)
    // 切回 RSI：参数已持久化为 7
    await page.getByRole('button', { name: 'RSI', exact: true }).click()
    await page.getByRole('button', { name: '参数', exact: true }).click()
    await expect(page.locator('xpath=//span[text()="RSI 周期"]/following-sibling::input')).toHaveValue('7')
    await page.getByRole('button', { name: '✕', exact: true }).click()
    expect(errors).toHaveLength(0)
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

  test('双指捏合纵向缩放：价格轴区间变化（固定价画线位移）+ 无异常', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()

    // 画一条水平线（价格轴上部，固定价格）
    await page.getByRole('button', { name: '水平线' }).tap()
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.25)
    const before = await findDrawnLineCenter(page)
    expect(before).not.toBeNull()

    // CDP 双指捏合（张开 → 放大：价格区间收窄 → 固定价画线位移）
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: cx - 40, y: cy },
        { x: cx + 40, y: cy },
      ],
    })
    for (let i = 1; i <= 6; i++) {
      const spread = 40 + i * 20
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: cx - spread, y: cy },
          { x: cx + spread, y: cy },
        ],
      })
      await page.waitForTimeout(60)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await page.waitForTimeout(800)

    const after = await findDrawnLineCenter(page)
    expect(after).not.toBeNull()
    // 捏合后价格轴缩放，固定价格的线发生明显位移（>10px）
    expect(Math.abs(after!.y - before!.y)).toBeGreaterThan(10)
    expect(errors).toHaveLength(0)
  })
})
