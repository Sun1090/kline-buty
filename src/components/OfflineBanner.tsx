import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/useI18n'

/** 网络在线/离线状态提示条 */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function OfflineBanner() {
  const online = useOnlineStatus()
  const { t } = useI18n()
  if (online) return null
  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        padding: '4px 16px',
        background: 'rgba(239,83,80,0.15)',
        color: 'var(--down)',
        fontSize: 12,
        textAlign: 'center',
        flexShrink: 0,
      }}
    >
      {t('offline.text')}
    </div>
  )
}
