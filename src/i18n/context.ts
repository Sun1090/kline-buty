import { createContext } from 'react'
import { DICTIONARIES, DEFAULT_LANG, type Lang } from './messages'
import { makeT, type TFunction } from './translate'

export interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunction
}

/** 无 Provider 时的兜底（默认中文）：让组件可独立渲染/测试 */
export const DEFAULT_CONTEXT: I18nContextValue = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: makeT(DICTIONARIES[DEFAULT_LANG]),
}

export const I18nContext = createContext<I18nContextValue>(DEFAULT_CONTEXT)
