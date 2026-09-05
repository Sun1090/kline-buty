import { useEffect, useRef } from 'react'

/**
 * M5 弹层焦点陷阱：弹层打开时把 Tab 循环锁定在其内部（不逃逸到背后页面），
 * 关闭/卸载时恢复弹层内最后一个焦点元素。
 *
 * 用法：`useFocusTrap(open, ref)`，ref 指向弹层根元素。
 * 弹层内首个可聚焦元素自动获焦（非强制——若内部已有焦点则保留）。
 */

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** 收集弹层内可聚焦元素 */
export function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && !el.hasAttribute('aria-hidden') && !el.hidden,
  )
}

/** 弹层根上挂 focusin 监听做 Tab 陷阱（inTabLoop 内部实现，外部不可见） */
export function useFocusTrap(open: boolean, ref: React.RefObject<HTMLElement | null>): void {
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const root = ref.current
    if (!root) return
    // 记录打开前的焦点元素（关闭时恢复）
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // 弹层内首个可聚焦元素获焦（无内部焦点时）
    const first = focusableElements(root)[0]
    if (first && !root.contains(document.activeElement)) first.focus()

    const onFocusIn = (e: FocusEvent) => {
      // 焦点逃出弹层 → 拉回首个可聚焦元素（Tab 陷阱核心）
      if (root.contains(e.target as Node)) return
      const els = focusableElements(root)
      if (els.length === 0) return
      els[0].focus()
    }
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      // 恢复打开前焦点
      lastFocusedRef.current?.focus()
      lastFocusedRef.current = null
    }
  }, [open, ref])
}
