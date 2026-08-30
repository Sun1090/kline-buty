---
title: "16 · Sentiment Indicators Panorama: Fear & Greed, Long/Short Ratio, and PCR"
description: "A panorama of sentiment indicators — how the Fear & Greed Index is built and read in reverse, account-based vs position-based long/short ratios, the options-market meaning of the Put/Call Ratio, and the correct use of sentiment: sizing positions, never timing entries"
---

# 16 · Sentiment Indicators Panorama: Fear & Greed, Long/Short Ratio, and PCR

> Sentiment indicators do not measure "whether price will rise or fall"; they measure "how impulsive everyone else is right now". **When everyone is impulsive, impulsiveness itself stops being valuable.** This article covers the three most common sentiment thermometers — the Fear & Greed Index, the long/short ratio, and the Put/Call Ratio (PCR) — and their one correct use: adjusting position size, never deciding entries.

---

## 1. The Nature of Sentiment Indicators

### 1.1 They Measure "Crowdedness"

Short-term price movement is jointly determined by "people already in" and "people not yet in":

- When most potential buyers have already bought, the market's remaining inhabitants are mostly potential sellers — the fuel for further upside is spent;
- When most potential sellers have already sold, panic has been fully released and any buying can move price — the soil for a rebound forms.

**<mark>Sentiment indicators</mark>** are the thermometer strapped to this "crowdedness". They do not predict tomorrow's direction; they tell you **how euphoric or how desperate the crowd is at this moment**.

### 1.2 The Contrarian Meaning Matters More Than the Directional Meaning

Because sentiment extremes tend to appear late in a move (chasers are most euphoric at tops, capitulators most desperate at bottoms), the primary use is **contrarian reference** — the founding insight of <mark>contrarian investing</mark>: "be greedy when others are fearful" sounds easy, but you first need numbers to define "how fearful is fearful". That is precisely what sentiment indicators are for.

> **In one sentence: a sentiment indicator is a position dial, not a steering wheel.** It answers "how large should this position be", not "should I enter, and in which direction".

---

## 2. The Fear & Greed Index

### 2.1 Construction and Reading

The Fear & Greed Index was originally created by CNN for US stocks and later ported to crypto by data sites. It normalizes several components onto a **0-100** scale:

| Range | Meaning | Typical market state |
|---|---|---|
| 0-24 | Extreme fear | After a crash, doom everywhere, everyone calling for bear |
| 25-44 | Fear | Mid-pullback, wait-and-see mood |
| 45-55 | Neutral | Bulls and bears in balance |
| 56-75 | Greed | Uptrend under way, profits spreading |
| 76-100 | Extreme greed | Parabolic top, everyone posting gains, media canonization |

The crypto version's common components include volatility, trading volume, social media heat, market-cap dominance (BTC dominance), and trend; the US-stock version includes price strength, breadth, demand for puts versus calls, and more. **Each platform uses different components and weights, so readings are not directly comparable across platforms.**

### 2.2 Extreme Readings as Contrarian Reference

- **Extreme greed (75+)**: historically clustered near stage tops — not "it will fall now", but "the odds have worsened": potential return shrinks while potential drawdown grows. The corresponding action is trimming and tightening trailing exits, not liquidating or shorting.
- **Extreme fear (below 25)**: mostly the late stage of a crash — the odds for batch accumulation improve, but **it must be paired with a fundamental judgment of "what to buy"**. An asset in fear may be cheap — or genuinely breaking.

### 2.3 A Daily Sentiment Reading Is Not an Entry Timer

The Fear & Greed Index is a **daily-resolution thermometer**, while entry timing needs signals at the hour or minute scale. Using "the index is 22 today" to decide "buy at 14:30 today" is like picking your departure minute with a thermometer — the tool's granularity does not match the question's granularity. Its correct granularity is: **tuning total position exposure on a weekly cadence**.

---

## 3. The Long/Short Ratio

### 3.1 Two Different Definitions in the Futures Market

The <mark>long/short ratio</mark> comes from **<mark>futures/derivatives</mark>** markets and comes in two common flavors with entirely different meanings:

| Flavor | What it counts | How to read it |
|---|---|---|
| Long/short **account** ratio | number of long accounts ÷ number of short accounts | Where the retail crowd stands |
| Long/short **position** ratio (top traders / whole market) | long open interest ÷ short open interest | Where real money is committed |

The two often diverge: accounts may be 70% long while the position ratio sits near 1 — a few large players are short while the many are fully long. **Read the definition first, then look for divergence.**

### 3.2 Extreme One-Sided Values Are Contrarian Signals

When the account ratio reaches an extreme (say 4:1 or worse on one side), one direction is packed with people: when the market turns, unwinding on the crowded side feeds on itself, producing the accelerating moves of a **<mark>short squeeze</mark>** or **<mark>long liquidation cascade</mark>**. That is the mechanism behind "extreme retail positioning → amplified counter-move".

### 3.3 It Counts Accounts, Not Smart Money

Two limits to remember:

1. **Headcount ≠ capital**: the account ratio counts people; ten thousand $100 retail accounts do not outweigh one nine-figure account;
2. **The crowd being counted is not the smart money**: profitability and crowd membership are negatively correlated over the long run — this is both the source of the ratio's contrarian meaning and the reason it can serve only as reference, never as a decision rule.

---

## 4. PCR: The Put/Call Ratio

### 4.1 The Options Market Prices Emotion Directly

<mark>PCR</mark> (Put/Call Ratio) = put volume (or open interest) ÷ call volume (or open interest). In the options market, buying puts expresses "afraid of a fall" and buying calls expresses "afraid of missing out", so the PCR directly reads out the collective bet of derivatives participants.

| Market | Common reference | Notes |
|---|---|---|
| US stocks | CBOE Put/Call Ratio (total vs equity/index flavors read separately) | Public data, long history; the classic band is roughly 0.6-1.1 (verify against the latest data definition) |
| A-shares | PCR of the 50ETF / 300ETF / CSI 300 index options | Few products, a special participant mix; calibrate the band against the product's own historical percentiles |
| Crypto | PCR on options platforms such as Deribit | Smaller market; extreme readings carry relatively less meaning |

### 4.2 What Extreme Values Mean

- **Extremely high PCR** (heavy insurance-buying against a fall): panic has been fully priced; historically often a bottoming zone — cross-confirming the "extreme fear" reading in section 2.2;
- **Extremely low PCR** (almost nobody buys protection): complacency, common in the late stages of an advance — a market without insurance takes the maximum damage from bad news.

> Concrete numeric bands shift with market structure and product rules; calibrate against the **product's own historical percentiles** before use rather than copying textbook numbers.

---

## 5. The Correct Use: Adjust Positions Only, Never Enter on It

### 5.1 Three Rules of Use

```text
① Extreme greed → only subtract: cut total exposure, tighten trailing stops, stop opening new positions.
② Extreme fear → only add, and in batches: buy planned assets on a preset schedule;
   going all-in at once is misuse — fear can always become more fearful.
③ Divergence with price matters more: price makes a new high while the sentiment indicator
   fails to (emotion did not confirm) — a stronger top hint than the reading alone;
   the mirror image holds near lows after a crash.
```

### 5.2 How It Fits With Other Tools

Sentiment indicators provide **context**, not **signals**:

| Layer | Question answered | Example |
|---|---|---|
| Sentiment indicator | How impulsive is the crowd now? | Fear & Greed at 85 → tighten exposure |
| Technical analysis | Where is price? | Near a key resistance/support or not |
| Trading plan | What exactly do I do? | Trim ratio, batch schedule, stop level (see the [Trading Systems chapter](../trading-system/)) |

The order is always: the plan sets the frame, technicals set the location, sentiment sets the water level. Reversing it — letting sentiment pick entry points — is using a thermometer as a steering wheel.

---

## 6. Common Misuse

### Misuse 1: Treating Sentiment as a Timer

"Full-position bottom-fishing whenever the Fear & Greed Index drops below 20" — extreme fear can persist for weeks or months, and the index can go numb at low levels for a long time. The bottom-fishers get buried first. **Extremes change the odds, not the timing; timing belongs to your plan and technical levels.**

### Misuse 2: Deciding on a Single Indicator

Fear & Greed, long/short ratios, and PCR each have long failure stretches, and their definitions can be changed by the platforms that publish them. Any single sentiment indicator offers a probabilistic hint, not a trading signal. **Require at least two independent gauges to agree (say, a sentiment index plus the options PCR), and even then let them act only at the "position sizing" layer** — that is the correct way to use these tools. For how emotion hijacks your own judgment, see the [Behavioral Finance chapter](../behavioral-finance/).

::: warning ⚠️ Risk Warning
Sentiment indicators are statistical references, not forecasting tools; extreme readings can persist for a long time and contrarian trades based on them can still lose money. Index components, statistical definitions, and options product rules may change at any time — refer to the latest official documentation. This article is for study and research only and does not constitute investment advice; futures and options trading can lose more than your principal — participate only with money you can afford to lose.
:::
