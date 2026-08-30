---
title: "12 · Advanced Indicators: DMI/ADX, Supertrend, BBW"
description: Advanced indicators — DMI/ADX separating direction from trend strength, Supertrend's ATR ratchet band and flip-stop, BBW's volatility squeeze-and-expansion cycle, and how the three combine with existing indicators
---

# 12 · Advanced Indicators: DMI/ADX, Supertrend, BBW

> This article continues [Technical Indicators in Depth](indicators.md) with three advanced tools: <mark>DMI/ADX</mark> (a trend-strength filter), <mark>Supertrend</mark> (a trend-following holding band), and <mark>BBW</mark> (Bollinger Bands Width, a volatility-squeeze detector). Their common point is explicit: **none of them predicts direction — they answer whether the market is worth trading right now and how long you should hold.** That is precisely the part beginners lack most.

::: tip 💡 One-Sentence Summary
One-sentence summary: **Direction, strength, and volatility are three independent dimensions — pick one tool per dimension.** DMI/ADX measures strength, MA/MACD measure direction, BBW measures volatility — treat them as complementary filters, not three conflicting cards.
:::

---

## 1. DMI / ADX: Separating Direction from Strength

### 1.1 How It Works: Three Lines, Three Jobs

DMI (Directional Movement Index) consists of three lines:

| Line | Meaning | Calculation idea |
|---|---|---|
| **<mark>+DI</mark>** | Relative strength of the bullish direction | Smoothed share of up-moves in the day's range |
| **<mark>−DI</mark>** | Relative strength of the bearish direction | Smoothed share of down-moves in the day's range |
| **<mark>ADX</mark>** | Trend strength (directionless) | Moving average of the +DI/−DI spread, 0~100 |

Default parameter: 14 (occasionally a 13/14 pair).

The key design is the third line: **ADX answers only "how strong is the trend," never "which way."** When +DI sits above −DI but ADX turns down, bulls still lead — yet the trend is decaying. This "direction-strength separation" is unique to DMI; neither MA nor MACD can do it.

### 1.2 Core Usage: Classify the Regime First, Then Take Signals

| ADX reading | Market regime | Practical meaning |
|---|---|---|
| ADX > 25 (and rising) | Trending | Trend signals (crossovers, breakouts) deserve full trust; hold with the trend |
| ADX 20~25 | Transition | Discount all signals; reduce position size |
| ADX < 20 | Ranging | Trend signals likely fail; switch to range tactics (fade the edges) or stand aside |
| +DI > −DI | Bulls lead | With ADX rising = a bullish trend environment |
| −DI > +DI | Bears lead | With ADX rising = a bearish trend environment |

Typical workflow: **use ADX as the regime filter first, then look at directional signals.** When ADX < 20, downgrade every MA crossover and MACD breakout by one notch — this directly patches the problem repeated throughout [the indicators article](indicators.md): "all trend indicators fail in ranges." ADX is the gauge that tells you whether you are in one.

### 1.3 Classic Misuses

- **Trading directional signals in ranges**: taking a +DI crossing above −DI as a buy while ADX < 20 — the most classic DMI misuse; such crosses are mostly noise.
- **Treating an ADX peak as a top signal**: ADX lags; it often still rises during the most violent phase of a trend. Falling ADX means strength is decaying, not that direction will reverse now.
- **Using ADX without ±DI**: strength is not direction. The two DI lines are the direction source — you need both.

## 2. Supertrend: The ATR Ratchet Band

### 2.1 Principle and Parameters

<mark>Supertrend</mark> is a single band that wraps around price, built from [ATR](indicators.md):

```text
Base band = midpoint ((H+L)/2) ± n × ATR
Default parameters: period 10, multiplier 3 (i.e., 10/3)
```

**What 10/3 means**: ATR over the last 10 candles measures "how far price moves per bar on average," and the multiplier stretches that average move by 3x for the band distance. A smaller multiplier hugs price and flips often (more signals, more false ones); a larger multiplier sits farther away and is "duller."

### 2.2 The Ratchet Mechanism and the Flip

Supertrend's essence is a one-way <mark>ratchet</mark>:

- **Bullish state**: the band sits below price and **only steps up, never retreats** — as price rises the stop trails upward; as long as a pullback does not touch the band, the bullish state persists.
- **Bearish state**: the band sits above price and only presses down.
- **Flip**: a close crossing the band = state flip. The old state's stop fires and the new state begins. The flip point is a natural **<mark>trailing stop</mark>** reference.

```text
Bullish state (band only rises):
Price    ╱ ╲  ╱╱ ╲
         ╲    ╱       ← pullback never touches the band; state persists
Band   ＿＿＿＿／‾‾   ← trails upward (ratchet)
```

### 2.3 The Right Framing: A Holding Tool, Not a Forecasting Tool

Supertrend does not predict tops and bottoms — it always exits "after the trend has broken," by design rather than defect. Its value is turning the hardest beginner task, "stay in the trade while it trends," into a mechanical rule: **band below → hold; flip → leave.** Using it to catch tops and bottoms is using the wrong tool.

::: warning 🔄 It Gets Chopped in Ranges Too
Supertrend shares SAR's disease: in sideways markets the band flips back and forth, producing strings of small stops. It is not a "blindly follow every flip" indicator — the correct use is "when a trend exists, let it manage the trade." Regime filtering still belongs to ADX-style strength gauges.
:::

## 3. BBW: The Breathing of Volatility

### 3.1 Definition and the Squeeze Logic

<mark>BBW</mark> (Bollinger Bands Width) turns the distance between Bollinger bands into a number:

```text
BBW = (Upper band − Lower band) / Middle band × 100%
```

It answers a single question: "Is current volatility large or small relative to its mean?" From it comes a clear cyclical rhythm — **<mark>squeeze</mark> and expansion alternate**:

```text
Squeeze → breakout nears → expansion (trend starts) → volatility falls → squeeze again → …
```

Volatility never stays compressed forever, nor expanded forever — low volatility precedes high volatility. That is the "breathing rhythm" BBW captures. The classic saying "a squeezed Bollinger band must break out" is exactly what BBW quantifies: instead of eyeballing band width, watch whether the curve presses into its historical lows.

### 3.2 Usage and the Iron Rule

| State | BBW behavior | Meaning |
|---|---|---|
| Deep squeeze | Band width at a very low percentile of recent bars | Breakout outpost: energy is building; wait for direction |
| Breakout start | Width expands fast + price leaves the middle band | Expansion begins; enter in the direction of the move |
| Late expansion | Width at historical highs, then rolls over | The move is tiring; do not chase |

**Iron rule: BBW tells you "it's about to move," never "which way."** After a squeeze price can break up or break down — wait for directional confirmation (a close outside the squeeze range, with volume) before entering. Pre-picking a direction inside the squeeze is gambling.

## 4. How the Three Combine

### 4.1 One Tool per Dimension

Once common indicators are sorted by dimension, the combination principle becomes crisp — **never stack tools within one dimension; combine across dimensions as filters**:

| Dimension | Candidate tools | Covered in |
|---|---|---|
| Direction | MA / EMA / MACD | [Indicators in Depth](indicators.md) |
| **Strength** | **ADX** | This article |
| **Volatility** | **ATR / BBW** | This article (ATR sizes stops; BBW spots pre-breakout squeezes) |
| Trade management | SAR / Supertrend | This article |

**Example stack**: EMA50 sets direction → ADX > 25 confirms a trending regime → enter after a deep BBW squeeze breaks out → the Supertrend band serves as the trailing stop. Four roles, no redundancy — no tool is doing another's job.

### 4.2 Anti-Patterns

| Wrong combination | Why it fails |
|---|---|
| MACD golden cross + +DI crossing above −DI both treated as the buy | Both describe "direction/momentum" — a fake double confirmation |
| Supertrend flip + SAR reversal stacked | Two same-role holding tools: duplicated signals with different stops, pure confusion |
| BBW squeeze + ADX < 20 and immediately long | Only "it's about to move" was confirmed — direction was never confirmed |

::: tip 💡 Recall the Combination Principle
"One tool per dimension, validation across dimensions" holds for advanced tools too — and even more strictly, because advanced tools describe abstract dimensions (strength, volatility) where same-dimension stacking produces subtler confusion.
:::

::: warning ⚠️ Risk Warning
DMI/ADX, Supertrend, and BBW are all computed from historical prices and lag by nature; the ADX thresholds (25/20) and Supertrend parameters (10/3) are common defaults, not optima, and performance varies widely across instruments and timeframes. Every filter fails in certain regimes, and parameter optimization is prone to overfitting — validate with backtests and small positions first.
:::
