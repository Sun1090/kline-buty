import { useEffect, useState } from 'react'

/** 网络在线/离线状态提示条 */
export function useOnlineStatus(): boolean {
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
  if (online) return null
  return (
    <div
      style={{
        padding: '4px 16px',
        background: 'rgba(239,83,80,0.15)',
        color: 'var(--down)',
        fontSize: 12,
        textAlign: 'center',
        flexShrink: 0,
      }}
    >
      网络已断开，行情暂停更新，恢复后自动重连
    </div>
  )
}
