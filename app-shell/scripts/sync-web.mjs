#!/usr/bin/env node
/**
 * 仓库内同步：根目录 dist/（Web 构建产物）→ app-shell/www/，供 Capacitor 打包。
 *
 * 用法：
 *   npm run web:sync                          # 拷贝（dist 缺失时报错并提示先构建）
 *   node scripts/sync-web.mjs --with-knowledge # 连同 dist/knowledge（约 60MB）一起打包
 *
 * 默认排除 dist/knowledge 保持包体轻量。注意：主应用的"知识库"入口是相对链接
 * /knowledge/，排除后该入口在 App 内 404，属已知项（方案文档风险表）。
 */
import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const withKnowledge = process.argv.includes('--with-knowledge')
// 相对脚本自身定位，任意目录执行都不漂移
const shellRoot = fileURLToPath(new URL('..', import.meta.url))
const distDir = resolve(shellRoot, '../dist')
const wwwDir = resolve(shellRoot, 'www')

if (!existsSync(resolve(distDir, 'index.html'))) {
  console.error(`[sync-web] ${distDir} 下没有 index.html；请先在仓库根执行 npm ci && npm run build。`)
  process.exit(1)
}

rmSync(wwwDir, { recursive: true, force: true })
cpSync(distDir, wwwDir, {
  recursive: true,
  filter: (src) => {
    if (!withKnowledge && src === resolve(distDir, 'knowledge')) return false
    return true
  },
})
console.log(`[sync-web] 已同步 ${distDir} -> ${wwwDir}${withKnowledge ? '（含离线知识库）' : '（已排除 knowledge/，--with-knowledge 可带上）'}`)
console.log('[sync-web] 下一步：npm run cap:sync 把 www/ 灌进原生工程。')
