import type { MessageKey, Messages } from './messages'

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
