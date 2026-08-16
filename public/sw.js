const CACHE_NAME = 'kline-buty-v2'
const SCOPE = self.registration.scope
const PRECACHE = [SCOPE, SCOPE + 'index.html', SCOPE + 'manifest.webmanifest', SCOPE + 'icon.svg']

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
  if (url.pathname.includes('/api') || url.pathname.includes('/fapi') || url.pathname.includes('/ws')) return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
        }
        return res
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((m) => m || caches.match(SCOPE + 'index.html')),
      ),
  )
})

// ---- 后台价格提醒（尽力而为） ----
// 限制：SW 无本地定时器保证，浏览器休眠后 SW 被终止即失效；
// 通知权限与页面共享，页面同步 alerts + lang 到 SW 内存。

const NOTIFY_TEXT = {
  'zh-CN': { title: 'Kline Buty · 价格提醒', above: '已到达', below: '已跌破' },
  en: { title: 'Kline Buty · Price alert', above: 'reached', below: 'broke below' },
  ja: { title: 'Kline Buty · 価格アラート', above: 'に到達', below: 'を下回りました' },
  ko: { title: 'Kline Buty · 가격 알림', above: '도달', below: '하락' },
}

let alerts = []
let notified = new Set()
let lang = 'zh-CN'

self.addEventListener('message', (event) => {
  if (event.data?.type === 'alerts') {
    alerts = event.data.alerts ?? []
    notified = new Set()
    if (event.data.lang === 'zh-CN' || event.data.lang === 'en' || event.data.lang === 'ja' || event.data.lang === 'ko') lang = event.data.lang
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
      const text = NOTIFY_TEXT[lang] ?? NOTIFY_TEXT['zh-CN']
      self.registration.showNotification(text.title, {
        body: `${a.symbol} ${a.direction === 'above' ? text.above : text.below} ${a.price}`,
        tag: a.id,
        data: { symbol: a.symbol },
      })
    }
  }
}


self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const symbol = event.notification.data?.symbol
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      if (list.length > 0) {
        if (symbol) list[0].postMessage({ type: 'focus-symbol', symbol })
        return list[0].focus()
      }
      return self.clients.openWindow(SCOPE)
    }),
  )
})

setInterval(poll, 20_000)
