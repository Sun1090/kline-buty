---
title: "08 · Adjusted Prices, Ex-Dividend Days, and Indicator Distortion"
description: "Adjusted prices and ex-dividend/ex-rights mechanics — the ex-price formula, choosing among pre-adjusted, post-adjusted, and unadjusted data, how ex-day gaps corrupt moving averages, MACD, and Fibonacci retracements, a practical checklist, and special notes for high-dividend stocks"
---

# 08 · Adjusted Prices, Ex-Dividend Days, and Indicator Distortion

> You watch a stock "fall from 30 to 27" and prepare to buy the dip — but maybe nothing fell at all: that 3-yuan "decline" is just the bookkeeping gap left by today's dividend. **Not understanding adjusted prices is like watching charts with the wrong prescription glasses: patterns, moving averages, and indicators are all warped.** This article covers the mechanics of ex-dividend/ex-rights adjustments, how to choose among the three adjustment conventions, and how the ex-day gap corrupts technical indicators.

---

## 1. What Ex-Dividend / Ex-Rights Actually Is

### 1.1 Dividends and Share Distributions Do Not Change Your Holding Value

<mark>Ex-dividend / ex-rights</mark>: after a listed company pays a cash dividend or distributes bonus shares / capital-reserve conversions, the exchange mechanically lowers the share price on the trading day after the record date, so that "share price + the cash/shares you received" stays unchanged. The downward **<mark>gap</mark>** that appears that day is the adjustment itself — ex-dividend for cash payouts, ex-rights for share distributions.

- Cash dividend: you receive, say, 3 yuan per 10 shares, and the price is lowered by about 0.3 yuan per share — **money moves from "market value" to "your bank account"**;
- Bonus/conversion shares: you receive 5 extra shares per 10, and the price is discounted accordingly (roughly divided by 1.5) — **the pie did not get bigger; it was just cut into more slices**.

Your position value does not change at the moment of the adjustment; the gap is not a loss, it is bookkeeping. For the basic math (how the price changes after "10 shares get X bonus shares and Y yuan"), see [Stock Basics](stock-basics.md).

### 1.2 The Ex-Reference Price (Simplified Formula)

```text
Ex-reference price = (previous close − cash dividend per share + rights-issue price × rights ratio)
                     ÷ (1 + bonus/conversion ratio + rights ratio)

Simplified memory:
  Cash dividend only ≈ previous close − dividend per share
  10-for-10 bonus shares only ≈ previous close ÷ 2
```

Example: previous close 30 yuan, dividend of 3 yuan per 10 shares (0.3 yuan/share) → ex-dividend reference 29.7 yuan; a 10-for-10 bonus (1 bonus share per share held) → ex-rights reference 15 yuan. On the ex-day in A-shares the daily price limit and trading rules are unchanged; specifics follow the latest exchange rules (see [A-Share Trading Rules](a-share-rules.md)).

---

## 2. Three Conventions: Pre-Adjusted, Post-Adjusted, Unadjusted

The same stock's historical candles can be drawn three ways:

| Convention | Method | Meaning | Typical use |
|---|---|---|---|
| Unadjusted | Raw historical traded prices as they were | Real downward gaps on every ex-day | Checking a specific day's actual trades, matching historical announcements |
| <mark>Pre-adjusted</mark> | Historical prices back-converted against the latest price using dividend/distribution math | Continuous chart with no gaps; latest price = current price | **Reading historical patterns, drawing support/resistance, everyday charting (the default)** |
| <mark>Post-adjusted</mark> | Cumulative dividends/distributions folded forward from the IPO day | Reflects **true cumulative returns** including reinvested dividends | **Computing long-run returns, comparing the real performance of two stocks** |

Three usage points:

1. **Use pre-adjusted data for historical patterns**. On an unadjusted chart every ex-day cuts a fake gap through the price series; pattern recognition, trendlines, and indicators are all shredded. Pre-adjusting smooths the gaps so patterns become trustworthy.
2. **Use post-adjusted data for true returns**. Pre-adjusted data implicitly assumes "dividends are taken out and spent, not reinvested"; post-adjusted data treats every dividend as reinvested. For a long-running high-dividend stock, the post-adjusted gain can be several times the unadjusted one.
3. **Be extra careful with conventions right around an ex-day**. When doing precise calculations (returns, P&L attribution) in the days spanning an ex-date, confirm that all data uses one consistent convention — mixing conventions is the most common silent error in backtests and record-keeping.

::: warning The Direction of the Two Adjustments
Memory aid: **pre-adjustment looks backward (drags history down to today's price level); post-adjustment looks forward (rolls today's money back to the IPO day)**. The pre-adjusted and post-adjusted charts of the same stock have identical shapes, differing only in the vertical scale — so pattern conclusions match, but any conclusion expressed in prices ("how many times did it multiply") must use post-adjusted data.
:::

---

## 3. How the Ex-Day Gap Corrupts Indicators

### 3.1 On Unadjusted Data, No Indicator Can Be Trusted

Indicators take historical price series as input. In an unadjusted series, the ex-day cliff is bookkeeping, not trading — but the indicator cannot tell the difference:

| Indicator | Distortion on unadjusted data | Symptom |
|---|---|---|
| <mark>Moving averages</mark> (MA/EMA) | The gap digs a pit under the averages | Long averages (e.g. the 120-day) fold sharply, producing fake "death crosses" and fake "support breaks" |
| MACD | DIF/DEA plunge on the price cliff | Frequent fake crossovers, abnormally tall histogram bars |
| Fibonacci retracements | The swing range is polluted by the gap | Any high/low pair spanning an ex-day computes wrong retracement levels |
| KDJ/RSI | Stalling and fake oversold signals | Readings slam into oversold at the ex-moment despite no real move |

**Average depth and the gap**: a gap pollutes an N-day average for roughly N days. A 10% ex-day gap contaminates the 120-day average for about four months; the longer the period, the longer and deeper the contamination. That is why, for months after a large share distribution, the moving-average system on an unadjusted chart is essentially unusable.

### 3.2 Classic Accidents From Using the Wrong Convention

- Seeing "the stock fell from 30 to 15" on an unadjusted chart, reading it as a 50% crash and buying the dip — when it was merely a 10-for-10 bonus; the real drawdown may be far smaller than the chart shows;
- A backtest reads unadjusted data; every ex-day is treated as a crash that triggers the stop-loss, systematically depressing the strategy's win rate;
- Computing "how much did it gain in ten years" on unadjusted prices and concluding a high-dividend stock went nowhere — when the true return with dividends reinvested may already have doubled.

---

## 4. A Practical Checklist

Run through this before opening a chart or launching a backtest:

```text
□ 1. Confirm your charting platform's adjustment convention: explicitly select "pre-adjusted"
     (default for charting) or "post-adjusted" (for return math), and know which one is active —
     many platforms default to unadjusted or pre-adjusted, and numbers differ across platforms.
□ 2. Any line or backtest spanning an ex-day must use adjusted data: support/resistance,
     Fibonacci, moving-average systems, and programmatic backtests all run on one
     consistent adjusted series.
□ 3. Reading charts around the dividend date: the price "drop" on the ex-dividend day is
     bookkeeping, not a decline; judge that day's move against the ex-reference price,
     not the previous close.
□ 4. When cross-checking prices across platforms/tools, align the convention before
     comparing numbers: two tools with different conventions can differ by a factor of two
     on the same day.
□ 5. Use post-adjusted data (dividends reinvested) for long-run returns and head-to-head
     comparisons, and keep the "dividend reinvestment" assumption consistent.
```

For the concrete settings and cross-platform differences of charting tools, see [Charting Tools & Market Platforms](../tools-platforms/charting-platforms.md); for the systematic use of indicators, see the [Technical Analysis chapter](../technical-analysis/).

---

## 5. Special Notes for High-Dividend Stocks

1. **The ex-dividend gap is an annual routine**: a stock yielding 5% takes a gap of roughly 5% on its ex-date every year — on an unadjusted chart it gets "chopped" annually and the long-term picture is severely distorted; always view such charts pre-adjusted.
2. **"Filling the gap" vs "drifting below it"**: when the price climbs back over the gap after the ex-date, the dividend was genuinely pocketed (gap-filling); when it keeps sliding, the dividend merely moved money from one pocket to the other. A high-dividend strategy's true return = dividends + gap-filling − gap-drifting; **picking stocks on dividend yield alone ignores the drifting risk**.
3. **Dividend arrival times and taxes**: A-share dividends arrive with a delay, and withholding tax depends on holding period (latest rules prevail); after tax, short-term dividend harvesting may not pay. For fundamentals and valuation methods, see [Stock Analysis Methods](stock-analysis.md).
4. **Do not rush in just before an ex-date**: the ex-event itself creates no value — the market typically marks the price down in step on the ex-day; chasing the stock ahead of the record date to "catch the dividend" is a classic beginner loss pattern.

::: warning ⚠️ Risk Warning
Adjustment conventions, ex-dividend/ex-rights rules, and dividend tax treatment follow the latest rules of the exchanges and tax authorities; historical data may differ or contain errors across platforms. Dividends are not risk-free returns, and high-yield stocks still lose money when the gap fails to fill. This article is for study and research only and does not constitute investment advice.
:::
