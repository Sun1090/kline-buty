import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DICTIONARIES, DEFAULT_LANG, titleFor, type Lang, type MessageKey, type Messages } from './messages'

const STORAGE_KEY = 'kline-buty:lang'

export type { Lang, MessageKey, Messages }
export { localeFor, DICTIONARIES, DEFAULT_LANG, chartLabelsFor, titleFor, type ChartLabels } from './messages'
export { zh, en, ja, ko, es } from './messages'

export type TFunction = (key: MessageKey, params?: Record<string, string | number>) => string

/** 解析 "a.b.c" 并替换 {param} 占位符 */
export function translate(messages: Messages, key: string, params?: Record<string, string | number>): string {
  let value: unknown = messages
  for (const part of key.split('.')) {
    if (typeof value !== 'object' || value === null) return key
    value = (value as Record<string, unknown>)[part]
  }
  if (typeof value !== 'string') return key
  if (!params) return value
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function makeT(messages: Messages): TFunction {
  return (key, params) => translate(messages, key, params)
}

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunction
}

/** 无 Provider 时的兜底（默认中文）：让组件可独立渲染/测试 */
const DEFAULT_CONTEXT: I18nContextValue = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: makeT(DICTIONARIES[DEFAULT_LANG]),
}

const I18nContext = createContext<I18nContextValue>(DEFAULT_CONTEXT)

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'zh-CN' || v === 'en' || v === 'ja' || v === 'ko' || v === 'es') return v
  } catch {
    /* noop */
  }
  return DEFAULT_LANG
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* noop */
    }
  }

  // 同步 <html lang> 与标题（SEO / 无障碍 / 日期格式化）
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = titleFor(lang)
  }, [lang])

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t: makeT(DICTIONARIES[lang]) }), [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}
