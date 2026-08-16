// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { zh, en, ja, ko, es, localeFor, chartLabelsFor, titleFor, type Lang, type MessageKey } from '../messages'
import { I18nProvider, useI18n, DEFAULT_LANG, translate, makeT } from '../index'
import type { ReactNode } from 'react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('字典完整性', () => {
  it('en/ja/ko/es 与 zh 键完全一致（结构对齐，5 语）', () => {
    const collect = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'string' ? [prefix ? `${prefix}.${k}` : k] : collect(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k),
      )
    const zhKeys = collect(zh as unknown as Record<string, unknown>).sort()
    for (const dict of [en, ja, ko, es]) {
      expect(collect(dict as unknown as Record<string, unknown>).sort()).toEqual(zhKeys)
    }
  })

  it('5 语字典叶子数量一致（>100 键）', () => {
    const leafCount = (obj: Record<string, unknown>): number =>
      Object.values(obj).reduce<number>((n, v) => n + (typeof v === 'string' ? 1 : leafCount(v as Record<string, unknown>)), 0)
    for (const dict of [zh, en, ja, ko, es]) {
      expect(leafCount(dict as unknown as Record<string, unknown>)).toBeGreaterThan(100)
    }
    const base = leafCount(zh as unknown as Record<string, unknown>)
    for (const dict of [en, ja, ko, es]) {
      expect(leafCount(dict as unknown as Record<string, unknown>)).toBe(base)
    }
  })

  it('插值：替换 {param} 占位符', () => {
    expect(translate(zh, 'symbol.searchResults', { count: 3 })).toBe('搜索结果 3')
    expect(translate(en, 'symbol.searchResults', { count: 3 })).toBe('Results 3')
  })

  it('未知键/非字符串叶子回退为键本身', () => {
    expect(translate(zh, 'not.exists')).toBe('not.exists')
    expect(translate(zh, 'common')).toBe('common')
  })

  it('localeFor 映射（5 语）', () => {
    expect(localeFor('zh-CN')).toBe('zh-CN')
    expect(localeFor('en')).toBe('en-US')
    expect(localeFor('ja')).toBe('ja-JP')
    expect(localeFor('ko')).toBe('ko-KR')
    expect(localeFor('es')).toBe('es-ES')
  })

  it('图表渲染层标签：文本标注默认文案 + 仓位线标签', () => {
    expect(translate(zh, 'drawing.defaultText')).toBe('文本')
    expect(translate(en, 'drawing.defaultText')).toBe('Text')
    expect(translate(zh, 'position.lineEntry')).toBe('开仓')
    expect(translate(zh, 'position.lineTp')).toBe('止盈')
    expect(translate(zh, 'position.lineSl')).toBe('止损')
    expect(translate(en, 'position.lineEntry')).toBe('Entry')
    expect(translate(en, 'position.lineTp')).toBe('TP')
    expect(translate(en, 'position.lineSl')).toBe('SL')
  })

  it('chartLabelsFor 按语言取 adapter 标签（无硬编码）', () => {
    expect(chartLabelsFor('zh-CN')).toEqual({ defaultText: '文本', entry: '开仓', tp: '止盈', sl: '止损' })
    expect(chartLabelsFor('en')).toEqual({ defaultText: 'Text', entry: 'Entry', tp: 'TP', sl: 'SL' })
    expect(chartLabelsFor('ja')).toEqual({ defaultText: 'テキスト', entry: 'エントリー', tp: '利確 (TP)', sl: '損切り (SL)' })
    expect(chartLabelsFor('ko')).toEqual({ defaultText: '텍스트', entry: '진입', tp: '익절 (TP)', sl: '손절 (SL)' })
    expect(chartLabelsFor('es')).toEqual({ defaultText: 'Texto', entry: 'Entrada', tp: 'TP', sl: 'SL' })
  })

  it('titleFor 按语言取页面标题', () => {
    expect(titleFor('zh-CN')).toBe('Kline Buty · 实时 K 线')
    expect(titleFor('en')).toBe('Kline Buty · Live Candles')
    expect(titleFor('ja')).toBe('Kline Buty · リアルタイム K 線')
    expect(titleFor('ko')).toBe('Kline Buty · 실시간 K 라인')
    expect(titleFor('es')).toBe('Kline Buty · Velas en vivo')
  })
})

function Probe({ children }: { children?: ReactNode }) {
  const { lang, t } = useI18n()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="live">{t('status.live')}</span>
      {children}
    </div>
  )
}

const CYCLE: Lang[] = ['zh-CN', 'en', 'ja', 'ko', 'es']

function Toggle() {
  const { lang, setLang } = useI18n()
  return (
    <button onClick={() => setLang(CYCLE[(CYCLE.indexOf(lang) + 1) % CYCLE.length])}>toggle</button>
  )
}

describe('I18nProvider / useI18n', () => {
  it('默认中文；5 语循环切换后文案切换并持久化', () => {
    render(
      <I18nProvider>
        <Probe>
          <Toggle />
        </Probe>
      </I18nProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('zh-CN')
    expect(screen.getByTestId('live').textContent).toBe('实时')
    // 中文 → EN
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('live').textContent).toBe('Live')
    expect(localStorage.getItem('kline-buty:lang')).toBe('en')
    // EN → 日本語
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('ja')
    expect(screen.getByTestId('live').textContent).toBe('リアルタイム')
    expect(localStorage.getItem('kline-buty:lang')).toBe('ja')
    // 日本語 → 한국어
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('ko')
    expect(screen.getByTestId('live').textContent).toBe('실시간')
    expect(localStorage.getItem('kline-buty:lang')).toBe('ko')
    // 한국어 → Español
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('es')
    expect(screen.getByTestId('live').textContent).toBe('En vivo')
    expect(localStorage.getItem('kline-buty:lang')).toBe('es')
  })

  it('持久化的语言在重新挂载时恢复（含 ja/ko）', () => {
    localStorage.setItem('kline-buty:lang', 'en')
    const { unmount } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('live').textContent).toBe('Live')
    unmount()
    localStorage.setItem('kline-buty:lang', 'ja')
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('live').textContent).toBe('リアルタイム')
  })

  it('无 Provider 时兜底为中文（组件可独立测试）', () => {
    render(<Probe />)
    expect(screen.getByTestId('lang').textContent).toBe('zh-CN')
    expect(screen.getByTestId('live').textContent).toBe('实时')
  })

  it('makeT 返回可复用函数（5 语）', () => {
    const t = makeT(en)
    expect(t('group.main')).toBe('Main')
    expect(makeT(ja)('group.main')).toBe('メイン')
    expect(makeT(ko)('group.main')).toBe('메인')
    expect(makeT(es)('group.main')).toBe('Principal')
  })

  it('DEFAULT_LANG 为 zh-CN（既有测试默认语言）', () => {
    expect(DEFAULT_LANG).toBe('zh-CN')
  })

  it('MessageKey 类型为字符串（编译期键校验）', () => {
    const key: MessageKey = 'status.live'
    expect(typeof key).toBe('string')
  })
})
