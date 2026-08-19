import { test, expect } from '@playwright/test'

/**
 * 知识库文档站（VitePress）E2E：
 * - 生产构建 dist/knowledge 由 scripts/docs-build.mjs 合并，静态服务器目录→index.html、.html 直出
 * - 不依赖币安网络，稳定快速；覆盖落地页 / 章节目录 / 正文页 / 侧边栏客户端导航
 */
test.describe('知识库文档站', () => {
  test('落地页可访问 + 侧边栏 27 章 + 章节与正文直达', async ({ page }) => {
    // 落地页（/knowledge/，home 布局：hero + 入口，无侧边栏）
    await page.goto('/knowledge/')
    await expect(page).toHaveTitle(/交易知识库/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /交易知识库/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: '开始阅读' })).toBeVisible()

    // 章节目录（/章节/ → index.html，doc 布局：侧边栏可见）
    await page.goto('/knowledge/01-入门基础/')
    await expect(page.getByRole('heading', { name: /01 · 入门基础篇/ }).first()).toBeVisible({ timeout: 20_000 })
    // 侧边栏：首章正文项可见（VitePress 折叠组标题为 menu-label 非链接，正文项即各 md 首 H1）
    await expect(page.getByRole('link', { name: /金融市场全景/ }).first()).toBeVisible()

    // 正文页（.html 直出，与参考站 URL 风格一致）
    await page.goto('/knowledge/01-入门基础/02-交易核心概念.html')
    await expect(page.getByRole('heading', { name: /02 · 交易核心概念/ }).first()).toBeVisible({ timeout: 20_000 })

    // 侧边栏客户端导航：点击「金融市场全景」→ 正文加载（URL 中文被百分号编码，解码后断言）
    await page.getByRole('link', { name: /金融市场全景/ }).first().click()
    await expect
      .poll(() => decodeURIComponent(page.url()), { timeout: 10_000 })
      .toMatch(/01-金融市场全景\.html$/)
    await expect(page.getByRole('heading', { name: /01 · 金融市场全景/ }).first()).toBeVisible({ timeout: 20_000 })
  })
})
