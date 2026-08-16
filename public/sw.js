const CACHE_NAME = 'kline-buty-v1'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// 网络优先、失败回退缓存（API 请求不缓存）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/fapi') || url.pathname.startsWith('/ws')) return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request).then((m) => m || caches.match('/'))),
  )
})

// ---- 后台价格提醒（尽力而为） ----
// 限制：SW 无本地定时器保证，浏览器休眠后 SW 被终止即失效；
// 通知权限与页面共享，页面同步 alerts 到 SW 内存。

let alerts = []
let notified = new Set()

self.addEventListener('message', (event) => {
  if (event.data?.type === 'alerts') {
    alerts = event.data.alerts ?? []
    notified = new Set()
  }
})

async function poll() {
  const current = new Map()
  for (const a of alerts) {
    if (notified.has(a.id)) continue
    if (!current.has(a.symbol)) {
      try {
        const res = await fetch(`/api/v3/klines?symbol=${a.symbol}&interval=1m&limit=1`)
        if (!res.ok) continue
        const klines = await res.json()
        current.set(a.symbol, Number(klines[0][4]))
      } catch {
        continue
      }
    }
    const price = current.get(a.symbol)
    if (price === undefined) continue
    const hit = a.direction === 'above' ? price >= a.price : price <= a.price
    if (hit) {
      notified.add(a.id)
      self.registration.showNotification('Kline Buty · 价格提醒', {
        body: `${a.symbol} ${a.direction === 'above' ? '已到达' : '已跌破'} ${a.price}`,
        tag: a.id,
      })
    }
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    if (list.length > 0) {
      return list[0].focus()
    }
    return self.clients.openWindow('/')
  }))
})

setInterval(poll, 30_000)
