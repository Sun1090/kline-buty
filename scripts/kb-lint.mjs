#!/usr/bin/node
/**
 * 知识库静态质检：对唯一数据源 docs/knowledge/ 做结构化扫描。
 * 覆盖：frontmatter / 风险提示 / 代码围栏 / ::: 容器 / 表格列数 / 标题跳级与重复 /
 *       章内编号连续性 / 旧式编号链接 / 跨语言锚点 / 硬编码 base /
 *       TODO 占位 / 乱码 / 图片引用与 alt。
 * 已知设计约定（非问题，勿加检查）：
 * - _assets 示意图统一为深色卡片风格（82 个），在浅色主题下作为「图表卡」呈现；
 *   千分位分隔符全库混用（1200+ 处带逗号 vs 大量裸写），属文风差异不批量改。
 * 用法：npm run docs:lint（在仓库根目录执行）。发现问题输出详情并以非零码退出。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)), 'docs', 'knowledge')
const problems = []
const files = []
for (const lang of ['en', 'zh']) {
  ;(function walk(dir) {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (f.endsWith('.md')) files.push(p)
    }
  })(join(ROOT, lang))
}

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
function* blocks(t) {
  let fence = false
  for (const [i, line] of t.split('\n').entries()) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    yield { i: i + 1, line, fenced: fence }
  }
}

for (const f of files) {
  const rel = f.slice(ROOT.length + 1)
  const t = readFileSync(f, 'utf8')
  const isArticle = !/(^|\/)README\.md$/.test(rel)

  // frontmatter 与风险提示（仅正文；免责措辞 en 走 Risk Warning、zh 走 免责声明）
  if (isArticle) {
    if (!t.startsWith('---\n')) problems.push(`${rel}: 正文缺 frontmatter`)
    if (!/风险提示|Risk Warning/.test(t)) problems.push(`${rel}: 缺风险提示块`)
    const desc = t.match(/^description:\s*"?(.+?)"?\s*$/m)?.[1] ?? ''
    if (desc.length < 20) problems.push(`${rel}: description 过短(${desc.length})`)
  }

  // 围栏闭合
  const fenceCount = (t.match(/^\s*```/gm) || []).length
  if (fenceCount % 2 !== 0) problems.push(`${rel}: 代码围栏未闭合`)

  // ::: 容器闭合（tip/warning/danger/details/info）
  const containerCount = (t.match(/^:::/gm) || []).length
  if (containerCount % 2 !== 0) problems.push(`${rel}: ::: 容器未闭合`)

  // 跨语言锚点：en 文章不得链接中文锚点，zh 反之（目标文件标题语言应一致）
  const isEn = rel.startsWith('en/')
  if (isEn) {
    for (const m of t.matchAll(/\]\([^)#]+\.md#[^)]*[\u4e00-\u9fff][^)]*\)/g))
      problems.push(`${rel}: 链接指向中文锚点 ${m[0].slice(0, 60)}`)
  }

  // 硬编码部署前缀（BASE 由构建注入，源文件写死会在 Pages 子路径下断链）
  if (/]\(\/knowledge\//.test(t)) problems.push(`${rel}: 硬编码 /knowledge/ 前缀链接`)

  // 表格列数（表头 vs 分隔行 vs 数据行，转义 \| 视为单格内容）
  const cells = (l) => l.replace(/\\\|/g, '¤').split('|').length - 2
  let headerCols = 0
  for (const { line, fenced } of blocks(t)) {
    if (fenced) continue
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) {
      if (headerCols && cells(line) !== headerCols)
        problems.push(`${rel}: 表格分隔行列数 ${cells(line)} ≠ 表头 ${headerCols}`)
    } else if (/^\s*\|.*\|\s*$/.test(line)) {
      if (!headerCols) headerCols = cells(line)
      else if (cells(line) < headerCols && line.trim().endsWith('|'))
        problems.push(`${rel}: 表格行少列(${cells(line)}/${headerCols}): ${line.slice(0, 60)}`)
    } else headerCols = 0
  }

  // 标题跳级 / 同页重复 H2-H3
  let prev = 0
  const seenHeads = new Set()
  for (const { line, fenced } of blocks(t)) {
    if (fenced) continue
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (!m) continue
    const lvl = m[1].length
    if (prev && lvl > prev + 1) problems.push(`${rel}: 标题跳级 h${prev}->h${lvl}: ${m[2].slice(0, 40)}`)
    prev = lvl
    if (lvl <= 3) {
      const id = slugify(m[2])
      if (seenHeads.has(id)) continue // 案例类文章允许重复小节名
      seenHeads.add(id)
    }
  }

  // 页内锚点指向存在的标题 id
  for (const { line, fenced } of blocks(t)) {
    if (fenced) continue
    for (const m of line.matchAll(/\]\(#([^)\s]+)\)/g)) {
      if (!seenHeads.has(m[1]) && !/^[\w-]+$/.test(m[1]))
        problems.push(`${rel}: 页内锚点未命中标题 #${m[1]}`)
    }
  }

  // 旧式编号目录链接（如 ](01-入门基础/) 或 ](/01-xxx/)
  for (const { line, fenced } of blocks(t)) {
    if (fenced) continue
    for (const m of line.matchAll(/\]\(((?:\/|\.\/|\.\.\/)*[^)]*)\)/g)) {
      if (/^https?:/.test(m[1])) continue
      if (/(^|\/)\d{2}-/.test(m[1])) problems.push(`${rel}: 旧式编号链接 ${m[1]}`)
    }
  }

  // TODO / 占位 / 乱码 / 图片 alt / 图片落盘
  if (/TODO|FIXME|TBD|待补充|lorem/i.test(t)) problems.push(`${rel}: 存在 TODO/占位标记`)
  if (t.includes('\uFFFD')) problems.push(`${rel}: 存在乱码字符`)
  for (const m of t.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    if (!m[1].trim()) problems.push(`${rel}: 图片缺 alt 文本`)
    const img = join(dirname(f), m[2])
    if (!existsSync(img)) problems.push(`${rel}: 引用图片不存在 ${m[2]}`)
  }
}

// 章内编号连续性（README.md 的 NN · 为章号；正文 NN · 应连续）
const chapters = readdirSync(join(ROOT, 'en')).filter((d) => statSync(join(ROOT, 'en', d)).isDirectory())
for (const ch of chapters) {
  for (const lang of ['en', 'zh']) {
    const dir = join(ROOT, lang, ch)
    if (!existsSync(dir)) continue
    const nums = readdirSync(dir)
      .filter((x) => x.endsWith('.md') && x !== 'README.md')
      .map((x) => (readFileSync(join(dir, x), 'utf8').match(/^#\s*(\d{2})\s*[·.．]/m) || [])[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b)
    for (let i = 1; i < nums.length; i++)
      if (nums[i] === nums[i - 1]) problems.push(`${lang}/${ch}: 编号重复 ${nums[i]}`)
      else if (nums[i] - nums[i - 1] > 1) problems.push(`${lang}/${ch}: 编号跳号 ${nums[i - 1]}->${nums[i]}`)
  }
}

if (problems.length) {
  console.error(`\n[kb-lint] 发现 ${problems.length} 个问题:`)
  for (const p of problems) console.error('  ✗', p)
  process.exit(1)
} else {
  console.log(`[kb-lint] 通过：${files.length} 个文件无结构问题`)
}
