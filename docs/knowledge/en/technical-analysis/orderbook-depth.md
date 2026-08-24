---
title: "10 · Order Book & Depth Chart: A Practical Guide"
description: Order book and depth chart interpretation — reading the bid/ask spread, analyzing order book structure, identifying support/resistance from depth curves, spotting iceberg orders and spoofing, and combining order book signals with price action.
---

# 10 · Order Book & Depth Chart: A Practical Guide

> The order book is a real-time list of all pending limit orders waiting to be filled. While candlesticks tell you *where* price went, the order book tells you *why* it could go there — who is blocking the way, who is pushing, and who is bluffing. Learning to read the order book and depth chart is like adding an X-ray machine to your chart, revealing the order-flow battle behind every price move.

::: warning ⚠️ Risk Warning
This article is an objective summary of public market knowledge for educational purposes only and **does not constitute investment advice**. Depth data is typically delayed, and exchanges allow "iceberg orders" to hide true intent. Any judgment based on the order book is a probability estimate, not a certainty. Orders can be canceled in milliseconds — never treat a visible wall of liquidity as a guarantee.
:::

---

## 1. Order Book Basics: Reading the Bid/Ask

### 1.1 Mirror Structure of the Order Book

The order book lists all outstanding limit orders, sorted by price from highest to lowest. It is split into two sides centered around the best bid and ask:

| Term | Meaning | Typical Notation |
|------|---------|-----------------|
| Ask 5–Ask 1 | Sell orders (lowest to highest) | Red, Ask side |
| Bid 1–Bid 5 | Buy orders (highest to lowest) | Green, Bid side |
| Ask 1 / Bid 1 | Best ask / best bid | Spread = Ask 1 − Bid 1 |
| Order size | Total quantity at that price level | Usually in base currency (e.g., BTC) |
| Depth level | Number of visible price levels (5 / 10 / 50) | Deeper levels often require paid data |

**Key intuition**: The bid side is a *support zone*, the ask side is a *resistance zone*. But remember — orders can be canceled at any time. They are not commitments.

### 1.2 The Spread: Three Meanings

**Spread = Ask 1 price − Bid 1 price**, the most direct measure of market liquidity:

| Spread Level | Liquidity | Typical Scenario |
|-------------|-----------|-----------------|
| Very tight (< 0.01%) | Excellent | Major pairs like BTC/USDT, ETH/USDT |
| Moderate (0.01%–0.1%) | Normal | Mid-cap altcoins |
| Wide (> 0.1%) | Poor | Low-liquidity pairs, volatile periods |
| Extremely wide (> 1%) | Very poor | Panic selloffs, flash crashes |

**Practical tip**: A sudden spread widening usually means liquidity providers have stepped back (before major events, news releases, or market panic). Market orders during such periods will incur significant slippage.

### 1.3 Order Book Distribution Patterns

Don't just look at the top bid/ask — examine the **distribution across all visible levels**:

**Steep profile**: The top level(s) have significantly more volume than deeper levels. This indicates a "psychological price level" where bulls and bears are actively battling. A breakout often leads to a rapid directional move.

**Flat profile**: Volume is evenly distributed across levels. The market has no strong price consensus, and price can move relatively smoothly.

**Gap profile**: A price level with zero or near-zero orders. This means price passed through this area quickly and market makers haven't filled the gap yet. Price tends to pass through such gaps quickly again.

---

## 2. Depth Chart: Visualizing the Order Book

### 2.1 Cumulative Depth Curves

A depth chart plots the **cumulative** order book volume sorted by price, producing two curves:

- **Bid side**: Cumulative buy orders from the lowest price to the best bid. The curve slopes upward to the right as price increases.
- **Ask side**: Cumulative sell orders from the best ask to the highest price. The curve also slopes upward to the right.

**Support zone**: Where the bid curve steepens — price would encounter significant buy volume if it falls here.
**Resistance zone**: Where the ask curve steepens — price would encounter significant sell volume if it rises here.
**Weak support/resistance**: Flat sections of the curve — little volume, price can pass through easily.

### 2.2 Three Typical Depth Chart Shapes

| Shape | Bid Curve | Ask Curve | Interpretation |
|-------|-----------|-----------|----------------|
| **Symmetrical deep pool** | Steep | Steep | Thick liquidity on both sides; current price is market consensus |
| **Thick bid, thin ask** | Steep | Flat | Strong support below, weak resistance above — mildly bullish |
| **Thin bid, thick ask** | Flat | Steep | Weak support below, strong resistance above — mildly bearish |

A **symmetrical deep pool** is the healthiest state, showing both buyers and sellers actively providing liquidity near the current price. **Thick bid, thin ask** does not guarantee an upward move — it only shows that there is support below, but active buying pressure (takers) is needed to push price higher.

### 2.3 Practical Depth Chart Applications

**1. Spotting false breakouts**
Price breaks above a technical resistance level, but the ask side of the depth chart shows a thick wall of orders just above — the breakout is likely to fail. A genuine breakout should see the ask wall being *consumed* rapidly (the depth chart level shrinking noticeably).

**2. Estimating slippage**
Before placing a large market order, check the depth chart to estimate the average fill price:
```
Example: Market buy 100 BTC. Ask 1 has 10 BTC → Ask 2 has 20 BTC → Ask 3 has 30 BTC → Ask 4 has 40 BTC → remaining 0 BTC = weighted average entry price.
```

**3. Detecting liquidity drought**
Both depth curves suddenly flattening (all levels have significantly reduced volume) signals a liquidity drought. In this environment, a small order can cause a large price swing — a high-risk trading condition.

---

## 3. Order Book Games: Identifying Order Types

### 3.1 Iceberg Orders

**Signature**: A particular price level repeatedly shows the same quantity being eaten and then replenished. This is a large trader using an iceberg order, hiding their full intent.

**How to spot**: Compare order book snapshots over time. If the top ask level, after being filled, immediately reappears with the same size, it's likely an iceberg.

**Response**: The true size of an iceberg may be many times larger than the visible portion. Do not fight against an iceberg. If you agree with the direction, follow; if not, wait until the iceberg is exhausted (the visible portion stops reappearing after being eaten multiple times).

### 3.2 Walls and Spoofing

**Wall**: An abnormally large order at a specific level (typically 5–10× the normal size).
- **Genuine wall**: Volume stays or decreases slowly as price approaches. The trader genuinely wants to trade here.
- **Fake wall (Spoofing)**: Volume disappears instantly as price approaches. The trader places a large order to create a false impression of support/resistance, hoping to move price in their favor, then cancels and re-places the order.

**How to spot spoofing**:
- Track volume at a level + price movement. Does the order vanish when price gets close?
- Repeated cycles of "large order appears → price moves in the opposite direction → large order disappears"

**Note**: Spoofing is illegal market manipulation in most jurisdictions, but it is technically difficult to eliminate entirely. As a retail trader, identifying it is more useful than reporting it — knowing "that wall might be fake" is enough to avoid a bad trade.

### 3.3 Quote Stuffing

**Signature**: Hundreds of orders and cancellations per second, making the order book data unreadable for a short period.

**Purpose**: To create chaos, confusing algorithmic traders and potentially masking a larger trade.

**Response**: During quote stuffing, the order book is unreliable. Wait for normal conditions before trading, or switch to Time & Sales data to gauge real buying/selling pressure.

---

## 4. Order Book Imbalance Indicators

### 4.1 Bid/Ask Volume Ratio

The ratio of total bid volume to total ask volume across the top N levels:

```
Bid/Ask Ratio = Total bid volume (top 5 levels) / Total ask volume (top 5 levels)
```

| Ratio | Interpretation |
|-------|---------------|
| > 1.2 | Significantly more bids than asks — mildly bullish |
| 0.8–1.2 | Roughly balanced |
| < 0.8 | Significantly more asks than bids — mildly bearish |

**Caution**: Order book volume is not commitment. The ratio can rise while price stays flat — this is often "fake support" where the placing party is merely holding up price while their own sell orders fill.

### 4.2 Depth Imbalance

Compare cumulative volume in a specific price range. For example, cumulative bids within 1% below current price vs. cumulative asks within 1% above:

```
Depth Imbalance = Cumulative bids in 1% below / Cumulative asks in 1% above
```

When depth imbalance reaches extreme values (> 3 or < 0.33), price tends to move rapidly toward the "thin" side — the path of least resistance.

### 4.3 Taker Aggression

**Taker orders** (market orders) execute immediately at the best available price. **Maker orders** (limit orders) wait in the order book.

The **Taker Volume Ratio** measures aggression:

| Taker Ratio | Market State |
|-------------|--------------|
| > 0.6 | Aggressive takers dominate — strong trend |
| 0.4–0.6 | Balanced — indecision / range-bound |
| < 0.4 | Passive makers dominate — hesitant / ranging |

**Practical combo**: When the depth chart shows a steep bid curve (thick support) AND the Taker Ratio is consistently > 0.6 (strong active buying), this is a high-probability long signal.

---

## 5. Combining Order Book with Candlestick Analysis

The order book provides a **stock** perspective (how many orders are waiting), while candlesticks provide a **flow** perspective (what has already traded). They work best together:

| Scenario | Order Book Signal | Candlestick Signal | Combined Reading |
|----------|-----------------|-------------------|------------------|
| Breakout | Ask wall being consumed | Bullish candle breaking resistance, high volume | Genuine breakout — follow |
| Breakout | Ask wall intact | Low-volume candle touching resistance | Fakeout — wait |
| Support | Thick bid volume | Long lower wick, low volume | Support holds — can try long |
| Support | Bid volume withdrawn | Heavy-volume bearish candle breaking support | Support broken — stop out |
| Trend | Ask depth thinning | Consecutive bullish candles, MA uptrend | Healthy trend — hold |
| Trend | Ask depth suddenly thickening | Accelerating bullish candle, high volume | Potential top — reduce position |

### 5.1 A Complete Order Book Analysis Workflow

1. Open the order book / depth chart — check the **spread** (is it normal, < 0.05%?)
2. Compare **Bid 1 vs Ask 1 volume** — which side is thicker, by how much?
3. Check the **distribution profile** across top 5–10 levels — steep, flat, or gapped?
4. Calculate the **Bid/Ask Volume Ratio** — extreme (> 1.5 or < 0.67)?
5. Switch to the candlestick chart — where is price relative to **known support/resistance levels**?
6. Check recent **taker direction** — who has been the aggressor?
7. Make a decision: if all signals align, act; if signals conflict, wait.

---

## 6. Exchange Depth Data Differences

Different exchanges offer varying depth levels and update frequencies. Understanding these differences helps avoid misjudgment:

| Exchange | Free Depth | Paid Depth | Update Frequency | Notes |
|----------|-----------|------------|-----------------|-------|
| Binance | 5 levels | 50–100 levels | 100ms–1s | Highest liquidity; depth data is most reliable |
| OKX | 5 levels | 50–200 levels | 10ms–100ms | Deep levels, customizable merge |
| Bybit | 5 levels | 50 levels | 100ms | Depth divergence from Binance = arbitrage opportunity |
| Coinbase | 10 levels | Full | Real-time push | Regulated market, lower cancellation rate |
| DEX | N/A | N/A | Block-level | On-chain order books differ from CEX; slippage logic is different |

**Recommendation**: Free users should prioritize Binance or OKX top-5 depth, combined with Time & Sales and candlestick charts. Five levels alone are insufficient to detect icebergs or spoofing — higher-frequency incremental data is needed.

---

## 7. Common Pitfalls and Risks

1. **Order book volume is not a commitment**: Every order can be canceled in the next millisecond. Don't assume price can't break through a level just because "500 BTC is sitting at the ask."
2. **Depth charts are snapshots, not continuous**: A lot can happen between two depth snapshots — fills, cancellations, and new orders.
3. **Free depth ≠ full depth**: Five levels only show the surface. The real wall might be at level 10 or beyond.
4. **Don't use order book signals in isolation**: The win rate of order book analysis is much higher when combined with candlestick patterns + volume + order book signals. Never trade on order book data alone.
5. **Exchange data can be manipulated**: Cross-reference with multiple exchanges to reduce the probability of misreading.

---

## Further Reading

- 📖 [Candlestick Patterns](chart-patterns.md) — Classic chart patterns that complement order book support/resistance analysis
- 📖 [Order Flow & Market Microstructure](order-flow-microstructure.md) — A systematic framework for order flow analysis, from tick data to depth
- 📖 [Drawing Tools in Practice](drawing-tools.md) — How to mark order book signals on your chart with horizontal lines, trend lines, and Fibonacci tools
- 📖 [Volume & Price](volume-price.md) — Volume confirmation and divergence, paired with taker aggression indicators