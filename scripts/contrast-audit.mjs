// E12 颜色对比度审计（只读，不改任何颜色）：
// 解析 index.html 内联的四组主题变量（dark/light × 普通/高对比），
// 按 WCAG 2.1 计算关键前/背景对的对比比并输出 Markdown 表。
// 用法：node scripts/contrast-audit.mjs；结果供 docs/10 与产品决策参考，不作为 CI 门。
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''

/** 原始选择器 → 短名（:root 在解析时已映射为 dark） */
const SHORT = { "html[data-theme='light']": 'light', "html[data-hc][data-theme='dark']": 'hc-dark', "html[data-hc][data-theme='light']": 'hc-light' }
const THEMES = {}
const blockRe = /(^|\n)\s*(html\[data-hc\]\[data-theme='light'\]|html\[data-hc\]\[data-theme='dark'\]|html\[data-theme='light'\]|:root)\s*\{([^}]*)\}/g
for (const m of style.matchAll(blockRe)) {
  const sel = m[2] === ':root' ? 'dark' : m[2]
  const vars = {}
  for (const vm of m[3].matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[vm[1]] = vm[2].trim()
  THEMES[SHORT[sel] ?? sel] = vars
}
if (Object.keys(THEMES).length < 4) {
  console.error('解析 index.html 主题块失败：', Object.keys(THEMES))
  process.exit(1)
}

// F7 高对比模式的强调/涨跌色由 applyTheme 运行时内联（theme.ts HIGH_CONTRAST_COLORS），脚本保持同源
const HC_COLORS = {
  'hc-dark': { accent: '#4d8dff', up: '#2ee6d6', down: '#ff6b6b', yellow: '#ffd54f' },
  'hc-light': { accent: '#1a4fd8', up: '#008f7a', down: '#d32f2f', yellow: '#8a6d00' },
}
for (const name of Object.keys(THEMES)) {
  if (HC_COLORS[name]) THEMES[name] = { ...THEMES.dark, ...THEMES[name], ...HC_COLORS[name] }
}

/** #rgb/#rrggbb → [r,g,b]；rgba() 与背景合成（不透明近似，α 直接并入前景亮度按合成色算） */
function parseColor(raw, bgHex) {
  raw = raw.trim()
  if (raw.startsWith('#')) {
    const h = raw.slice(1)
    const f = h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)]
    return f.map((x) => parseInt(x, 16))
  }
  const rgba = raw.match(/rgba?\(([^)]+)\)/)
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((s) => parseFloat(s.trim()))
    const bg = bgHex ? hexRgb(bgHex) : [255, 255, 255]
    // 与面板底色合成后取整（半透明色叠加在实底上）
    return [
      Math.round(r * a + bg[0] * (1 - a)),
      Math.round(g * a + bg[1] * (1 - a)),
      Math.round(b * a + bg[2] * (1 - a)),
    ]
  }
  return null
}
function hexRgb(hex) {
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)]
  return f.map((x) => parseInt(x, 16))
}
function luminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}
function contrast(fg, bg) {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/** 审计对：[前景变量, 背景变量, 用途, WCAG 门槛] */
const PAIRS = [
  ['text', 'bg', '正文 / 背景', 4.5],
  ['text', 'panel', '正文 / 面板', 4.5],
  ['text-dim', 'bg', '次级文本 / 背景', 4.5],
  ['text-dim', 'panel', '次级文本 / 面板', 4.5],
  ['text-faint', 'bg', '弱文本（轴外注/占位）/ 背景', 4.5],
  ['text-faint', 'panel', '弱文本 / 面板', 4.5],
  ['accent', 'panel', '强调（选中态）/ 面板', 3],
  ['up', 'panel', '涨色 / 面板（图形对象）', 3],
  ['down', 'panel', '跌色 / 面板（图形对象）', 3],
  ['yellow', 'panel', '黄标 / 面板（图形对象）', 3],
]

const rows = []
for (const themeSel of Object.keys(THEMES)) {
  const v = THEMES[themeSel]
  const name = themeSel
  const panel = parseColor(v.panel)
  const bg = parseColor(v.bg)
  for (const [fgVar, bgVar, usage, min] of PAIRS) {
    const bgHex = bgVar === 'panel' ? v.panel : v.bg
    const fg = parseColor(v[fgVar], bgHex)
    const bgc = bgVar === 'panel' ? panel : bg
    if (!fg || !bgc) {
      rows.push({ name, pair: `${fgVar}/${bgVar}`, usage, ratio: '解析失败', min, pass: '?' })
      continue
    }
    const r = contrast(fg, bgc)
    rows.push({ name, pair: `${fgVar}/${bgVar}`, usage, ratio: r.toFixed(2), min, pass: r >= min ? '✅' : '❌' })
  }
}

console.log('| 主题 | 对 | 用途 | 对比比 | WCAG 门槛 | 达标 |')
console.log('|---|---|---|---|---|---|')
for (const r of rows) console.log(`| ${r.name} | ${r.pair} | ${r.usage} | ${r.ratio}:1 | ${r.min}:1 | ${r.pass} |`)
const fails = rows.filter((r) => r.pass === '❌')
console.log(`\n未达标 ${fails.length}/${rows.length} 对`)
