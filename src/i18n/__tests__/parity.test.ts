import { describe, expect, it } from 'vitest'
import { zh, en, ja, ko, es } from '../messages'

type Obj = Record<string, unknown>

function flatKeys(o: Obj, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(o)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatKeys(v as Obj, path))
    else out.push(path)
  }
  return out
}

function flatValues(o: Obj, prefix = ''): [string, string][] {
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(o)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatValues(v as Obj, path))
    else out.push([path, String(v)])
  }
  return out
}

/** 各语言专有标题字段（如 titleJa 本就应保留日文），跳过中文残留/漏译检查 */
const SKIP = new Set(['app.titleZh', 'app.titleJa'])

describe('i18n 五语巡检（运行时守护，防止 TS 类型之外的结构漂移）', () => {
  const all = { 'zh-CN': zh, en, ja, ko, es } as Record<string, Obj>
  const zhKeys = flatKeys(zh).sort()

  it('五语键集与 zh 完全一致', () => {
    for (const [lang, msgs] of Object.entries(all)) {
      expect(flatKeys(msgs).sort(), lang).toEqual(zhKeys)
      expect(flatKeys(msgs).length, lang).toBe(zhKeys.length)
    }
  })

  it('en/es 无中文残留（专有名词白名单除外）', () => {
    // 品牌/专有名词允许保留原样
    const allow = ['XABCD', 'OKX', '币安', 'K 线', 'TradingView', 'PWA', 'A股', 'BTC', 'ETH', 'WebSocket']
    for (const lang of ['en', 'es'] as const) {
      const bad = flatValues(all[lang]).filter(
        ([p, v]) => !SKIP.has(p) && /[\u4e00-\u9fff]/.test(v) && !allow.some((a) => v.includes(a)),
      )
      expect(bad, `${lang} 中文残留 ${bad.length}`).toEqual([])
    }
  })

  it('ja/ko 无简体中文典型词（避免繁体/日文汉字误报，只查简体特征词）', () => {
    // 简体字（日本/韩国汉字无对应字形）的典型词
    const simpWords = ['现在', '我们', '这里', '什么', '怎么', '设置', '搜索', '提醒', '持仓', '自选', '画线', '实时行情', '交易对', '涨跌幅']
    for (const lang of ['ja', 'ko'] as const) {
      const bad = flatValues(all[lang]).filter(([p, v]) => !SKIP.has(p) && simpWords.some((w) => v.includes(w)))
      expect(bad, `${lang} 简体中文残留 ${bad.length}`).toEqual([])
    }
  })

  it('拉丁语系（en/es）无与 zh 完全相同的值（防复制粘贴漏译；ja/ko 与 zh 共用汉字属正常）', () => {
    const zhV = new Map(flatValues(zh))
    for (const lang of ['en', 'es'] as const) {
      const same = flatValues(all[lang]).filter(([p, v]) => {
        const zhVal = zhV.get(p) ?? ''
        // 仅当 zh 值含中文（应被翻译）才视为疑似漏译；指标缩写/专有标题等语言中性值跳过
        return !SKIP.has(p) && /[\u4e00-\u9fff]/.test(zhVal) && v === zhVal && v.length > 1
      })
      expect(same, `${lang} 疑似漏译 ${same.length}`).toEqual([])
    }
  })
})
