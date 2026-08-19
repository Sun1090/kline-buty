import { defineConfig } from 'vitepress'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE_ROOT = fileURLToPath(new URL('..', import.meta.url)) // docs-site/
// 篇章目录直接位于 srcDir（docs-site/docs/）根，由 scripts/docs-prepare.mjs 同步
const DOCS = join(SITE_ROOT, 'docs')

// Pages 部署在 /kline-buty/knowledge/，Vercel / Docker / 本地默认 /knowledge/
const BASE = process.env.DOCS_BASE_PATH || '/knowledge/'

/** 读取 md 首个 # 标题作为文档名；读不到则退回文件名 */
function firstHeading(file) {
  try {
    const m = readFileSync(file, 'utf8').match(/^#\s+(.+)$/m)
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

/** 按数字前缀排序的篇章目录（27 章） */
function chapters() {
  if (!existsSync(DOCS)) return []
  return readdirSync(DOCS)
    .filter((d) => /^\d{2}-/.test(d) && statSync(join(DOCS, d)).isDirectory())
    .sort()
}

/** 动态生成侧边栏：每章 = 折叠组（篇内导航 + 各正文文档） */
function sidebarKnowledge() {
  return chapters().map((folder) => {
    const dir = join(DOCS, folder)
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort()
    const items = [
      { text: '篇内导航', link: `/${folder}/` },
      ...files.map((f) => ({
        text: firstHeading(join(dir, f)) ?? f.replace(/\.md$/, ''),
        link: `/${folder}/${f.replace(/\.md$/, '')}`,
      })),
    ]
    return {
      text: firstHeading(join(dir, 'README.md')) ?? folder,
      collapsed: false,
      items,
    }
  })
}

export default defineConfig({
  srcDir: 'docs', // 源码目录：docs-site/docs/（含落地页 index.md 与同步来的篇章目录）
  lang: 'zh-CN',
  title: '交易知识库',
  description: 'Kline Buty 交易知识库：现货/期货/股票/加密/外汇/期权/宏观/量化/监管——从入门到入土',
  base: BASE,
  lastUpdated: true,
  // 与参考站（docs.soybeanjs.cn/zh/guide/router/intro.html）一致：保留 .html 干净直链，
  // 任何静态托管（GitHub Pages / Vercel / serve）都可直接命中，无需 URL 重写。
  cleanUrls: false,
  // 知识库大量「章节目录/」链接指向 README.md 目录索引（GitHub 与本站均正确解析），
  // VitePress 死链检查只认 index.md 会误报，此处关闭该检查（链接在运行时均有效）。
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#2962ff' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}icon.svg` }],
  ],
  themeConfig: {
    logo: `${BASE}icon.svg`,
    nav: [
      { text: '知识库首页', link: '/' },
      { text: '行情应用', link: '../' },
    ],
    sidebar: {
      '/': [
        {
          text: '交易知识库 · 从入门到入土',
          items: [
            { text: '🏠 知识库首页', link: '/' },
            { text: '🧭 快速导航', link: '/#按读者角色快速导航' },
            { text: '🗺️ 学习路线图', link: '/#学习路线图' },
          ],
        },
        ...sidebarKnowledge(),
      ],
    },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '未找到相关结果',
            resetButtonTitle: '清除查询',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },
    footer: {
      message: '仅供学习与研究，不构成任何投资建议。市场有风险，投资需谨慎。',
      copyright: 'Kline Buty · 交易知识库',
    },
  },
})
