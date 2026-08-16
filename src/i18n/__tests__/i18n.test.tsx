// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { zh, en, localeFor, chartLabelsFor, type MessageKey } from '../messages'
import { I18nProvider, useI18n, DEFAULT_LANG, translate, makeT } from '../index'
import type { ReactNode } from 'react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('字典完整性', () => {
  it('en 与 zh 键完全一致（结构对齐）', () => {
    const collect = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'string' ? [prefix ? `${prefix}.${k}` : k] : collect(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k),
      )
    expect(collect(en as unknown as Record<string, unknown>).sort()).toEqual(
      collect(zh as unknown as Record<string, unknown>).sort(),
    )
  })

  it('en 与 zh 类型同构（编译期已保证，运行期抽查叶子数量）', () => {
    const leafCount = (obj: Record<string, unknown>): number =>
      Object.values(obj).reduce<number>((n, v) => n + (typeof v === 'string' ? 1 : leafCount(v as Record<string, unknown>)), 0)
    expect(leafCount(en as unknown as Record<string, unknown>)).toBeGreaterThan(50)
    expect(leafCount(zh as unknown as Record<string, unknown>)).toBe(leafCount(en as unknown as Record<string, unknown>))
  })

  it('插值：替换 {param} 占位符', () => {
    expect(translate(zh, 'symbol.searchResults', { count: 3 })).toBe('搜索结果 3')
    expect(translate(en, 'symbol.searchResults', { count: 3 })).toBe('Results 3')
  })

  it('未知键/非字符串叶子回退为键本身', () => {
    expect(translate(zh, 'not.exists')).toBe('not.exists')
    expect(translate(zh, 'common')).toBe('common')
  })

  it('localeFor 映射', () => {
    expect(localeFor('zh-CN')).toBe('zh-CN')
    expect(localeFor('en')).toBe('en-US')
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

function Toggle() {
  const { lang, setLang } = useI18n()
  return (
    <button onClick={() => setLang(lang === 'zh-CN' ? 'en' : 'zh-CN')}>toggle</button>
  )
}

describe('I18nProvider / useI18n', () => {
  it('默认中文；切换后文案变英文并持久化', () => {
    render(
      <I18nProvider>
        <Probe>
          <Toggle />
        </Probe>
      </I18nProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('zh-CN')
    expect(screen.getByTestId('live').textContent).toBe('实时')
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('live').textContent).toBe('Live')
    expect(localStorage.getItem('kline-buty:lang')).toBe('en')
  })

  it('持久化的语言在重新挂载时恢复', () => {
    localStorage.setItem('kline-buty:lang', 'en')
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('live').textContent).toBe('Live')
  })

  it('无 Provider 时兜底为中文（组件可独立测试）', () => {
    render(<Probe />)
    expect(screen.getByTestId('lang').textContent).toBe('zh-CN')
    expect(screen.getByTestId('live').textContent).toBe('实时')
  })

  it('makeT 返回可复用函数', () => {
    const t = makeT(en)
    expect(t('group.main')).toBe('Main')
  })

  it('DEFAULT_LANG 为 zh-CN（既有测试默认语言）', () => {
    expect(DEFAULT_LANG).toBe('zh-CN')
  })

  it('MessageKey 类型为字符串（编译期键校验）', () => {
    const key: MessageKey = 'status.live'
    expect(typeof key).toBe('string')
  })
})
