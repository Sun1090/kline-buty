import { useCallback, useEffect, useRef, useState } from 'react'
import type { HeaderOption } from './headerOptions'

/** 弹层内网格选项按钮（类型/主图/副图/画线），支持方向键导航 */
export function OptionGrid({
  options,
  value,
  onPick,
  label,
}: {
  options: HeaderOption[]
  value: string
  onPick: (v: string) => void
  label: (o: HeaderOption) => string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusIdx, setFocusIdx] = useState(0)

  // options 变化时重置焦点索引到选中项或首项
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value)
    setFocusIdx(Math.max(0, idx))
  }, [options, value])

  const getButtons = useCallback(() => {
    if (!containerRef.current) return []
    return [...containerRef.current.querySelectorAll<HTMLButtonElement>('button')]
  }, [])

  const focusIndex = useCallback(
    (idx: number) => {
      const btns = getButtons()
      if (!btns.length) return
      if (idx < 0) idx = btns.length - 1
      if (idx >= btns.length) idx = 0
      setFocusIdx(idx)
      btns[idx]?.focus()
    },
    [getButtons],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const btns = getButtons()
    if (!btns.length) return
    const currentIdx = btns.indexOf(document.activeElement as HTMLButtonElement)
    if (currentIdx === -1) return

    // 网格吃掉的方向键/Space/Enter 必须 stopPropagation，
    // 否则会冒泡到 window 全局快捷键（←→↑↓ = 回放步进/调速、Space = 播放/暂停）。
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(currentIdx + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(currentIdx - 1)
        break
      case 'Home':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(0)
        break
      case 'End':
        e.preventDefault()
        e.stopPropagation()
        focusIndex(btns.length - 1)
        break
      case ' ':
      case 'Enter':
        // 按钮原生 click 仍会触发（选工具）；只拦截全局快捷键误触发
        e.stopPropagation()
        break
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
      onKeyDown={handleKeyDown}
    >
      {options.map((o, idx) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            aria-pressed={active}
            tabIndex={idx === focusIdx ? 0 : -1}
            onClick={() => onPick(o.value)}
            style={{
              flex: '0 0 auto',
              minWidth: 72,
              padding: '7px 10px',
              fontSize: 12,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: active ? '#fff' : 'var(--text-dim)',
            }}
          >
            {label(o)}
          </button>
        )
      })}
    </div>
  )
}
