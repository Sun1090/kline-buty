import type { ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n'
import { Skeleton } from './Skeleton'

export type PanelStatus = 'loading' | 'error' | 'empty'

interface PanelStateProps {
  status: PanelStatus
  /** 覆盖默认文案（i18n 已翻译的字符串） */
  message?: ReactNode
  /** error 态的重试按钮 */
  onRetry?: () => void
  /** L6 加载态骨架屏：true 时 loading 渲染占位块而非文字 */
  skeleton?: boolean
}

const style: React.CSSProperties = {
  padding: '16px 12px',
  fontSize: 12,
  color: 'var(--text-faint)',
  textAlign: 'center',
}

/** 面板统一空态/错误态/加载态（T30）：三态共用一套样式，error 可带重试；loading 可骨架屏（L6） */
export function PanelState({ status, message, onRetry, skeleton }: PanelStateProps) {
  const { t } = useI18n()
  const fallback = status === 'loading' ? t('panelState.loading') : status === 'error' ? t('panelState.error') : t('panelState.empty')
  if (status === 'loading' && skeleton) {
    return (
      <div role="status" style={{ padding: '8px 12px' }}>
        <Skeleton rows={8} rowHeight={18} testId="panel-skeleton" />
      </div>
    )
  }
  return (
    <div style={style} role={status === 'error' ? 'alert' : 'status'}>
      <div>{message ?? fallback}</div>
      {status === 'error' && onRetry && (
        <button
          data-testid="panel-retry"
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: '3px 12px',
            fontSize: 11,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
          }}
        >
          {t('panelState.retry')}
        </button>
      )}
    </div>
  )
}
