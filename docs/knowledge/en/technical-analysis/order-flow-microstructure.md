---
title: "09 · Order Flow and Market Microstructure"
description: "Order flow and market microstructure — candles as results vs. order flow as process, time & sales, order book depth, aggressive buying/selling, and large-order detection"
---

# 09 · Order Flow and Market Microstructure

> Candles are the "result"; **<mark>order flow</mark>** is the "process". A candle tells you what happened this minute/hour; order flow tells you **how it happened**: who is buying aggressively, who is selling aggressively, whether the book has thick walls, whether a large order is a real slam or a fake post. Learning to read order flow is like adding a "microscope" to your chart — you see the buyers and sellers battling behind each candle.

::: warning ⚠️ Risk Warning
This article is an objective compilation of publicly available knowledge, for learning and research only — **it does not constitute investment advice**. Order-flow data (especially tape and depth data) usually requires paid licenses and carries delays; any order-flow-based judgment is only a probabilistic tendency, never a certain signal.
:::


---

## 1. What Order Flow Is: From "Quotes" to "Trades"

### 1.1 Three Layers of Data

Market data comes in three layers, from coarse to fine:

| Layer | Content | Free/paid | Question answered |
|---|---|---|---|
| **Candles/aggregates** | OHLCV aggregates (1m/5m/1h…) | Usually free | "What happened" |
| **Time & Sales** | Per-trade price, size, direction, time | Partly paid | "At what price and size it traded" |
| **Order book** | Posted size and price at each level | Depth levels often paid | "How many more are still waiting to trade" |

**The core raw material of order-flow analysis is the latter two**: Time & Sales tells you "who ate whom"; the order book tells you "how the rest of the battle will be fought".

### 1.2 Aggressive vs. Passive: Taker and Maker

Every trade has an aggressive side and a passive side:

- **<mark>Aggressive side (Taker, hitting the quote)</mark>**: executes immediately against resting orders at the current book; pays higher fees but **fills instantly** — the taker expresses urgency, "I want this trade now";
- **<mark>Passive side (Maker, resting order)</mark>**: posts an order and waits to be hit, usually at lower fees or even rebates — expressing "I'll wait for a better price".

**The core rule for reading direction**: a trade flagged "aggressive buy" means someone **urgently wanted to buy**, willing to pay the taking cost; aggressive sells likewise. **<mark>The net difference between aggressive buys and sells (Delta)</mark> is the first indicator of order-flow analysis**.

---

## 2. The Order Book and Level 2 Depth

### 2.1 From Level 1 to Level 2

| | Level 1 | Level 2 |
|---|---|---|
| Content | Best bid/ask (bid 1 / ask 1) | Multiple book levels (e.g., bids 1–10 / asks 1–10) |
| Shows | The best currently executable price | The distribution of "how much is posted at each level" |
| Use | Judging the **<mark>spread</mark>** and immediate **<mark>slippage</mark>** | Judging the "thickness" of support/resistance, accumulation/distribution signs |

Kline Buty's "Depth" panel shows Level 2-type data: **bid bars on the left, ask bars on the right; the longer the bar, the thicker the posting at that price**.

### 2.2 Book Thickness, Depth, and the **Spread**

- **<mark>Book thickness</mark>**: total posted volume near the best bid/ask. Thick → hard to punch through in a short time; price "stands firm";
- **Depth**: cumulative posted volume away from the current price (e.g., ±1%–3%). Steep segments of the depth chart often correspond to high-volume nodes;
- **Spread**: ask 1 − bid 1. A narrow spread = good liquidity and low trading cost; a suddenly widening spread often signals approaching volatility or withdrawing liquidity.

::: tip 💡 One-Sentence Insight
**<mark>Posted orders are "promises"; executed trades are "facts"</mark>.** A thick wall can be canceled, and cancels can happen in an instant — so depth data must be read as "changes", never just "snapshots".
:::

### 2.3 Order Book Imbalance

Compare posted bid volume vs. ask volume at the same moment:

```text
imbalance = (total bid volume − total ask volume) / (total bid volume + total ask volume)
```

- Significantly positive imbalance → bids dominate; price tends to probe upward short term;
- Significantly negative imbalance → asks dominate; price tends to probe downward;
- **Caution**: posted orders can be canceled anytime. **Postings that keep getting eaten are real demand; postings that just sit there may be bait** (see spoofing in Section 5).

---

## 3. Aggressive Buying/Selling and Delta / CVD

### 3.1 Per-Period Delta and Cumulative Volume Delta (CVD)

- **Delta** = "aggressive buy volume − aggressive sell volume" within a period;
- **CVD (Cumulative Volume Delta)** = all Deltas summed from some starting point into a curve, reflecting **the net flow of aggressive buying/selling over time**.

CVD is used like a volume indicator, but remember its essence:

| CVD behavior | Meaning | Trap to watch |
|---|---|---|
| Price up + CVD making new highs in step | Aggressive buyers driving the rise — "volume with momentum" | Before chasing, confirm the spike isn't one huge single order |
| Price up + CVD not making new highs | Aggressive buyers not following; the rise may be weak | Could be an operator lifting price with small buys while quietly distributing via sells |
| Price flat + CVD draining continuously | Someone is persistently selling aggressively | The sideways action may be "supporting while unloading" |
| Price down + CVD flowing in continuously | Aggressive buyers absorbing below | Could be knife-catching, or accumulation |

### 3.2 Difference from OBV

CVD uses "aggressive direction" (determined by the taker); OBV infers direction from "where the close sits relative to the prior candle" (see [03 · Volume-Price Analysis](volume-price.md)). **CVD is closer to real intent but depends on tape-data quality**; when free feeds lack trade data, use OBV as a rough substitute.

---

## 4. Large Orders, Iceberg Orders, Accumulation and Distribution

### 4.1 The Impact of Large Aggressive Trades

One large aggressive trade instantly eats through multiple book levels, causing a price jump (slippage). Three things to watch about large trades:

1. **Single-trade size**: clearly larger than the instrument's average trade (5–10× the average trade size is a useful reference line);
2. **Direction and price location**: heavy aggressive buying at lows vs. heavy aggressive selling at highs mean completely different things;
3. **What follows**: after the large trade, does price "continue in its direction" or "snap right back"? **Snapping back = the order was absorbed by the counterparty; direction undecided**.

### 4.2 Iceberg Order

To hide intent, big money splits a large order into many small ones, exposing only a fraction — like an iceberg showing only its tip. Clues to spot one:

- The same price level repeatedly shows **identical or near-identical** postings that refill "in place" after being eaten;
- One book level holds a "bottomless" quantity that never finishes filling;
- Time & Sales shows regular, same-size consecutive trades.

**How to respond**: an **<mark>iceberg order</mark>** means someone has a clear directional interest at that level (usually accumulating or controlling distribution) — but it can be a buyer or a seller — **spotting "an operator exists" is not the same as spotting "the operator's direction"**; combine with price location and trade direction.

### 4.3 Order-Flow Signatures of Accumulation and Distribution

| Stage | Price behavior | Order-flow signature |
|---|---|---|
| **<mark>Accumulation</mark>** | Range-bound at lows | Small aggressive sells on dips, thick bid postings; declines quickly absorbed by large buys |
| Markup | Expanding rally | Aggressive buys persistently leading; ask levels eaten quickly |
| **<mark>Distribution</mark>** | Stalling at highs | Price rises but aggressive buy volume decays; after large sell-outs price fails to recover |
| Distribution tail | Breakdown decline | Bid postings "look thick but cancel the moment they're hit" — real absorption is weak |

---

## 5. Order-Flow Tools and Common Indicators

### 5.1 Footprint Chart

Footprint charts expand every candle's trades into a matrix of "price level × buy/sell direction": the horizontal axis is the candle's price range, and each cell shows aggressive buy/sell volume and Delta at that level. **It shows directly "which price level was the main battlefield inside this candle"** — for a candle with a long upper wick, the footprint will show heavy aggressive selling at the upper levels.

### 5.2 Book Imbalance and Cancel Monitoring

- **Book imbalance indicators**: compute the bid/ask posting gap in real time; often used for ultra-short-term entries/exits;
- **Cancel monitoring**: detects "large postings appearing and vanishing quickly". **A large posting that never trades is mostly <mark>spoofing</mark> meant to sway sentiment, not real intent** — illegal in some markets.

### 5.3 Time & Sales

A scrolling per-trade list. The advanced use is **watching "large-trade density"**: within a price band, dense aggressive large buys/sells often form a "high-volume trade band", cross-confirming with candle support/resistance and the volume profile (see [03 · Volume-Price Analysis](volume-price.md)).

---

## 6. Combining Order Flow with Candles and Volume-Price Indicators

Used alone, order flow invites over-interpretation; the right posture is **cross-verification**:

| Scenario | Candle/indicator signal | Order-flow confirmation | Conclusion |
|---|---|---|---|
| Breakout above prior high | Expanding bullish breakout | Aggressive buys surge at the break, ask levels eaten in sequence | True-breakout odds rise |
| Breakout above prior high | Expanding bullish breakout | Price lifted by one large order, aggressive buys decaying right after | Beware false breakout / bull trap |
| Bounce off support | Long lower wick at support | Thick bids at support tested repeatedly without breaking | Support-valid odds rise |
| Bounce off support | Long lower wick at support | Bid postings "cancel the moment they're hit"; real absorption weak | Support may give way |
| MA death cross | Indicators turn bearish | CVD draining in step | Bearish signal strengthened |
| MA death cross | Indicators turn bearish | CVD still flowing in, decline on thin volume | Possibly a false death cross / bear trap |

::: tip 💡 Core Principle
**Core principle: <mark>candles/indicators give the "hypothesis"; order flow gives the "verification"</mark>.** First locate the key level with technical analysis, then watch the real battle at that level through order flow — reversing the order (staring at the tape for daily scalps) easily drowns you in noise.
:::

---

## 7. Limitations and Common Pitfalls

1. **Data cost and delay**: free/low-latency feeds often lack trade direction or depth levels; even paid data's delays discount "real-time". **Making high-frequency calls on delayed data is like reading a stopwatch through sunglasses**.
2. **Fake postings**: spoofing and iceberg orders make the book "look thick" but "eat soft"; snapshot-only readers get fooled;
3. **Single-trade noise**: one large trade may just be institutional rebalancing, not a trend; conclude from **net flow over a period**, not a single print;
4. **Direction labeling depends on the data source**: different sources may classify "aggressive buy/sell" differently; unify the caliber when comparing across platforms;
5. **Order flow is not a holy grail**: it only visualizes the battle process — **it does not answer "up or down next"; it only raises your judgment's win rate**. **Position sizing** and risk control remain fundamental (see the [07 · Trading Systems](../trading-system/) chapter).

---

## Summary

Order-flow analysis boils down to four "watches": **watch aggressive direction (Delta/CVD), watch book thickness (depth), watch large-order behavior (accumulation/distribution/icebergs), watch true vs. fake intent (cancels/spoofing)**. It upgrades technical analysis from "post-hoc description" to "process observation", but it is forever a probabilistic tool — **candles give location, order flow gives process, risk control gives the bottom line**.

::: info 📖 ECG and Health Report
In one sentence: **<mark>order flow is the market's "ECG", candles are the "health report"</mark>** — the ECG reacts fast but is noisy; the health report lags but is more reliable; experts read the two against each other.**
:::

::: tip 💡 Candles Give Location, Order Flow Gives Process, Risk Control Gives the Bottom Line
**Candles give location, order flow gives process, risk control gives the bottom line.** Order flow upgrades technical analysis from "post-hoc description" to "process observation", but it is only a probabilistic tool — it doesn't answer "up or down next"; it only raises your judgment's win rate.
:::

---

## Conventions

- Depth levels, data licensing, and delays described here are generic; defer to each exchange's API policy and each data vendor's terms.
- The Delta/CVD/imbalance formulas follow common teaching conventions; implementation details may differ across platforms.
- Regarding behaviors like spoofing, note: such conduct is illegal in some markets; this article covers recognition and defense only, not operational advice.
