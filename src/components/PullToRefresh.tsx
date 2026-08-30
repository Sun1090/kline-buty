import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n'

interface PullToRefreshProps {
  onRefresh: () => void
  /** 仅移动端启用（桌面鼠标无下拉语义） */
  enabled: boolean
  children: ReactNode
}

const TRIGGER_PX = 80
/** 进入「拉取」判定需要的最小纵向位移（低于它交给图表原生手势） */
const ARM_PX = 24

/** 移动端下拉刷新（T22）：图表区顶部下拉 → 重取 K 线。
 *  纵向主导且下拉超过阈值才触发；一旦判定为拉取即 preventDefault，阻止图表继续平移。 */
export function PullToRefresh({ onRefresh, enabled, children }: PullToRefreshProps) {
  const { t } = useI18n()
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const armedRef = useRef(false)
  const pullingRef = useRef(false)
  const refreshingRef = useRef(false)
  refreshingRef.current = refreshing

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !enabled) return

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return
      const t0 = e.touches[0]
      startRef.current = { x: t0.clientX, y: t0.clientY }
      armedRef.current = false
      pullingRef.current = false
    }

    const onMove = (e: TouchEvent) => {
      const s = startRef.current
      if (!s || refreshingRef.current) return
      const t0 = e.touches[0]
      const dy = t0.clientY - s.y
      const dx = t0.clientX - s.x
      if (!pullingRef.current) {
        // 纵向主导且向下才进入拉取判定，其余手势（平移/捏合）不抢
        if (dy > ARM_PX && dy > Math.abs(dx) * 1.2) pullingRef.current = true
        else return
      }
      if (dy > 0) {
        e.preventDefault()
        const p = Math.min(1, dy / TRIGGER_PX)
        setProgress(p)
        armedRef.current = p >= 1
      } else {
        pullingRef.current = false
        setProgress(0)
        armedRef.current = false
      }
    }

    const onEnd = () => {
      const s = startRef.current
      if (!s) return
      if (pullingRef.current && armedRef.current && !refreshingRef.current) {
        setRefreshing(true)
        setProgress(0)
        onRefresh()
        window.setTimeout(() => setRefreshing(false), 800)
      } else {
        setProgress(0)
      }
      startRef.current = null
      pullingRef.current = false
      armedRef.current = false
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, onRefresh])

  const label = refreshing ? t('pull.refreshing') : progress >= 1 ? t('pull.release') : t('pull.pull')

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {(enabled && (progress > 0 || refreshing)) && (
        <div
          data-testid="pull-indicator"
          style={{
            position: 'absolute',
            top: refreshing ? 8 : Math.min(48, progress * 48),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            padding: '3px 12px',
            fontSize: 11,
            borderRadius: 12,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            color: progress >= 1 || refreshing ? 'var(--accent)' : 'var(--text-faint)',
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}
