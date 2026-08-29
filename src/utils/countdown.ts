/** 周期收盘倒计时文本：<1h 显示 mm:ss，≥1h 显示 hh:mm:ss，跨天加 N d 前缀；负值钳为 00:00 */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hh = Math.floor((total % 86400) / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const hms = `${pad(hh)}:${pad(mm)}:${pad(ss)}`
  return days > 0 ? `${days}d ${hms}` : total >= 3600 ? hms : `${pad(mm)}:${pad(ss)}`
}
