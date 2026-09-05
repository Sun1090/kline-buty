#!/usr/bin/env node
/**
 * N12 构建体积报告：扫描 dist/assets 统计各产物体积（按 chunk 名、总大小、gzip 估算），
 * 输出可读表格；供 O6 体积优化与 CI 观测。
 *
 * 用法：npm run bundle:report
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = 'dist/assets'
const WIDTH = 10

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function pad(s, n = WIDTH) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function main() {
  let files
  try {
    files = readdirSync(DIST).filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  } catch {
    console.error(`[bundle-report] dist 目录不存在（先运行 npm run build）`)
    process.exit(1)
  }

  const rows = files.map((f) => {
    const raw = readFileSync(join(DIST, f))
    const gz = gzipSync(raw).length
    return { f, raw: raw.length, gz }
  })

  rows.sort((a, b) => b.raw - a.raw)
  const totalRaw = rows.reduce((s, r) => s + r.raw, 0)
  const totalGz = rows.reduce((s, r) => s + r.gz, 0)

  console.log(`\n业务包体积报告（dist/assets，共 ${rows.length} 个产物）`)
  console.log('-'.repeat(72))
  console.log(`${pad('产物')}${pad('原始')}${pad('gzip')}${pad('占比')}`)
  console.log('-'.repeat(72))
  for (const r of rows) {
    const pct = totalRaw ? ((r.raw / totalRaw) * 100).toFixed(1) : '0'
    console.log(`${pad(r.f, 44)}${pad(human(r.raw))}${pad(human(r.gz))}${pad(pct + '%')}`)
  }
  console.log('-'.repeat(72))
  console.log(`合计：${human(totalRaw)}（gzip ${human(totalGz)}）`)

  // 大 chunk 告警（>500KB 未压缩，配合 vite chunkSizeWarningLimit）
  const big = rows.filter((r) => r.raw > 500 * 1024)
  if (big.length) {
    console.log(`\n⚠ 大体积产物（>500KB）：${big.map((r) => r.f).join('、')}——可配合 O6 拆分`)
  }
  console.log('')
}

main()