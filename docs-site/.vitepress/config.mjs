import { defineConfig } from 'vitepress'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 自定义 slugify：移除「」、空格→连字符、小写，保持中文不变 */
function slugify(str) {
  return str
    .replace(/[「」『』【】]/g, '')
    .replace(/[·]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9一-鿿㐀-䶿_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

const SITE_ROOT = fileURLToPath(new URL('..', import.meta.url)) // docs-site/
const DOCS = join(SITE_ROOT, 'docs')
const DOCS_ZH = join(DOCS, 'zh')

// Pages 部署在 /kline-buty/knowledge/，Vercel / Docker / 本地默认 /knowledge/
const BASE = process.env.DOCS_BASE_PATH || '/knowledge/'

/** 章节顺序的唯一定义（无数字前缀，顺序由本数组决定） */
const CHAPTER_ORDER = [
  'getting-started',
  'spot',
  'futures',
  'stocks',
  'crypto-perpetuals',
  'technical-analysis',
  'trading-system',
  'pitfalls',
  'markets-instruments',
  'system-integration',
  'trading-practice',
  'market-ecosystem',
  'financial-history',
  'wealth-allocation',
  'quant-practice',
  'regulation-compliance',
  'tools-platforms',
  'financial-statements',
  'industry-research',
  'reading-list',
  'behavioral-finance',
  'bonds-rates',
  'forex-trading',
  'career',
  'global-markets',
  'data-interpretation',
  'options-strategies',
]

function firstHeading(file) {
  try {
    const m = readFileSync(file, 'utf8').match(/^#\s+(.+)$/m)
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

function firstQuote(file) {
  try {
    const m = readFileSync(file, 'utf8').match(/^>\s*(.+)$/m)
    if (!m) return null
    const t = m[1].trim()
    return t === '**免责声明**' || t.startsWith('**免责声明**') ? null : t
  } catch {
    return null
  }
}

/** 从标题提取序号（"03 · K 线与图表入门" → "03"） */
function docNo(title) {
  const m = String(title).match(/^(\d{2})\s*[·.．]\s*/)
  return m ? m[1] : null
}

/** 按标题「NN ·」序号排序章节文档；无编号的退回文件名序 */
function sortByDocNo(chDir) {
  return (a, b) => {
    const na = Number(docNo(firstHeading(join(chDir, a)) ?? ''))
    const nb = Number(docNo(firstHeading(join(chDir, b)) ?? ''))
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
    return a.localeCompare(b)
  }
}

/** 按固定顺序列出某语言树下实际存在的章节目录 */
function chaptersUnder(dir) {
  if (!existsSync(dir)) return []
  const present = new Set(
    readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()),
  )
  return CHAPTER_ORDER.filter((c) => present.has(c))
}

/**
 * 章节文档索引（供 DocCards 组件渲染卡片导航）：
 * en: { [chapter]: [{no,title,desc,link}] }（link 前缀 /）
 * zh: 键为 `zh/<chapter>`（link 前缀 /zh/）
 */
function docIndex() {
  const build = (dir, prefix, keyPrefix = '') =>
    chaptersUnder(dir).reduce((acc, folder) => {
      const chDir = join(dir, folder)
      acc[`${keyPrefix}${folder}`] = readdirSync(chDir)
        .filter((f) => f.endsWith('.md') && f !== 'index.md')
        .sort(sortByDocNo(chDir))
        .map((f) => {
          const title = firstHeading(join(chDir, f)) ?? f.replace(/\.md$/, '')
          return {
            no: docNo(title),
            title,
            desc: firstQuote(join(chDir, f)),
            link: `${prefix}/${folder}/${f.replace(/\.md$/, '')}`,
          }
        })
      return acc
    }, {})
  return { ...build(DOCS, ''), ...build(DOCS_ZH, '/zh', 'zh/') }
}

/** 动态生成侧边栏：每章 = 章节概览 + 各正文文档 */
function sidebarFor(dir, prefix, overviewText) {
  return chaptersUnder(dir).map((folder) => {
    const chDir = join(dir, folder)
    const files = readdirSync(chDir)
      .filter((f) => f.endsWith('.md') && f !== 'index.md')
      .sort(sortByDocNo(chDir))
    const items = [
      { text: overviewText, link: `${prefix}/${folder}/` },
      ...files.map((f) => ({
        text: firstHeading(join(chDir, f)) ?? f.replace(/\.md$/, ''),
        link: `${prefix}/${folder}/${f.replace(/\.md$/, '')}`,
      })),
    ]
    return {
      text: firstHeading(join(chDir, 'index.md')) ?? folder,
      collapsed: false,
      items,
    }
  })
}

const enSidebar = [
  {
    text: 'Trading Knowledge Base',
    items: [
      { text: '🏠 Home', link: '/' },
      { text: '🧭 Role-based Paths', link: '/#role-based-paths' },
      { text: '🗺️ Learning Roadmap', link: '/#learning-roadmap' },
    ],
  },
  ...sidebarFor(DOCS, '', 'Chapter Overview'),
]

const zhSidebar = [
  {
    text: '交易知识库 · 从入门到入土',
    items: [
      { text: '🏠 知识库首页', link: '/zh/' },
      { text: '🧭 快速导航', link: '/zh/#按读者角色快速导航' },
      { text: '🗺️ 学习路线图', link: '/zh/#学习路线图' },
    ],
  },
  ...sidebarFor(DOCS_ZH, '/zh', '章节概览'),
]

export default defineConfig({
  srcDir: 'docs',
  title: 'Trading Knowledge Base',
  description:
    'Spot, futures, stocks, crypto perpetuals, options, forex, macro, quant and regulation — a systematic trading knowledge base by Kline Buty.',
  base: BASE,
  lastUpdated: true,
  cleanUrls: false,
  ignoreDeadLinks: true,
  markdown: {
    anchor: { slugify },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#2962ff' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}icon.svg` }],
  ],
  locales: {
    root: { label: 'English', lang: 'en-US' },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: '交易知识库',
      description:
        'Kline Buty 交易知识库：现货/期货/股票/加密/外汇/期权/宏观/量化/监管——从入门到入土',
      themeConfig: {
        nav: [
          { text: '知识库首页', link: '/zh/' },
          { text: '快速开始', link: '/zh/getting-started/' },
          { text: '行情应用', link: 'https://kline-buty.vercel.app/' },
        ],
        outline: { level: [2, 3], label: '本页目录' },
        docFooter: { prev: '上一篇', next: '下一篇' },
        lastUpdated: { text: '最后更新', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
        footer: {
          message: '仅供学习与研究，不构成任何投资建议。市场有风险，投资需谨慎。',
          copyright: 'Kline Buty · 交易知识库',
        },
      },
    },
  },
  themeConfig: {
    logo: `${BASE}icon.svg`,
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'Live Charts', link: 'https://kline-buty.vercel.app/' },
    ],
    sidebar: {
      '/': enSidebar,
      '/zh/': zhSidebar,
    },
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous', next: 'Next' },
    lastUpdated: { text: 'Last updated', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Search', buttonAriaLabel: 'Search' },
          modal: {
            noResultsText: 'No results',
            resetButtonTitle: 'Reset query',
            footer: { selectText: 'Select', navigateText: 'Switch', closeText: 'Close' },
          },
        },
      },
    },
    footer: {
      message: 'For study and research only — not investment advice. Markets are risky.',
      copyright: 'Kline Buty · Trading Knowledge Base',
    },
  },
  // 每页注入章节文档索引，供 DocCards 组件渲染章节卡片导航
  transformHead() {
    const idx = JSON.stringify(docIndex()).replace(/</g, '\\u003c')
    return [['script', { id: 'kb-doc-index-data', type: 'application/json' }, idx]]
  },
})
