---
title: "01 · Option Pricing and Volatility: Where Prices Come From, and How to Tell If They're Expensive"
description: "The options basics article only gave you the formula premium = intrinsic value + time value. This article answers three deadlier questions: how is that number actually computed…"
---

# 01 · Option Pricing and Volatility: Where Prices Come From, and How to Tell If They're Expensive

> The options basics article only told you the formula "**<mark>premium</mark>** = **<mark>intrinsic value</mark>** + **<mark>time value</mark>**". This article answers three deadlier questions: **how exactly is that number computed? Why is an option that "looks cheap" sometimes astronomically expensive? And how do you tell whether an option is actually overpriced?**
>
> The answer hinges on one word: **volatility**. The entire art of option pricing is putting a price on "future movement."

---

## 1. Option Value Composition: Intrinsic Value + Time Value

![Option price breakdown: intrinsic value + time value](_assets/option-premium.svg)

An option's price (the premium) has only two halves:

```text
Option price = intrinsic value + time value

Intrinsic value: money you could pocket by exercising right now (the ITM portion)
Time value: what you pay for "future possibilities"
```

| Component | Definition | Exists When | Determined By |
|---|---|---|---|
| **Intrinsic value** | max(spot − **<mark>strike price</mark>**, 0) for Calls / max(strike − spot, 0) for Puts | Only in-the-money options have it; zero for OTM | The gap between the underlying's spot price and the strike (certain) |
| **Time value** | Option price − intrinsic value | As long as time remains | **Volatility, remaining time, distance from the strike** (uncertain) |

Numeric example: a stock trades at 100; a Call with strike 95 quotes at 7.5:

- Intrinsic value = 100 − 95 = **5.0**
- Time value = 7.5 − 5.0 = **2.5**
- If the stock is still at 100 at expiry, the option is worth only 5.0 → **all 2.5 of time value evaporates**

::: tip 💡 Key Insight
**Intrinsic value is the "certain present"; time value is the "uncertain future."** The buyer pays 2.5 for "the possibility that the stock keeps rising" — and for possibility to become money, the stock actually has to move.
:::

---

## 2. Time Value = Volatility Value

If the market expected **zero future movement** in some underlying, time value should be exactly zero — because "tomorrow's price = today's price," there are no future possibilities, and options would be meaningless.

So a more accurate statement is:

```text
Time value ≈ volatility value + (a little) remaining-time premium
```

- **Higher expected volatility** → wider range of possible future prices → more money you could make → more expensive time value
- **Lower expected volatility** → narrower price range → cheaper time value

Intuition: a stock that might swing ±30% over the next 30 days versus one that might swing ±3% — the same-strike Call commands premiums several times apart. **The difference isn't direction; it's movement.**

> Corollary one: **buying options = buying volatility; selling options = selling volatility.** You trade not only direction but also "movement." This explains why many buyers lose money even when they call the direction correctly (not enough movement).

::: tip The Bottom Layer of Options Trading
**Buying options = buying volatility; selling options = selling volatility.** You trade not just direction but "movement" — which explains why many buyers who call the direction correctly still lose: right direction, insufficient movement, loss anyway.
:::
>
> Corollary two: OTM options = **pure volatility** (intrinsic value is zero; the whole price is time value). That makes OTM options the cleanest window into "the market's expectation of movement."

---

## 3. Black-Scholes Intuition: Five Inputs

In 1973 the Black-Scholes formula delivered a closed-form solution to option pricing — its creators won a Nobel Prize. But in practice you **don't need to memorize the formula**, only grasp the sentence behind it:

> **Option price ≈ volatility × remaining time × distance from the strike**, fine-tuned by the underlying's price and interest rates.

The five inputs:

| Input | Effect on Call Price | Intuition |
|---|---|---|
| **Underlying price S** | Rises → more expensive (Puts reverse) | The closer spot is to the strike and the further above it, the higher the intrinsic value |
| **Strike K** | Further from spot → cheaper | The harder a level is to reach, the smaller the possibility |
| **Remaining time T** | Longer → more expensive | More time means more paths to reach the strike |
| **Risk-free rate r** | Higher rate → Call more expensive | A Call is "delayed payment for stock" — it saves interest (tiny effect on short-dated options) |
| **Volatility σ** | Bigger → more expensive (same direction for Call/Put) | More movement, greater chance of an explosive move |

Of these, **the first four are basically "known facts"** (underlying price, strike, expiry, rate are all determined), **and only volatility must be guessed**. That's why the entire options industry studies "what should this volatility be?"

```text
Option price ≈ f(underlying price, strike, remaining time, rate, volatility)
                          └──────── known ────────┘  └─ the only thing you guess ─┘
```

### Three Intuition Examples (fictional numbers)

1. **Same Call, 5 days vs 60 days left**: the 5-day is roughly "will tomorrow be up?"; the 60-day is roughly "will there be a decent move in the next two months?" The latter costs far more.
2. **Same time left, strike 100 vs strike 120**: with spot at 100, the 120 Call needs a 20% rally just to profit — low probability, hence cheap.
3. **Same contract, IV 20% vs IV 40%**: doubling the volatility expectation can make the option 2–3x more expensive — **the most powerful of the five inputs, and the one beginners overlook most easily**.

> Practical reminder: nearly every broker platform shows the **live IV for each contract on the option chain**. You don't need to compute Black-Scholes yourself, but you absolutely must know how to read "what IV corresponds to the current price."

<OptionCalc />

---

## 4. Implied Volatility IV: Market Expectation Reverse-Engineered from Price

**<mark>Implied volatility</mark> (IV)** is the volatility figure you get by plugging the **real market price of the option** back into the Black-Scholes formula.

- Known: underlying price, strike, remaining time, rates (all determined)
- Known: the option's current traded price
- Back out: what volatility assumption would make the formula output equal the market price? That volatility is the **IV**

So IV is not "computed historical data" — it is **the market's expectation of future movement, voted on with real money**:

| Comparison | Meaning | Decided By |
|---|---|---|
| **Historical volatility (HV)** | How far the underlying actually moved over the past 30/60 days | Past facts |
| **Implied volatility (IV)** | How much the market thinks it will move | Everyone's present expectations + supply/demand |

- High IV → the market expects violent movement ahead (panic, euphoria, major events) → options trade expensive
- Low IV → the market expects calm → options are cheap

::: info 📖 Sentiment-Pricing Example
A stock normally trades at IV 25%; before earnings it spikes to 60%. The same option before versus after earnings can differ twofold in price — **while the stock itself hasn't moved an inch**. That is "sentiment pricing."
:::

---

## 5. IV and Option Prices

The rule is extremely simple: **IV up = options get pricier (Calls and Puts together); IV down = options get cheaper.**

| Scenario | IV Change | Option Price | Buyer | Seller |
|---|---|---|---|---|
| Before a major event (earnings/FOMC/elections) | Rising | Everything gets pricier | Buying expensive, betting on the event | Selling happily, harvesting IV premium |
| After the event lands | **IV Crush (sharp drop)** | Collapses | "Right on direction, losing money anyway" — a double kill | Quickly harvests the falling IV |
| Panic selloff | Sharply up | OTM Puts become sky-high | Chasing insurance gets brutally expensive | Collects sky-high premiums but carries tail risk |
| Quiet range-bound drift | Slow decline | Steadily cheaper | Ground down daily | Collects rent daily |

**The classic trap: the IV Crush "double kill."** Buy an option before earnings betting on direction; the event lands, you're right on direction, but uncertainty evaporates, IV falls overnight from 60% back to 20%, and the option drops anyway — **you made money on direction but lost it on volatility.**

::: danger The IV Crush Double-Kill Trap
**You made money on direction but lost it on volatility.** Buy an option before earnings, get the direction right, but IV collapses overnight from 60% to 20% — the option price falls anyway. Before buying any option, ask yourself "is IV high right now?" — buying when IV is high is buying volatility at a high price.
:::

```text
Before the event: option price = intrinsic value (low) + time value (IV 60%, very expensive)
After the event:  option price = intrinsic value (rose)   + time value (IV 20%, collapsed)
Net effect: possibly still a loss
```

> One sentence: **before buying an option, ask yourself "is IV high right now?" — buying when IV is high means buying volatility at a top price; even a correct direction may come to nothing.**

---

## 6. The Volatility Surface: Smile and Skew

Spread out the IVs of "one underlying × all strikes × all expiries" and you get a three-dimensional surface called the **volatility surface**.

### 6.1 The Volatility Smile

With strikes on the horizontal axis and IV on the vertical, many markets draw a **smile curving upward at both ends**:

```text
IV
 │                      ★
 │                    ★   ★
 │                 ★        ★
 │              ★             ★
 │         ★                    ★
 │    ★                            ★
 └─────────────────────────────────────▶ Strike
   OTM Put     ATM          OTM Call
```

- IV is lowest near the money (ATM)
- The further toward ITM/OTM extremes, the higher the IV (especially on the OTM Put side)

**Why are tails expensive?** Because extreme events (black swans) occur **more frequently than normal-distribution models assume**. The market has been burned and will pay extra for "insurance against rare catastrophes" — so OTM Puts are expensive; in essence, **tail risk carries a price tag**.

### 6.2 Volatility Skew

The most common shape in equity/index options is **one-sided skew**: the left side (low strikes / OTM Puts) shows clearly higher IV than the right side (high strikes / OTM Calls).

```text
IV
 │              ★
 │            ★
 │         ★
 │       ★
 │     ★
 │   ★
 └─────────────────────▶ Strike
 low K (OTM Puts pricey)  high K (OTM Calls cheap)
```

| Market | Typical Shape | Cause |
|---|---|---|
| **Stocks / equity indices** | Left high, right low (skew) | Crashes are more frequent than melt-ups; "insurance" (Puts) is perpetually bought up |
| **FX / some commodities** | Both ends up (smile) | Extreme moves happen in both directions (currency de-pegs, oil-price shocks) |
| **Crypto** | High overall, big swings | Booms and busts are both extreme, drifting violently with sentiment |

::: tip 💡 Practical Meaning of the Surface
**"Expensive OTM Puts" is the market norm.** Either accept the expense (insurance was never cheap), or don't speculate with costly OTM Puts — that's paying the market a "panic premium."
:::

---

## 7. Judging Whether IV Is High or Low

"Is IV 25% high or low?" — **there is no absolute answer**; judgment rests on three references:

### 7.1 IV Percentile (Most Important)

Pull 2–3 years of IV history for an underlying, sort it, and see where current IV sits historically:

| Current IV Position | Meaning | Practical Implication |
|---|---|---|
| Below the historical **20th percentile** | Extremely cheap (market expects unusual calm) | Buyer's window: options are good value; selling them isn't |
| Historical **50th percentile (median)** | Normal level | Neither cheap nor dear — weigh other factors |
| Above the historical **80th percentile** | Extremely expensive (panic/euphoria) | Seller's window: sell options to harvest IV premium; buyers shouldn't chase |

### 7.2 The HV–IV Gap (IV/HV Premium)

- **IV > HV**: the market expects more movement than the past showed (normal — options' insurance property keeps IV slightly above HV)
- **IV − HV notably elevated**: overheated sentiment, options overpriced, sellers favored
- **IV well below HV**: the market expects calm ahead (or options are mispriced cheap) — buyers favored

> Traders watch the **IV/HV ratio**: above 1 means IV carries a premium, below 1 a discount.

### 7.3 Rules of Thumb for Absolute Levels

| Absolute IV Level | What It Means for Most Stocks/Indices |
|---|---|
| **IV ≈ 20%** | Mild: ~20% annualized movement, calm-normal market, mid-priced options |
| **IV ≈ 30–40%** | Elevated tension: major events or trending moves; options getting expensive |
| **IV ≈ 60%+** | Panic-grade: e.g., US stocks March 2020, major crises; options absurdly expensive (OTM Puts become "sky-high insurance") |
| **IV 100%+** | Extreme panic / extreme crypto conditions: option prices are almost pure tail bets; ordinary strategies offer no value whatsoever |

::: info 📖 "Normal IV" Varies by Underlying
**Different underlyings have entirely different "normal IV" levels** — bank stocks sit around 15–20%, growth stocks 40–60%, Bitcoin 50–100%. Comparing absolute IV across instruments is meaningless; **compare percentiles only within the same underlying.**
:::

---

## 8. IV Characteristics Across Markets

| Market | Typical IV Level | IV Characteristics | Practical Impact |
|---|---|---|---|
| **Broad equity indices** (SPX/SSE 50) | 15–25% normal; 40–80% in panics | Pronounced skew, expensive OTM Puts; VIX is their "IV index" | Most participants sell index options or trade **<mark>spreads</mark>**; retail buyers must guard hard against IV Crush |
| **Single-stock options** (AAPL/TSLA etc.) | Growth 40–70%, blue chips 20–40% | IV spikes pre-earnings, crushes after; stock-specific "event IV" | The core battlefield of event-driven trading; buying Calls before earnings is a common loss source |
| **Commodity options** (soybean meal/crude/gold) | Agri 15–30%, energy 30–60% | Driven by supply/demand, weather, inventories, geopolitics; strongly seasonal (planting/maintenance seasons push IV up) | Sellers must watch fundamentals for "sudden supply shocks" |
| **Crypto options** (BTC/ETH) | Normally 40–80%, extremes >100% | Highest and fastest-drifting anywhere; options almost entirely time value | A volatility trader's paradise and its most dangerous corner; IV mean-reverts extremely fast — buyers struggle to hold |

> Memory hook: **IV correlates with "uncertainty."** Index uncertainty comes from macro, single stocks from earnings, commodities from supply/demand, crypto from everything. First judge how much uncertainty your market carries and when events land; then ask whether IV is expensive.

---

## Risk Warning

::: warning ⚠️ Risk Warning
Option pricing and volatility are the **foundation** of options trading — and also where retail traders stumble most often:

**① The IV illusion**: selling whatever looks "expensive" and buying whatever looks "cheap" is the classic mistake of treating IV level as a buy/sell signal. IV level indicates expensiveness, not direction — high IV can go higher (panic deepens), low IV can go lower (calm until death). **Expensiveness is not a forecasting tool.**
**② The IV Crush double kill**: buy an option before an event, get the direction right, yet lose as IV collapses. Every purchase requires assessing "could my entry IV get crushed?"
**③ Tail positioning**: the volatility surface tells us tail risk is priced richly, but that does NOT mean "selling OTM Puts is safe" — **rich pricing ≠ small risk**. It only says the market will pay dearly for insurance, and the insurance seller's obligations are real.
**④ Data conventions**: every IV figure, percentile, and skew shape here is a teaching illustration. Different platforms/brokers compute IV differently and use different data sources, so values will differ. **Defer to your own trading software's live data.**

This article is not investment advice. Volatility is the soul of options trading — and the concept that destroys retail traders fastest. **Do not place an order before you have thought volatility through.**
:::


---

## Summary

- Option price = intrinsic value + time value; **time value is fundamentally volatility value**
- Of Black-Scholes' five inputs, underlying price/strike/time/rate are known facts — **only volatility must be guessed**
- IV is the market's expectation of movement backed out from prices: **IV up, options dearer; IV down, cheaper**
- The volatility surface shows smile/skew: **tail risk is priced expensively by the market** (OTM Puts stay pricey year-round)
- To judge IV: check **historical percentiles**, the **IV/HV gap**, and absolute levels with per-instrument common sense
- IV differs enormously across markets: **compare percentiles within one underlying only — never compare absolute values across instruments**
