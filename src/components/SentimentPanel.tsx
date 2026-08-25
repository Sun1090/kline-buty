import type { OiPoint, RatioPoint, TakerPoint } from '../data/binance/rest'
import type { SentimentData } from '../hooks/useSentiment'
import { useI18n, localeFor, type Lang } from '../i18n'
import { Sparkline } from './Sparkline'

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1]
}

function fmtRatio(v: number) {
  return v.toFixed(2)
}

function fmtOiOz(v: number, lang: Lang) {
  // 本地化紧凑格式：zh 显示「万」，en 显示 K 等，避免硬编码中文单位
  return new Intl.NumberFormat(localeFor(lang), {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(v)
}

interface RatioBlockProps {
  title: string
  points: RatioPoint[]
}

/** 多空比块：当前比值 + 多/空双色占比条 + 24h 走势 */
function RatioBlock({ title, points }: RatioBlockProps) {
  const { t } = useI18n()
  const cur = last(points)
  if (!cur) {
    return (
      <Block title={title}>
        <span style={{ color: 'var(--text-faint)' }}>{t('sentiment.loading')}</span>
      </Block>
    )
  }
  const longPct = cur.long * 100
  return (
    <Block title={title}>
      <span style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtRatio(cur.longShortRatio)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 150 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', background: 'var(--down)' }}>
          <div style={{ width: `${longPct}%`, background: 'var(--up)' }} />
        </div>
        <span style={{ color: 'var(--up)', fontSize: 11 }}>{longPct.toFixed(0)}%</span>
        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('sentiment.long')}</span>
      </div>
      <Sparkline fluid points={points.map((p) => p.longShortRatio)} />
    </Block>
  )
}

interface TakerBlockProps {
  title: string
  points: TakerPoint[]
}

/** 主动买卖量比块：买/卖双色占比条 + 走势 */
function TakerBlock({ title, points }: TakerBlockProps) {
  const { t } = useI18n()
  const cur = last(points)
  if (!cur) {
    return (
      <Block title={title}>
        <span style={{ color: 'var(--text-faint)' }}>{t('sentiment.loading')}</span>
      </Block>
    )
  }
  const buyPct = (cur.buyVol / (cur.buyVol + cur.sellVol || 1)) * 100
  return (
    <Block title={title}>
      <span style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtRatio(cur.buySellRatio)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 150 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', background: 'var(--down)' }}>
          <div style={{ width: `${buyPct}%`, background: 'var(--up)' }} />
        </div>
        <span style={{ color: 'var(--up)', fontSize: 11 }}>{buyPct.toFixed(0)}%</span>
        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t('sentiment.buy')}</span>
      </div>
      <Sparkline fluid points={points.map((p) => p.buySellRatio)} />
    </Block>
  )
}

interface OiBlockProps {
  title: string
  points: OiPoint[]
}

/** 未平仓历史块：当前值 + 24h 变化 + 走势 */
function OiBlock({ title, points }: OiBlockProps) {
  const { t, lang } = useI18n()
  const cur = last(points)
  const first = points[0]
  if (!cur) {
    return (
      <Block title={title}>
        <span style={{ color: 'var(--text-faint)' }}>{t('sentiment.loading')}</span>
      </Block>
    )
  }
  const change = first ? (cur.oi - first.oi) / first.oi : 0
  const color = change >= 0 ? 'var(--up)' : 'var(--down)'
  return (
    <Block title={title}>
      <span style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtOiOz(cur.oi, lang)}</span>
      <span style={{ color, fontSize: 11 }}>{change >= 0 ? '+' : ''}{(change * 100).toFixed(2)}%</span>
      <Sparkline fluid points={points.map((p) => p.oi)} />
    </Block>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={title} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 260px', minWidth: 240, maxWidth: '100%', padding: '6px 16px', borderRight: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>{title}</span>
      {children}
    </div>
  )
}

interface SentimentPanelProps {
  data: SentimentData
}

/** 衍生品情绪面板：多空比 ×2 + 主动买卖比 + 未平仓历史（对标 OKX/币安合约数据） */
export function SentimentPanel({ data }: SentimentPanelProps) {
  const { t } = useI18n()
  return (
    <div
      data-testid="sentiment-panel"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        gap: 0,
        overflowX: 'hidden',
        borderBottom: '1px solid var(--border)',
        background: 'var(--panel)',
        flexShrink: 0,
      }}
    >
      <RatioBlock title={t('sentiment.globalRatio')} points={data.globalRatio} />
      <RatioBlock title={t('sentiment.topTraderRatio')} points={data.topTraderRatio} />
      <TakerBlock title={t('sentiment.takerRatio')} points={data.takerRatio} />
      <OiBlock title={t('sentiment.openInterest')} points={data.oiHistory} />
    </div>
  )
}
