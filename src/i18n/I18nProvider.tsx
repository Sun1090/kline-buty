import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DICTIONARIES, DEFAULT_LANG, titleFor, type Lang } from './messages'
import { makeT } from './translate'
import { I18nContext, type I18nContextValue } from './context'

const STORAGE_KEY = 'kline-buty:lang'

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
