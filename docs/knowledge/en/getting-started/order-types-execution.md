---
title: "Order Types and Execution Mechanics"
description: "Trigger logic for market, limit, stop-market, stop-limit, and OCO orders, the causes of slippage, and handling partial fills, with an illustrated order book depth walkthrough"
---

# Order Types and Execution Mechanics

> The moment you press "Buy" on a trading screen, a chain of events fires: your order enters the matching engine, matches against resting orders on the other side, fills partially or fully, and the remainder either keeps waiting or gets canceled. This article breaks down the trigger logic of every order type so you know **which order to use and when**.
>
> **Disclaimer**: all content on this site is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution.

---

## 1. The Two Basics: Market and Limit Orders

### 1.1 Market Order <KbBadge t="Immediate fill" c="c-teal" />

- **Plain English**: "Fill me now, at whatever price." The system buys or sells immediately at the current best price on the book.
- **One-line example**: BTC best ask is 100,100. You send a market buy; the system fills instantly at 100,100 (or higher, depending on depth).

::: warning ⚠️ Slippage Risk
A market order guarantees volume, not price. In thin markets or large trades, the actual fill price can be far worse than the quote you saw when ordering — this is **<mark>slippage</mark>**. In extreme moves it can reach several percentage points.
:::

### 1.2 Limit Order <KbBadge t="Specified price" c="c-blue" />

- **Plain English**: "Fill me only at my price (or better)." You specify a price; the order can only fill when the market reaches it.
- **One-line example**: you place a BTC limit buy at 99,000. Even with the market at 100,000, your order rests on the book waiting for price to pull back to 99,000.

| Comparison | Market order | Limit order |
|---|---|---|
| Fill speed | **<mark>Immediate</mark>** | Waits for the market to arrive |
| Fill price | Uncertain (slippage) | Certain (or better) |
| Guaranteed to fill | Yes (given enough liquidity) | No (may never fill) |
| Best for | Urgent entries/exits, stop-loss | Patiently waiting for pullbacks, ambush entries |

![Trigger points of order types on a price chart](_assets/order-types.svg)

---

## 2. Conditional Orders: Let the Exchange Watch the Screen for You

### 2.1 Stop-Market Order <KbBadge t="Life saver" c="c-red" />

- **Plain English**: "If price falls to X, sell immediately at market." Used to cap losses.
- **One-line example**: you buy BTC at 100,000 and set a stop at 95,000. When price touches 95,000, the system fires a market sell.

::: danger ⚠️ A Stop-Loss Is Not a Guarantee of Survival
Once triggered, a stop order sends a **market order** — in a violent selloff or flash crash, the actual fill can land far below the stop price. With high leverage, stop slippage can push losses past expectations straight into liquidation. Never assume "I set a stop, so I'm safe".
:::

### 2.2 Stop-Limit Order

- **Plain English**: "If price falls to X, sell at Y or better (Y ≤ X)." Adds a layer of price protection over a plain stop.
- **One-line example**: stop trigger 95,000, limit 94,800. When price hits 95,000, the system places a limit sell at 94,800.
- **The risk**: if price gaps straight through the limit down to 93,000, your limit order never fills and the position stays exposed to the decline.

### 2.3 Trailing Stop

- **Plain English**: "The stop line moves up automatically as price rises, but triggers once price pulls back a fixed distance." Locks in profit while leaving the trade room to run.
- **One-line example**: trailing distance 2%. BTC rallies from 100,000 to 110,000; the stop climbs from 98,000 to 107,800. A pullback to 107,800 triggers the sell.

### 2.4 OCO (One Cancels Other)

- **Plain English**: "Place two conditional orders at once; when one fills, the other is canceled automatically." Typically a take-profit + stop-loss pair.
- **One-line example**: after buying BTC at 100,000, you place a take-profit limit at 105,000 and a stop at 96,000. Whichever triggers first fills; the other cancels automatically.

---

## 3. Advanced Order Types

### Iceberg Order

A large order is split into many small slices with only the "tip of the iceberg" displayed, hiding true intent to avoid triggering market front-running. Common among institutions.

### TWAP (Time-Weighted Average Price)

A large order is spread evenly over time: a small market order every N seconds/minutes, minimizing impact on the market. Common among quant funds.

### Post Only

If the limit order would fill immediately (i.e., take the counterparty's resting order), it is canceled instead of executed. Ensures you only provide liquidity (Maker) and enjoy lower fees.

---

## 4. The Order Book and Matching Mechanics

![Order book depth: how resting buy and sell orders form best bid and best ask](_assets/orderbook.svg)

### 4.1 Order Book Structure

| Term | Meaning |
|---|---|
| Bid 1 | Highest resting buy price |
| Ask 1 | Lowest resting sell price |
| **<mark>Spread</mark>** | Ask 1 − Bid 1; the tighter it is, the better the liquidity |
| Depth | Total resting size across price levels |

### 4.2 Matching Priority

1. **Price priority**: higher bids fill first; lower asks fill first
2. **Time priority**: at the same price, first come, first served
3. **Size priority** (some exchanges): same price, same time — the larger order fills first

### 4.3 Partial Fills

When your order size exceeds the resting size on the other side, you get **partial fills**:

```text
You want to buy 10 BTC
Ask 1 has 3 BTC resting → 3 BTC fill first
Ask 2 has 5 BTC resting → 5 BTC fill next
Ask 3 has 8 BTC resting → 2 BTC fill there
0 BTC remaining → fully filled
```

The average price across the three fills is your **actual average fill price**, which can be noticeably worse than the "Ask 1" you saw on screen. That is where slippage on large market orders comes from.

---

## 5. Fees: Maker vs. Taker

| Role | Behavior | Typical fee |
|---|---|---|
| Taker | Sends market orders or immediately-fillable limit orders; consumes book liquidity | 0.05%–0.10% |
| Maker | Sends limit orders that don't fill immediately; adds liquidity to the book | 0.00%–0.02% |

::: tip 💡 The Core Cost-Reduction Tactic
High-frequency traders deliberately use Post Only limit orders to stay in the Maker tier — the fee gap can reach 5–50x. For active traders, fee differences compound into a huge hidden cost over time.
:::

---

## 6. Practical Cheat Sheet

| Scenario | Recommended order type |
|---|---|
| Urgent buy/sell | Market order |
| Ambush at a specific level | Limit order |
| Cap maximum loss | Stop-market or stop-limit order |
| Set take-profit and stop-loss together | OCO |
| Let profits run but lock in against pullbacks | Trailing stop |
| Reduce impact on large trades | TWAP or iceberg order |
| Lower fees | Post Only limit order |

::: warning ⚠️ Risk Warning
Everything in this article is for learning and research only and does not constitute investment advice. Crypto trading carries high risk; leveraged trading can result in the loss of your entire principal. Decide carefully based on your own risk tolerance.
:::
