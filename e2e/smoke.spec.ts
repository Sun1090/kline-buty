import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { countBandDiff, decodePng, openDrawing, openMore, readChartBand, waitCandlesRendered } from './helpers/smoke'
/**
 * 主冒烟。数据源：`?perf=600` 合成蜡烛（19 处 goto 全换）。
 *
 * 它原先挂 localOnly 的理由是「实时行情 + 图表渲染 + 资金费率等真实端点」—— 半真：
 * 只有「资金费率」那一行离不开线上（`useMarketStats` 在 perf 下按设计返回空），
 * 已拆到 `e2e/smoke-live.spec.ts`。其余 19 例要的都是「有一片能渲染的蜡烛」，
 * 合成契约给得出，改完 URL 本机 chromium 19/19、webkit 19/19 全绿。
 *
 * 两处值得记下来的实测纠偏（都是先看代码推断、后被跑推翻）：
 * - `live-price` 在 `?perf` 下**照样跳动**：合成蜡烛喂的是同一个价格通道，8 次采样 8 个不同值。
 *   所以「WS 帧驱动价格变动」这半个断言不需要真实端点。
 * - 「自选收藏」不依赖侧栏 `market-row-*`：`?perf` 下 `useTickerList` 会 `setRows([])`，
 *   侧栏确实空，但星标在交易对下拉里，下拉用自己的列表 —— 这一例改 perf 后仍然绿。
 */
test.describe('K 线应用冒烟', () => {
  test.use({ acceptDownloads: true })

  test('图表水印 + 免责声明可见', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 图表右下水印：交易对 · 周期
    const watermark = page.getByTestId('chart-watermark')
    await expect(watermark).toBeVisible({ timeout: 20_000 })
    await expect(watermark).toContainText('BTC/USDT')
    // 页脚免责声明
    await expect(page.getByTestId('disclaimer')).toBeVisible()
    await expect(page.getByTestId('disclaimer')).toContainText(/参考|advice|referencia/i)
  })

  test('图表水印开关：更多面板切换 → canvas 水印消失/恢复 + 持久化', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 默认开：更多面板内「图表水印」为激活态
    await openMore(page)
    const toggle = page.getByTestId('watermark-toggle')
    await expect(toggle).toBeVisible()
    const isActive = async () => (await toggle.getAttribute('aria-pressed')) === 'true'
    expect(await isActive()).toBe(true)
    // canvas 水印带像素：关掉前后应显著变化
    const on1 = await readChartBand(page)
    await toggle.click()
    const off = await readChartBand(page)
    expect(countBandDiff(on1, off)).toBeGreaterThan(30)
    expect(await isActive()).toBe(false)
    expect(await page.evaluate(() => localStorage.getItem('kline-buty:watermark'))).toBe('false')
    // 再开 → 水印带恢复（差异应重新变大）
    await toggle.click()
    const on2 = await readChartBand(page)
    expect(countBandDiff(off, on2)).toBeGreaterThan(30)
    expect(await page.evaluate(() => localStorage.getItem('kline-buty:watermark'))).toBe('true')
    // 持久化：关掉后刷新仍为关闭
    await toggle.click()
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await openMore(page)
    expect(await isActive()).toBe(false)
  })
  test('导出截图：图表水印关闭后仍强制携带免责声明角标', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 用户可关闭图表水印；但外发截图必须保留合规声明
    await openMore(page)
    const toggle = page.getByTestId('watermark-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    // 更多面板会覆盖图表右上角：先收起，再点图表内「截图」
    await page.getByTestId('header-more').click()
    await expect(page.getByTestId('desktop-more-panel')).toHaveCount(0)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '截图', exact: true }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^BTCUSDT_1m(?:@1x)?\.png$/)
    const png = decodePng(readFileSync(await download.path()))
    // 只检查角标所在右下区域；浅色文字像素量足以区分普通轴标签/网格
    let textPixels = 0
    for (let y = Math.max(0, png.height - 48); y < png.height; y++) {
      for (let x = Math.max(0, png.width - 320); x < png.width; x++) {
        const i = (y * png.width + x) * 4
        const [r, g, b, a] = [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]]
        if (a > 220 && r > 170 && g > 170 && b > 170 && Math.abs(r - g) < 28 && Math.abs(g - b) < 28) textPixels++
      }
    }
    expect(textPixels).toBeGreaterThan(120)
  })

  test('切换周期/指标/交易对无异常', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 等蜡烛真正渲染（canvas 涨跌色像素）
    await waitCandlesRendered(page)
    await page.getByRole('button', { name: '1时' }).click()
    // 主图/副图指标已折叠进「更多」面板（选中不收起，可连续切换）
    await openMore(page)
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
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await openMore(page)
    await page.getByRole('button', { name: '回放', exact: true }).click()
    await expect(page.getByRole('button', { name: '播放' })).toBeVisible()
    await page.getByRole('button', { name: '播放' }).click()
    await page.waitForTimeout(2500)
    await expect(page.getByRole('button', { name: '暂停' })).toBeVisible()
    await page.getByRole('button', { name: '退出回放' }).click()
    await expect(page.getByRole('button', { name: '退出回放' })).toHaveCount(0)
  })

  test('仓位：开仓 → 浮动盈亏显示 → 平仓', async ({ page }) => {
    await page.goto('/?perf=600')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('live-price')).toContainText(/[\d.,]+/, { timeout: 20_000 })
    await openMore(page)
    await page.getByRole('button', { name: '仓位' }).click()
    await expect(page.getByText('模拟仓位')).toBeVisible()
    await page.getByRole('button', { name: '开空' }).click()
    const inputs = page.getByRole('region', { name: '模拟仓位' }).locator('input')
    // 开仓价交给输入框自身的「聚焦即填现价」：真实行情下写死价格既会失真，
    // 也会被 v0.5.24 起的触价结算立刻平掉；数量按现价留足 10,000 模拟余额
    await inputs.nth(0).click()
    await inputs.nth(1).fill('0.05')
    // 填价后止盈/止损参考价行出现（表单有效时预览；开仓后表单清空会隐藏，须在开仓前断言）
    await expect(page.getByText('止盈线', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: '开仓' }).click()
    const posRow = page.getByTestId('position-row-short')
    await expect(posRow).toBeVisible()
    await expect(posRow).toContainText(/-?\d+(\.\d+)?/)
    // 平仓：行内现有 平仓/反手/止盈止损 三个按钮，按可及名称取「平仓」（作用域在行内，不会命中「全部平仓」）
    await posRow.getByRole('button', { name: '平仓 开空' }).click()
    await expect(page.getByRole('button', { name: '开仓' })).toBeVisible()
  })

  test('分享链接：URL 参数定位品种/周期 + 复制链接', async ({ page, context, browserName }) => {
    // webkit 的 grantPermissions 不支持 clipboard-write（报 Unknown permission）；
    // 应用侧复制有 execCommand 降级（toast 两端都出现），剪贴板回读断言仅 chromium（权限齐全）执行
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    await page.goto('/?perf=600&symbol=ETHUSDT&period=1h')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // URL 参数已定位品种
    await expect(page.getByText('ETH/USDT', { exact: false }).first()).toBeVisible()
    // 1时 周期处于选中态（accent 背景）
    const bg = await page
      .getByRole('button', { name: '1时' })
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(41, 98, 255)')
    // 复制分享链接 → 剪贴板含当前品种与周期
    await openMore(page)
    // 两个「分享」按钮（More 面板深链分享 + 图表截图分享），须按面板精确命中
    await page.getByTestId('desktop-more-panel').getByRole('button', { name: '分享', exact: true }).click()
    await expect(page.getByText('已复制')).toBeVisible({ timeout: 5000 })
    if (browserName === 'chromium') {
      const clip = await page.evaluate(() => navigator.clipboard.readText())
      expect(clip).toContain('symbol=ETHUSDT')
      expect(clip).toContain('period=1h')
    }
  })

  test('CSV 导出：一键下载含当前指标列的 K 线文件', async ({ page }) => {
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 默认主图 MA（5/10/20）+ 副图 VOL → 头部应为 time,open,high,low,close,volume,MA5,MA10,MA20
    await openMore(page)
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
    await page.goto('/?perf=600')
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

  test('键盘快捷键：⌘K 搜索 / 布局 1·2·3 / M 循环指标 / ? 帮助浮层 / F 全屏', async ({ page }) => {
    await page.goto('/?perf=600')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 主图/副图按钮已折叠进「更多」面板：提前展开，后续 M/N 循环与布局断言均可见
    await openMore(page)
    // Ctrl+K → 搜索下拉打开且输入框聚焦
    await page.keyboard.press('Control+k')
    await expect(page.getByPlaceholder('搜索交易对')).toBeVisible({ timeout: 5000 })
    await expect(page.getByPlaceholder('搜索交易对…')).toBeFocused()
    // 输入态按 M 不应切指标（主图仍 MA）
    await page.keyboard.type('m')
    const maBg = await page
      .getByRole('button', { name: 'MA', exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(maBg).toBe('rgb(41, 98, 255)')
    // Esc 关搜索：极低概率按键未送达聚焦输入框（快照示 input active 但浮层未关），
    // 用 toPass 重按直到关闭；搜索开着时 Esc 走输入框处理器，不会误伤 App 链路
    await expect(async () => {
      await page.keyboard.press('Escape')
      await expect(page.getByPlaceholder('搜索交易对')).toHaveCount(0, { timeout: 500 })
    }).toPass({ timeout: 10_000 })
    // 独立 / 也打开搜索
    await page.keyboard.press('/')
    await expect(page.getByPlaceholder('搜索交易对')).toBeVisible({ timeout: 5000 })
    await expect(async () => {
      await page.keyboard.press('Escape')
      await expect(page.getByPlaceholder('搜索交易对')).toHaveCount(0, { timeout: 500 })
    }).toPass({ timeout: 10_000 })
    // 布局 2/3/1（布局按钮在「更多」折叠内）
    await page.keyboard.press('2')
    await openMore(page)
    await expect(page.getByTestId('layout-toggle')).toHaveText('双图')
    await page.keyboard.press('3')
    await expect(page.getByTestId('layout-toggle')).toHaveText('四图')
    await page.keyboard.press('1')
    await expect(page.getByTestId('layout-toggle')).toHaveText('单图')
    // M 循环主图指标 MA → EMA
    await page.keyboard.press('m')
    await expect(page.getByRole('button', { name: 'EMA', exact: true })).toHaveCSS(
      'background-color',
      'rgb(41, 98, 255)',
    )
    // N 循环副图指标 VOL → MACD
    await page.keyboard.press('n')
    await expect(page.getByRole('button', { name: 'MACD', exact: true })).toHaveCSS(
      'background-color',
      'rgb(41, 98, 255)',
    )
    // ? → 帮助浮层；Esc 关闭（同样 toPass 重按防吞键）
    await page.keyboard.press('?')
    await expect(page.getByTestId('shortcuts-help')).toBeVisible()
    await expect(async () => {
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('shortcuts-help')).toHaveCount(0, { timeout: 500 })
    }).toPass({ timeout: 10_000 })
    // F → 进入全屏再退出
    await page.keyboard.press('f')
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement), { timeout: 5000 })
      .toBe(true)
    await page.keyboard.press('f')
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement), { timeout: 5000 })
      .toBe(false)
  })

  test('主题色预设：切换红涨绿跌 → CSS 变量/图表联动 + 持久化', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 默认 classic：--up 为 #26a69a
    const upBefore = await page.evaluate(() => document.documentElement.style.getPropertyValue('--up'))
    expect(upBefore).toBe('#26a69a')
    // 点击「红涨绿跌」预设（色盘在「更多」折叠内）
    await openMore(page)
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
    await page.goto('/?perf=600')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    // 打开交易对选择器（按钮文案 = 当前品种）
    await page.locator('button', { hasText: 'BTC/USDT' }).click()
    // 收藏第一行（BTCUSDT）的星标
    await page.getByRole('button', { name: '加入自选' }).first().click()
    // 自选区出现且星标变实心（可取消）
    await expect(page.getByTestId('market-tab-favorites')).toBeVisible()
    await expect(page.getByRole('button', { name: '取消自选' }).first()).toBeVisible()
    // 取消收藏 → 自选区消失
    await page.getByRole('button', { name: '取消自选' }).first().click()
    await expect(page.getByRole('button', { name: '取消自选' })).toHaveCount(0)
  })

test('画线：风险回报 R:R → 三点点击（A 入场 / B 止损 / C 止盈）→ 落库 3 锚点保序 → 像素校验三条蓝色水平线 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await openDrawing(page)
    await page.getByRole('button', { name: '风险回报' }).click()
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 三点点击：A（左中，入场）→ B（中下，止损）→ C（中上，止盈）
    await page.mouse.click(box!.x + box!.width * 0.3, box!.y + box!.height * 0.45)
    await page.mouse.click(box!.x + box!.width * 0.55, box!.y + box!.height * 0.65)
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.28)
    // 落库：type=rr，三点保留 A→B→C 原始点击顺序（方向敏感）
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'rr')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'rr')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(3)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：创建后处于选中态 → overlay 出现三条蓝色水平线（横贯全宽，蓝色像素列数 ≥80）
    const bluePixels = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return { n: 0, cols: 0 }
        const ctx = overlay.getContext('2d')
        if (!ctx) return { n: 0, cols: 0 }
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        const w = overlay.width
        const cols = new Set<number>()
        let n = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) {
            n++
            cols.add((i / 4) % w)
          }
        }
        return { n, cols: cols.size }
      })
    await expect.poll(async () => (await bluePixels()).n, { timeout: 10_000 }).toBeGreaterThan(200)
    await expect.poll(async () => (await bluePixels()).cols, { timeout: 10_000 }).toBeGreaterThanOrEqual(80)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'rr').length
            } catch {
              return -1
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(0)
  })

test('画线：平行射线 → 三点点击（A/B 方向 + C 起点）→ 落库 3 锚点保序 → 像素校验蓝色射线 → 删除', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    await openDrawing(page)
    await page.getByRole('button', { name: '平行射线' }).click()
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 三点点击：A（左中）→ B（右上）→ C（中下，射线起点）
    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.55)
    await page.mouse.click(box!.x + box!.width * 0.62, box!.y + box!.height * 0.3)
    await page.mouse.click(box!.x + box!.width * 0.4, box!.y + box!.height * 0.6)
    // 落库：type=parray，三点保留 A→B→C 原始点击顺序（方向敏感）
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              const arr = Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'parray')
              return arr.length
            } catch {
              return 0
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(1)
    const saved = await page.evaluate(() => {
      try {
        const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
        const arr = Object.values(d)
          .flat()
          .filter((x: unknown) => (x as { type?: string }).type === 'parray')
        return (arr[0] as { points: { time: number; price: number }[] }) ?? null
      } catch {
        return null
      }
    })
    expect(saved).not.toBeNull()
    expect(saved!.points).toHaveLength(3)
    // 点击 x 序：0.25 < 0.4 < 0.62 → 保序后 t0 < t2 < t1
    expect(saved!.points[0].time).toBeLessThan(saved!.points[2].time)
    expect(saved!.points[2].time).toBeLessThan(saved!.points[1].time)
    await expect(page.getByRole('button', { name: '删除' })).toBeVisible({ timeout: 5000 })

    // 像素：创建后处于选中态 → overlay 出现蓝色平行射线（C 起点向右上无限延伸）
    const bluePixels = () =>
      page.evaluate(() => {
        const overlay = [...document.querySelectorAll('canvas')].find((c) => {
          const st = getComputedStyle(c)
          return st.position === 'absolute' && st.zIndex === '5'
        })
        if (!overlay) return 0
        const ctx = overlay.getContext('2d')
        if (!ctx) return 0
        const img = ctx.getImageData(0, 0, overlay.width, overlay.height).data
        let n = 0
        for (let i = 0; i < img.length; i += 4) {
          const r = img[i]
          const g = img[i + 1]
          const b = img[i + 2]
          const a = img[i + 3]
          if (a > 60 && r < 130 && g > 110 && g < 200 && b > 190) n++
        }
        return n
      })
    await expect.poll(bluePixels, { timeout: 10_000 }).toBeGreaterThan(200)

    // 删除
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            try {
              const d = JSON.parse(localStorage.getItem('kline-buty:drawings') ?? '{}') as Record<string, unknown[]>
              return Object.values(d)
                .flat()
                .filter((x: unknown) => (x as { type?: string }).type === 'parray').length
            } catch {
              return -1
            }
          }),
        { timeout: 10_000 },
      )
      .toBe(0)
  })

  test('大数据量：?perf=20000 合成 2 万根 → 渲染 + 拖拽平移无异常（窗口裁剪）', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/?perf=20000')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
    await waitCandlesRendered(page)
    const chart = page.locator('main div').first()
    const box = await chart.boundingBox()
    expect(box).not.toBeNull()
    // 拖拽图表中心 → 平移：验证 2 万根窗口裁剪下滚动交互无异常
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.5, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    expect(errors).toHaveLength(0)
  })

  test('i18n：5 语循环切换（中/EN/日本語/한국어/ES）→ 界面文案切换并持久化', async ({ page }) => {
    await page.goto('/?perf=600')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('实时', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
    // 默认中文 → 点「中文」切英文（语言按钮在「更多」折叠内）
    await openMore(page)
    await page.getByRole('button', { name: '中文', exact: true }).click()
    await expect(page.getByText('Live', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Type', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fullscreen', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()
    // 语言持久化：刷新后仍为英文（折叠面板已复位 → 先展开）
    await page.reload()
    await expect(page.getByText('Live', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await openMore(page)
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()
    // EN → 日本語
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByText('リアルタイム', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('タイプ', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '日本語', exact: true })).toBeVisible()
    // 免责声明链路随语言切换：页脚、图表水印与导出角标同源
    const footer = page.getByTestId('disclaimer')
    const chartNote = page.getByTestId('chart-watermark')
    await expect(footer).toContainText('投資助言ではありません')
    await expect(chartNote).toContainText('1分')
    // 日本語 → 한국어
    await page.getByRole('button', { name: '日本語', exact: true }).click()
    await expect(page.getByText('실시간', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('유형', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '한국어', exact: true })).toBeVisible()
    // 刷新持久化：仍为韩语（折叠面板已复位 → 先展开）
    await page.reload()
    await expect(page.getByText('실시간', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await openMore(page)
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
    await page.goto('/?perf=600')
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
    // SAR：切换后不抛错（圆点走 marker 渲染路径；主图按钮在「更多」面板内）
    await openMore(page)
    await page.getByRole('button', { name: 'SAR', exact: true }).click()
    await page.waitForTimeout(1200)
    expect(errors).toHaveLength(0)
    // Ichimoku：云带填充（0.12 涨色叠深色底 ≈ 暗青 rgb(21,40,48)）+ 先行带 B 橙线 #f57f17
    await page.getByRole('button', { name: 'Ichimoku', exact: true }).click()
    await expect
      .poll(
        async () => {
          const v = await page.evaluate<{ cloud: number; orange: number }>(() => {
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
          })
          return v.cloud > 60 && v.orange > 40
        },
        { timeout: 15_000 },
      )
      .toBeTruthy()
    expect(errors).toHaveLength(0)
  })

  test('指标参数：RSI 改 7 即时生效 + 全指标切换无异常 + 参数持久化', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/?perf=600')
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
    // 打开 RSI 参数：默认 14 → 改为 7（RSI 与「参数」按钮都在更多折叠面板内）
    await openMore(page)
    await page.getByRole('button', { name: 'RSI', exact: true }).click()
    await page.getByRole('button', { name: '参数', exact: true }).click()
    await expect(page.getByText('RSI 周期', { exact: true })).toBeVisible()
    const rsiInput = page.locator('xpath=//span[text()="RSI 周期"]/following-sibling::input')
    await expect(rsiInput).toHaveValue('14')
    await rsiInput.fill('7')
    await page.getByRole('button', { name: '✕', exact: true }).click()
    // 参数浮层在顶栏之外：点 ✕ 时「点击外部收起」会把更多面板一起收起 → 重新展开再切全指标
    await openMore(page)
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
    // 切回 RSI：参数已持久化为 7（「参数」按钮在更多折叠面板内）
    await page.getByRole('button', { name: 'RSI', exact: true }).click()
    await openMore(page)
    await page.getByRole('button', { name: '参数', exact: true }).click()
    await expect(page.locator('xpath=//span[text()="RSI 周期"]/following-sibling::input')).toHaveValue('7')
    await page.getByRole('button', { name: '✕', exact: true }).click()
    expect(errors).toHaveLength(0)
  })

  test('价格坐标轴：线性/对数切换 → 渲染无异常 + 持久化', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/?perf=600')
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await waitCandlesRendered(page)
    // 缩放按钮在「更多」折叠内
    await openMore(page)
    const toggle = page.getByTestId('scale-toggle')
    await expect(toggle).toHaveText('线性')
    // 切到对数：按钮高亮 + 无异常；价格轴仍渲染数字刻度
    await toggle.click()
    await expect(toggle).toHaveText('对数')
    await page.waitForTimeout(800)
    await expect(page.locator('canvas').first()).toBeVisible()
    // 刷新持久化
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('实时', { exact: false })).toBeVisible({ timeout: 20_000 })
    await openMore(page)
    await expect(page.getByTestId('scale-toggle')).toHaveText('对数')
    expect(errors).toHaveLength(0)
  })

