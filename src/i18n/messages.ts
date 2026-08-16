/** 界面文案字典（zh-CN / en）。
 * 结构：嵌套对象，叶子为字符串；支持 {name} 插值。
 * en 以 typeof zh 约束，保证键完全对齐（编译期校验）。
 */

export type Lang = 'zh-CN' | 'en'

export const zh = {
  common: {
    none: '无',
    price: '价格',
    delete: '删除',
    cancel: '取消',
    confirm: '确定',
    retry: '重试',
  },
  status: {
    loading: '加载历史数据…',
    connecting: '连接实时行情…',
    live: '实时',
    reconnecting: '重连中…',
    closed: '连接断开',
    error: '加载失败',
    chartError: '行情数据加载失败：请检查网络或数据源可达性',
    noData: '暂无数据',
    depthLoading: '加载盘口深度…',
    vpNotEnough: '数据不足',
    replayNotEnough: '数据不足（需 ≥30 根）',
  },
  chartType: {
    candlestick: '蜡烛',
    line: '折线',
    area: '面积',
  },
  group: {
    type: '类型',
    main: '主图',
    sub: '副图',
  },
  period: {
    '1s': '1秒',
    '1m': '1分',
    '3m': '3分',
    '5m': '5分',
    '15m': '15分',
    '30m': '30分',
    '1h': '1时',
    '2h': '2时',
    '4h': '4时',
    '12h': '12时',
    '1d': '日',
    '3d': '3日',
    '1w': '周',
    '1M': '月',
  },
  lang: {
    switchTo: '语言切换（中/EN）',
  },
  theme: {
    switchTitle: '切换主题',
    toLight: '浅色',
    toDark: '深色',
  },
  layout: {
    switchTitle: '布局切换（单图/双图/四图）',
    single: '单图',
    pair: '双图',
    quad: '四图',
  },
  fullscreen: {
    enter: '全屏',
    exit: '退出全屏',
  },
  panel: {
    position: '仓位',
    positionTitle: '模拟仓位（开仓/止盈/止损线）',
    alerts: '提醒',
    alertsTitle: '价格提醒',
    depth: '深度',
    depthTitle: '盘口深度图',
    vp: '筹码',
    vpTitle: '筹码分布（成交量分布 VPVR）',
    settings: '参数',
    sentiment: '情绪',
    sentimentTitle: '衍生品情绪（多空比/主动买卖/未平仓）',
  },
  sentiment: {
    globalRatio: '全账户多空比',
    topTraderRatio: '大户持仓多空比',
    takerRatio: '主动买卖比',
    openInterest: '未平仓 24h',
    long: '多',
    buy: '买',
    loading: '加载中…',
  },
  replay: {
    start: '回放',
    title: '历史逐根回放',
    play: '播放',
    pause: '暂停',
    exit: '退出回放',
  },
  drawing: {
    group: '画线',
    mouse: '鼠标',
    horizontal: '水平线',
    trend: '趋势线',
    channel: '平行通道',
    fib: '斐波那契',
    text: '文本',
    defaultText: '文本',
    rect: '矩形',
    ray: '射线',
    editText: '改字',
    textPlaceholder: '文本内容',
    screenshot: '截图',
    screenshotTitle: '截图分享',
  },
  symbol: {
    searchPlaceholder: '搜索交易对…',
    popular: '常用',
    searchResults: '搜索结果 {count}',
    noMatch: '无匹配交易对',
  },
  indicator: {
    settings: '指标参数',
    noParams: '当前指标无参数可调',
    maPeriods: '{name} 周期(逗号分隔)',
    bollPeriod: 'BOLL 周期',
    bollMult: 'BOLL 标准差倍数',
    macdFast: 'MACD 快线',
    macdSlow: 'MACD 慢线',
    macdSignal: 'MACD 信号',
    rsiPeriod: 'RSI 周期',
  },
  stats: {
    lastPrice: '最新价',
    change24h: '24h涨跌',
    high24h: '24h高',
    low24h: '24h低',
    volume24h: '24h额',
    fundingRate: '资金费率',
    openInterest: '未平仓',
    markPrice: '标记价',
  },
  position: {
    title: '模拟仓位',
    close: '平仓',
    long: '开多',
    short: '开空',
    entry: '开仓价',
    market: '现价',
    quantity: '数量',
    tpPct: '止盈%',
    slPct: '止损%',
    tpLine: '止盈线',
    slLine: '止损线',
    floatingPnl: '浮动盈亏',
    open: '开仓',
    lineEntry: '开仓',
    lineTp: '止盈',
    lineSl: '止损',
  },
  alert: {
    title: '价格提醒 · {symbol}',
    granted: '通知已开启',
    unsupported: '环境不支持通知',
    enable: '开启通知',
    above: '价格 ≥',
    below: '价格 ≤',
    add: '添加提醒',
    none: '暂无提醒',
    triggered: '已触发',
    reset: '重置',
    notifyTitle: 'Kline Buty · 价格提醒',
    notifyAbove: '{symbol} 已到达 {price}',
    notifyBelow: '{symbol} 已跌破 {price}',
  },
  tooltip: {
    open: '开',
    high: '高',
    low: '低',
    close: '收',
    volume: '量',
  },
  depth: {
    title: '盘口深度 · {symbol}（实时）',
    bid: '买',
    ask: '卖',
  },
  volumeProfile: {
    title: '筹码分布（最近 300 根）· {symbol}',
    poc: '密集区 ≈ {price}',
    bidVol: '买量',
    askVol: '卖量',
    pocLabel: '密集区',
  },
  offline: {
    text: '网络已断开，行情暂停更新，恢复后自动重连',
  },
  errorBoundary: {
    title: '图表渲染出错',
  },
  app: {
    titleZh: 'Kline Buty · 实时 K 线',
    titleEn: 'Kline Buty · Live Candles',
  },
}

export type Messages = typeof zh

export const en: Messages = {
  common: {
    none: 'None',
    price: 'Price',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'OK',
    retry: 'Retry',
  },
  status: {
    loading: 'Loading history…',
    connecting: 'Connecting to live data…',
    live: 'Live',
    reconnecting: 'Reconnecting…',
    closed: 'Disconnected',
    error: 'Load failed',
    chartError: 'Failed to load market data: check network or data source',
    noData: 'No data',
    depthLoading: 'Loading order book…',
    vpNotEnough: 'Not enough data',
    replayNotEnough: 'Not enough data (needs ≥30 candles)',
  },
  chartType: {
    candlestick: 'Candles',
    line: 'Line',
    area: 'Area',
  },
  group: {
    type: 'Type',
    main: 'Main',
    sub: 'Sub',
  },
  period: {
    '1s': '1s',
    '1m': '1m',
    '3m': '3m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '2h': '2h',
    '4h': '4h',
    '12h': '12h',
    '1d': '1D',
    '3d': '3D',
    '1w': '1W',
    '1M': '1M',
  },
  lang: {
    switchTo: 'Switch language (中/EN)',
  },
  theme: {
    switchTitle: 'Toggle theme',
    toLight: 'Light',
    toDark: 'Dark',
  },
  layout: {
    switchTitle: 'Switch layout (single/pair/quad)',
    single: 'Single',
    pair: 'Pair',
    quad: 'Quad',
  },
  fullscreen: {
    enter: 'Fullscreen',
    exit: 'Exit fullscreen',
  },
  panel: {
    position: 'Position',
    positionTitle: 'Simulated position (entry/TP/SL lines)',
    alerts: 'Alerts',
    alertsTitle: 'Price alerts',
    depth: 'Depth',
    depthTitle: 'Order book depth',
    vp: 'VPVR',
    vpTitle: 'Volume profile (VPVR)',
    settings: 'Settings',
    sentiment: 'Sentiment',
    sentimentTitle: 'Derivatives sentiment (long/short, taker, OI)',
  },
  sentiment: {
    globalRatio: 'Global long/short',
    topTraderRatio: 'Top trader ratio',
    takerRatio: 'Taker buy/sell',
    openInterest: 'OI 24h',
    long: 'Long',
    buy: 'Buy',
    loading: 'Loading…',
  },
  replay: {
    start: 'Replay',
    title: 'Step-by-step history replay',
    play: 'Play',
    pause: 'Pause',
    exit: 'Exit replay',
  },
  drawing: {
    group: 'Draw',
    mouse: 'Mouse',
    horizontal: 'Horizontal',
    trend: 'Trend line',
    channel: 'Channel',
    fib: 'Fibonacci',
    text: 'Text',
    defaultText: 'Text',
    rect: 'Rectangle',
    ray: 'Ray',
    editText: 'Edit text',
    textPlaceholder: 'Text content',
    screenshot: 'Shot',
    screenshotTitle: 'Share screenshot',
  },
  symbol: {
    searchPlaceholder: 'Search symbols…',
    popular: 'Popular',
    searchResults: 'Results {count}',
    noMatch: 'No matching symbols',
  },
  indicator: {
    settings: 'Indicator settings',
    noParams: 'No adjustable parameters for this indicator',
    maPeriods: '{name} period (comma-separated)',
    bollPeriod: 'BOLL period',
    bollMult: 'BOLL std-dev multiplier',
    macdFast: 'MACD fast',
    macdSlow: 'MACD slow',
    macdSignal: 'MACD signal',
    rsiPeriod: 'RSI period',
  },
  stats: {
    lastPrice: 'Last price',
    change24h: '24h change',
    high24h: '24h high',
    low24h: '24h low',
    volume24h: '24h vol',
    fundingRate: 'Funding rate',
    openInterest: 'Open interest',
    markPrice: 'Mark price',
  },
  position: {
    title: 'Simulated position',
    close: 'Close',
    long: 'Long',
    short: 'Short',
    entry: 'Entry',
    market: 'Market',
    quantity: 'Qty',
    tpPct: 'TP%',
    slPct: 'SL%',
    tpLine: 'TP line',
    slLine: 'SL line',
    floatingPnl: 'Float PnL',
    open: 'Open',
    lineEntry: 'Entry',
    lineTp: 'TP',
    lineSl: 'SL',
  },
  alert: {
    title: 'Price alert · {symbol}',
    granted: 'Notifications on',
    unsupported: 'Notifications unsupported',
    enable: 'Enable',
    above: 'Price ≥',
    below: 'Price ≤',
    add: 'Add alert',
    none: 'No alerts',
    triggered: 'Triggered',
    reset: 'Reset',
    notifyTitle: 'Kline Buty · Price alert',
    notifyAbove: '{symbol} reached {price}',
    notifyBelow: '{symbol} broke below {price}',
  },
  tooltip: {
    open: 'O',
    high: 'H',
    low: 'L',
    close: 'C',
    volume: 'Vol',
  },
  depth: {
    title: 'Order book · {symbol} (live)',
    bid: 'Bid',
    ask: 'Ask',
  },
  volumeProfile: {
    title: 'Volume profile (last 300) · {symbol}',
    poc: 'POC ≈ {price}',
    bidVol: 'Bid vol',
    askVol: 'Ask vol',
    pocLabel: 'POC',
  },
  offline: {
    text: 'Network disconnected; updates paused, will auto-reconnect',
  },
  errorBoundary: {
    title: 'Chart render error',
  },
  app: {
    titleZh: 'Kline Buty · 实时 K 线',
    titleEn: 'Kline Buty · Live Candles',
  },
}

/** 扁平叶子键（如 "status.loading"），带类型提示 */
type LeafKeyOf<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? Prefix extends ''
      ? K
      : `${Prefix}.${K}`
    : LeafKeyOf<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
}[keyof T & string]

export type MessageKey = LeafKeyOf<Messages>

export const DICTIONARIES: Record<Lang, Messages> = { 'zh-CN': zh, en }

export const DEFAULT_LANG: Lang = 'zh-CN'

/** 语言 → Intl locale（日期/数字格式化用） */
export function localeFor(lang: Lang): string {
  return lang === 'zh-CN' ? 'zh-CN' : 'en-US'
}

/** 图表渲染层（adapter）所需的本地化标签：文本标注默认文案 + 仓位线标签 */
export interface ChartLabels {
  defaultText: string
  entry: string
  tp: string
  sl: string
}

export function chartLabelsFor(lang: Lang): ChartLabels {
  const m = DICTIONARIES[lang]
  return {
    defaultText: m.drawing.defaultText,
    entry: m.position.lineEntry,
    tp: m.position.lineTp,
    sl: m.position.lineSl,
  }
}
