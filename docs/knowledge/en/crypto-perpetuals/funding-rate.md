---
title: "02 · Funding Rates"
description: "Crypto perpetual funding rates explained — positive vs negative rates, the 8-hour settlement mechanism, typical ranges, rate arbitrage in extreme markets, and holding cost control"
---

# 02 · Funding Rates

> Perpetual swaps have no delivery date, so what keeps the price glued to spot? The answer is the **<mark>funding rate</mark>**.
> It is the periodic "toll" settled between longs and shorts — the cost retail traders overlook most easily, and the one long-term holders should watch most closely.

> ⚠️ **Risk Warning: the funding rate is a double-edged sword.**
> It is what "anchors" the contract price back to spot, but in extreme markets it can go absurdly high — in the late stage of a bull market, simply holding a position and doing nothing can bleed your principal at a daily rate.
> The rules below follow the latest terms of major exchanges such as Binance and OKX.

---

## What Is the Funding Rate

![Funding rate: longs and shorts pay each other when the contract price deviates from spot](_assets/funding-rate.svg)

Perpetual swaps have no "expiry date", hence no "convergence at expiry" mechanism. To keep the contract price tracking spot over the long run, exchanges invented the funding rate:

- **The funding rate is a periodically settled payment**, exchanged between longs and shorts;
- Its direction is set by the deviation between "contract price vs spot price":
  - Contract price > spot price → longs pay shorts (dousing the heat of longs buying expensive);
  - Contract price < spot price → shorts pay longs (propping up the pressure of shorts selling cheap);
- Funding fees **do not belong to the exchange**; they only move between the long and short sides, with the exchange acting as settlement agent.

In one sentence: **the funding rate = the "price tension" that keeps the perpetual price close to spot over time.**

| Concept | Description |
|---|---|
| Interest component | A base interest rate (an exchange-specific constant, usually about 0.01%/8h) |
| Premium component | Determined by how far the contract price deviates from the spot index price |
| Funding rate = interest + premium | Together they form the rate for one settlement |

> Simplified view: **whoever pushes the price away from spot pays the other side.** The bigger the deviation, the higher the rate and the larger the payment — until someone gives up and the price reverts.

---

## 8-Hour Settlement and Settlement Times

Major exchanges (Binance, OKX, Bybit, etc.) generally settle funding **once every 8 hours**:

| Time zone | Settlement times |
|---|---|
| UTC | 00:00 / 08:00 / 16:00 |
| Beijing time (UTC+8) | **08:00 / 16:00 / 00:00 (early next day)** |

- Each settlement pays/receives **the then-current position notional value × the funding rate**;
- Only traders who **still hold a position at the settlement moment** pay or receive funding; closing before settlement costs nothing;
- Some exchanges/coins cap the funding rate (a common default cap of about ±0.75%, with some coins temporarily raised by the exchange in extreme markets) — always check the exchange's latest announcements.

```text
Example: holding 1 BTC perpetual, funding rate 0.01%, position notional 60,000 USDT
Funding per settlement = 60,000 × 0.01% = 6 USDT
3 settlements a day = 18 USDT/day (if you are on the paying side)
```

> Settling every 8 hours means **1,095 settlements a year**. A 0.01% rate per settlement looks trivial, but compounded it is a cost — or income — that long-term holders cannot ignore.

---

## Positive and Negative Rates

| Rate sign | Who pays whom | Market state usually accompanying it |
|---|---|---|
| **Positive (+)** | Longs → shorts | Contract price > spot price; bullish sentiment crowded with longs |
| **Negative (−)** | Shorts → longs | Contract price < spot price; bearish sentiment crowded with shorts |
| 0 | No payment | Contract and spot prices basically aligned |

- **Positive funding rate** = too many traders are long and the contract is more expensive than spot; the exchange makes longs pay to "cool things down";
- **Negative funding rate** = too many traders are short and the contract is cheaper than spot; shorts pay longs;
- Note: **being long does not mean you always pay**. In downtrends the contract often trades at a discount to spot, and longs actually collect funding; likewise, shorting in a frenzied market can earn rich funding payments.

---

## Typical Funding Rate Ranges

| Range (per 8 hours) | State | Meaning |
|---|---|---|
| ±0.01% ~ ±0.03% | Normal | Tiny deviation; balanced long/short forces; healthy market |
| ±0.03% ~ ±0.10% | Warm | Clearly one-sided sentiment; holding costs become visible |
| Above ±0.10% | Overheated | Extreme one-sided crowding; a reversal can come at any time |

Converting to annualized terms for intuition:

```text
0.01%/8h × 3 times/day × 365 days ≈ 10.95% annualized (one-way payment)
0.05%/8h × 3 times/day × 365 days ≈ 54.75% annualized
```

- So even a "normal" ±0.01% means paying more than 10% annualized in funding over a year one-way — **for anyone holding long through a persistent futures discount/premium, this cost is real**.

---

## Funding in Extreme Markets

In late-stage bull markets and short squeezes, funding rates blow far past the normal ranges:

| Scenario | Funding rate behavior | Consequence |
|---|---|---|
| Late-stage bull market | BTC funding stays above 0.1%/8h; some coins print **0.5%~1%+** per settlement | **<mark>Leveraged</mark>** longs get "shaved" by funding daily; the spot-contract spread widens |
| Short squeeze | Shorts cornered; the rate spikes above 0.1% short-term | Late shorts lose money and pay funding at the same time |
| 2021 bull market | BTC perpetual funding stayed above 0.1% for long stretches, exceeding 1% at some moments | Perpetual longs bore annualized funding costs well above 100% |

```text
Extreme example: at a funding rate of 1%/8h, holding a position for 8 hours costs 1% of notional
3 times a day = 3%/day, one week ≈ 21%
```

- **What a 1% single funding payment means**: park the position for 3 days and funding alone can eat more than half of your principal;
- Extreme funding rates are often **a signal of peak sentiment**: when retail is one-sidedly long and the contract premium over spot is absurd, a price reversal is usually not far away;
- Exchanges temporarily raise the funding cap in extreme markets (e.g. from 0.75% to 1.5% or higher) to speed the price back to spot.

> ⚠️ **Risk Warning: do not blindly chase longs when the rate is overheated.**
> The most common harvest script in late-stage bull markets: contract premium → rate spikes above 0.1% → beginners chase and buy perpetuals → price dips slightly while high funding keeps being charged → the chasers get hit from both sides.
> **High rate + high price = high euphoria = high risk.** When you see a 0.1%+ rate, first figure out whether you are the fisher or the fish.

---

## Funding Rate Arbitrage

The funding rate is essentially "compensation for the contract price deviating from spot", so it naturally breeds one strategy: **spot + perpetual hedge** to collect funding (also called "funding rate / **basis** arbitrage").

### Principle

```text
When the funding rate is positive (longs pay shorts):
① Buy 1 BTC in the spot market (hold spot, enjoy the price move)
② Short 1 BTC in the perpetual market (exactly the opposite direction)
→ Whichever way the price goes, the two legs offset each other (delta neutral)
→ You still collect funding on the short leg every 8 hours (positive rate = longs pay shorts; the short side receives)
```

### Returns and Costs

| Item | Description |
|---|---|
| Return | Funding per settlement (about 0.01%~0.05% of notional) |
| Cost | Spot purchase cost, contract fees, capital tied up (spot requires full funding) |
| Annualized estimate | 0.01%/8h ≈ 10% annualized; 0.05%/8h ≈ 54% annualized (fees excluded) |
| Typical setup | Exchange spot + the same exchange's perpetual (same coin) |

### Risk Points

| Risk | Description |
|---|---|
| Rate flips negative | After the market turns, funding goes negative and the arbitrage loses in the other direction |
| Spread volatility | If the contract-spot spread widens short-term, the book shows a floating loss (patience needed to wait for convergence) |
| **<mark>Liquidation</mark>** risk | If the contract leg is force-closed, only a naked spot long/short remains; risk is amplified |
| Capital efficiency | Spot requires full funding, diluting the yield |
| Platform risk | Exchanges restrict arbitrage accounts, change rate rules, or delay deposits/withdrawals |
| Extreme markets | Wicks force-close the contract leg while spot liquidity dries up; the hedge breaks |

> ⚠️ **Risk Warning: funding rate arbitrage is not risk-free income.**
> It earns "sentiment money" — essentially **monetizing retail FOMO**.
> But in extreme markets, spot and contracts swing violently together, liquidations and liquidity crunches strike at once, and the so-called "risk-free arbitrage" can turn into a "double **<mark>liquidation</mark>**". Small capital, big leverage, all-in style arbitrage is especially dangerous.

---

## How to Read and Use the Funding Rate

### Where to Find It

| Channel | Location |
|---|---|
| Binance | Futures trading page → top-right "Funding Rate" / contract info panel |
| OKX | Futures trading page → Trading Parameters → Funding Rate |
| Third-party sites | Coinglass, Laevitas, etc. (historical rates and long/short ratios) |
| Market apps | Most crypto market apps show live funding rates on the contract details page |

### How to Use It: Reading Market Sentiment

| Rate state | Sentiment read | Practical meaning |
|---|---|---|
| Persistently high (0.05%+) | Retail longs overheated; longs crowded | Chasing longs is dangerous; watch for a pullback |
| Extremely high (0.1%+) | Peak sentiment, peak FOMO | Historically often marks cycle tops |
| Persistently low / negative | Shorts crowded; contract at a discount | Short side crowded; watch for a rebound/squeeze |
| Normal range (±0.01%~0.03%) | Long/short balance | Neutral sentiment |

### Practical Pointers

- **Read it with the long/short ratio**: funding rate + long ratio both elevated makes the overheat signal more reliable;
- **Read it with price location**: sideways price at highs + high rates = top behavior; rates turning negative after a crash = one bottom behavior;
- **The turn matters more than the level**: a fast slide from +0.1% often means longs are retreating;
- **Settlement games**: some scalpers close 5 minutes before settlement to dodge or attack funding, causing brief price moves at settlement times.

::: warning ⚠️ Risk Warning
The funding rate is an auxiliary indicator, not a trading signal.
High rates can persist for weeks (in a bull market, "expensive can get more expensive"), and low rates do not mean an immediate reversal.
Treat it as a "sentiment thermometer", not a "reversal traffic light" — and always protect yourself with a **<mark>stop-loss</mark>**.
:::


---

## Summary

| Point | One sentence |
|---|---|
| What the funding rate is | A periodic payment between longs and shorts that anchors the perpetual price |
| Settlement frequency | Every 8 hours on major exchanges (UTC 0/8/16) |
| Positive rate | Longs pay shorts; contract at a premium; longs crowded |
| Negative rate | Shorts pay longs; contract at a discount; shorts crowded |
| Typical range | ±0.01%~0.03% |
| Extreme cases | 0.1%+ or even 1% in late-stage bull markets — a marker of overheated sentiment |
| Arbitrage play | Spot + contract hedge to harvest positive rates, with rate-flip and liquidation risks |
| Sentiment use | Persistently high rates = retail longs overheated; be careful chasing longs |

> The next article, [03-Crypto Derivatives](crypto-derivatives.md), tours options, leveraged tokens, dual investment, and other advanced products — many of them priced on top of funding rates and volatility.

::: danger 💀 High Rate + High Price = High Euphoria = High Risk
**High rate + high price = high euphoria = high risk. When you see a 0.1%+ rate, first figure out whether you are the fisher or the fish.** The most common harvest script in late-stage bull markets: contract premium → rate spikes above 0.1% → beginners chase and buy perpetuals → price dips slightly while high funding keeps being charged → the chasers get hit from both sides.
:::
