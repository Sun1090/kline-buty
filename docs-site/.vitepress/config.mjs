import { defineConfig } from 'vitepress'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 自定义 slugify：移除「」、空格→连字符、小写，保持中文不变 */
function slugify(str) {
  return str
    .replace(/[「」『』【】]/g, '')  // 移除中文引号/括号
    .replace(/[·]/g, '-')             // 中点 → 连字符
    .replace(/\s+/g, '-')             // 空白 → 连字符
    .replace(/[^a-zA-Z0-9一-鿿㐀-䶿_-]/g, '') // 只留字母数字中文下划线连字符
    .replace(/-+/g, '-')              // 合并连续连字符
    .replace(/^-|-$/g, '')            // 去掉首尾连字符
    .toLowerCase()
}

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

/** 动态生成侧边栏：每章 = 章节概览 + 各正文文档，避免重复入口 */
function sidebarKnowledge() {
  return chapters().map((folder) => {
    const dir = join(DOCS, folder)
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'index.md')
      .sort()
    const items = [
      { text: '章节概览', link: `/${folder}/` },
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
  cleanUrls: false,
  ignoreDeadLinks: true,
  // 自定义锚点生成，移除非 ASCII 符号确保 URL 片段兼容
  markdown: {
    anchor: {
      slugify,
    },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#2962ff' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}icon.svg` }],
  ],
  themeConfig: {
    logo: `${BASE}icon.svg`,
    nav: [
      { text: '知识库首页', link: '/' },
      { text: '行情应用', link: 'https://kline-buty.vercel.app/' },
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
