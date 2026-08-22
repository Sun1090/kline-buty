---
title: "02 · Trading Core Concepts"
description: "A dictionary of trading terms — leverage, margin, liquidation, order book, slippage, market orders, limit orders; each with a plain-language explanation, a one-line example, and a worked calculation"
---

# 02 · Trading Core Concepts

> This article is the "dictionary" of trading terms: every button and every column of numbers on a market terminal is explained here. Each concept comes with a **plain explanation + a one-line example**, plus worked calculations — do them by hand at least once.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution.

---

## 1. Direction: Long and Short

### Long / Going Long <KbBadge t="Most basic" c="c-teal" />

- **Plain explanation**: You expect prices to rise. Buy first, sell later, and pocket the difference.
- **One-line example**: You buy BTC at 100 and sell at 110, earning 10 — that is going long.

### Short / Going Short <KbBadge t="Needs **<mark>leverage</mark>** / margin lending" c="c-amber" />

- **Plain explanation**: You expect prices to fall. Borrow the asset and sell first, buy it back cheaper later to return it, and keep the difference.
- **One-line example**: You borrow BTC and sell at 100, buy it back at 90 to return it, earning 10 — that is going short.

![Long vs. short: the complete loop of a trade](_assets/market-side.svg)

::: tip 💡 Iron rule of long and short: every buy needs a sell; every gain needs a loss
Only futures, perpetuals, margin lending and similar markets support shorting; plain A-share spot trading restricts it. In crypto perpetuals and futures, longs and shorts are a pure zero-sum contest — **when someone wins, someone loses**. Zero-sum (plus fees) is not "bad luck"; it is a structural fact.
:::

---

## 2. Money Terms: Leverage, **<mark>Margin</mark>**, **<mark>Liquidation</mark>**

### Leverage

![Leverage = a borrowed magnifier: it scales both P&L and liquidation risk](_assets/leverage.svg)

- **Plain explanation**: Borrowed money multiplies your capital, letting a small stake control a much larger **<mark>position</mark>**. 10x leverage means you put up only 1/10 of the contract value.
- **One-line example**: With 1,000 of capital and 10x leverage you control a 10,000 position; a 1% price rise earns 10% on your capital.

### **<mark>Margin</mark>**

- **Plain explanation**: The "deposit" collateral you post to the exchange when opening a leveraged position, used to absorb losses.
- **One-line example**: A 10,000 contract at 10x leverage requires 1,000 of margin to open.

### Liquidation / **<mark>Forced Liquidation</mark>**

- **Plain explanation**: The price moves against you, losses eat most of your margin, and the exchange **force-closes your position** to stop losses from growing.
- **One-line example**: Long at 10x leverage; a 10% drop wipes your margin to **<mark>zero</mark>** and the system liquidates the position — **your capital is gone**.

---

::: danger ⚠️ Leverage is a double-edged sword — liquidation can wipe out all your capital
- Leverage amplifies gains and **amplifies losses by the same multiple**: at 10x, a 10% adverse move liquidates you.
- After liquidation the margin is zero; in extreme moves (wick spikes, gaps) you can even end up with **<mark>negative balance</mark>** (owing the exchange).
- Default advice for beginners: **no leverage, or start at an ultra-low 2–3x**, and keep positions small enough that a total wipeout is survivable.
- Treat every "guaranteed profit" or "high leverage to the moon" pitch as a scam by default; see [Pitfalls](../pitfalls/).
:::

---

## 3. Market Structure: **<mark>Liquidity</mark>**, **<mark>Spread</mark>**, **<mark>Slippage</mark>**

### Liquidity

- **Plain explanation**: The depth and activity of resting orders in the market. Good liquidity = someone always takes the other side, fills are fast, and price impact is small.
- **One-line example**: BTC trades thousands of times per second with dozens of order-book levels — the most liquid asset; an obscure altcoin trades a few times a day, and selling means waiting in line for a buyer.

### Bid-Ask Spread

![The order book: level 1 / level 2, ask / bid, **<mark>bid price</mark>** / **<mark>ask price</mark>**](_assets/orderbook.svg)

- **Plain explanation**: The gap between the bid (the highest price others will pay) and the ask (the lowest price others will sell at). The spread is the "toll" you pay when liquidity is thin.
- **One-line example**: The book shows bid 100.00 / ask 100.02, a 0.02 spread — a market buy instantly loses 0.02.

### Order-Book Terms: Level 1/2, Ask/Bid, Buy Price/Sell Price

That block of "bid 1 / ask 1, bid 2 / ask 2…" numbers on the side or bottom of a market terminal is the **order book** made visible. Nail down these terms before reading it:

| Chinese label | Standard term | Meaning |
|---|---|---|
| 卖一 / 一档卖价 | Best Ask / Ask¹ | **The lowest sell order right now** — "the cheapest someone will sell at" |
| 买一 / 一档买价 | Best Bid / Bid¹ | **The highest buy order right now** — "the most someone will pay" |
| 卖二 / 买二（二档） | Ask² / Bid² | Second-lowest ask / second-highest bid, then level 3, 4… onward |
| 卖盘 / 卖单墙 | Ask side | Everyone with resting sell orders above |
| 买盘 / 买单墙 | Bid side | Everyone with resting buy orders below |
| 一档 / **<mark>五档</mark>** / 十档盘口 | Level | How many price levels the terminal shows at once (1/5/10 levels) |
| 买入价 | Bid price | The price you actually get when you **sell** now (filled against best bid) |
| 卖出价 | Ask price | The price you actually pay when you **buy** now (lifting the best ask) |

::: warning 🎚 The order book is a snapshot — it changes in milliseconds
**Levels are a snapshot: the book is "one instant of a live refresh" and can be completely different tens of milliseconds later.** When trading off the book, only the moment you click the button counts; never be fooled by depth from a few seconds ago.
:::

**Four iron rules (memorize them to dodge the traps):**

1. **"Buy price" ≠ "sell price"**: the terminal's "buy/sell price" is the **counterparty's** price — buying pays the best ask, selling takes the best bid. The gap is the spread, one of your trading costs.
2. **Thicker level 1, faster fills**: heavy size on best bid/ask (the book numbers) is consumed instantly by a **<mark>market order</mark>**; a thin level 1 lets one order punch through several levels and price jumps violently.
3. **Levels are a snapshot and they change**: the book is "one instant of a live refresh"; tens of milliseconds later it may all be different. Trade off the book as it stands the moment you click.
4. **The book can be faked**: spoof walls and pull-the-bid games are routine — see the market-manipulation section of [Market Ecosystem](../market-ecosystem/).

### Slippage

- **Plain explanation**: The gap between the expected fill price and the actual fill price; most visible for market orders that are large relative to liquidity.
- **One-line example**: You market-buy 10,000 units at an expected 100, but ask-side depth is thin and the average fill is 100.5 — the extra 0.5 you paid is slippage.

---

## 4. Orders: Market Orders, **<mark>Limit Orders</mark>**, **<mark>Stop-Loss</mark>** and Take-Profit

### Market Order

- **Plain explanation**: Buy/sell immediately at the best currently available price. **Guarantees execution speed, not price.**
- **One-line example**: Market-dumping in a crash can fill several points below the book price you were looking at.

### Limit Order

- **Plain explanation**: Rest an order at a chosen price; it fills only if the price reaches it. **Guarantees price, not execution.**
- **One-line example**: You rest a buy at 95 for BTC; if price never drops to 95 it never fills — the order can just hang there.

### Stop-Loss and **<mark>Take-Profit</mark>** Orders

- **Plain explanation**: Pre-set exit prices; when triggered the position closes automatically. The stop-loss caps your maximum loss; the take-profit locks in gains.
- **One-line example**: Long at 100 with a stop at 95 and a target at 115 — worst case -5%, best case +15%, and the system handles the rest.

::: tip 💡 A stop-loss is a life vest, not a white flag
**A stop-loss is not "giving up after a loss" — it is the life vest that keeps you in the game.** Every Trading System article will repeat it: set the stop before the target. See [Trading System](../trading-system/).
:::

---

## 5. P&L Calculation: Points, Percentages, Contract Face Value

### Points / Ticks

- **Plain explanation**: The minimum unit of price change; futures and index traders speak of "how many points" it moved.
- **One-line example**: The Shanghai Composite rising from 3500 to 3520 is "up 20 points".

### Percentage P&L (Spot Basis)

Spot P&L formulas:

```text
P&L = (Sell Price - Buy Price) × Quantity
P&L % = (Sell Price - Buy Price) ÷ Buy Price × 100%
```

<details>
<summary>📖 Click to expand: full worked spot P&L example</summary>

- Buy 2 BTC at 100,000 → cost 200,000
- Sell at 110,000 → profit (110,000 - 100,000) × 2 = **20,000**
- P&L % = 10,000 ÷ 100,000 × 100% = **10%**
- If it drops to 90,000 and you stop out → loss (90,000 - 100,000) × 2 = **-20,000**, i.e. **-10%**

</details>

### Percentage P&L Under Leverage

```text
Leveraged P&L % = Underlying price change % × Leverage multiple
```

**Worked example:**

- Capital 10,000, 10x leverage, position 100,000
- Price +3% → profit 3% × 10 = **30%**, i.e. 3,000 (vs. capital)
- Price -3% → loss **30%**, capital down to 7,000

### Contract Face Value / Notional

- **Plain explanation**: Underlying quantity per contract × unit price — "how much this contract is worth"; the basis for margin and P&L math.
- **One-line example**: A futures contract with a 10-tonne multiplier at 5,000/tonne → face value = 10 × 5,000 = **50,000**; at 10% margin = 5,000 per contract.

> Crypto perpetual face-value conventions differ across exchanges (coin-margined vs. USDT-margined, contract-size conversions). Before ordering, always check what "1 contract = how much BTC" means; see [Crypto Perpetuals](../crypto-perpetuals/).

### Breakeven Price

- **Plain explanation**: The exit price at which you neither gain nor lose = entry price + fees + **<mark>funding rate</mark>** (for perpetuals). **After costs, a rising price does not guarantee profit.**
- **One-line example**: Buy at 100 with 0.3 total fees → breakeven is 100.3; selling at 100.15 looks like +0.15 but is actually a loss.

---

## 6. One-Table Review

| Concept | One-line memory hook | Common mistake |
|---|---|---|
| Long / short | Long = buy first, sell later, betting up; short = sell first, buy back, betting down | Assuming shorting is just "trade in reverse and win" |
| Leverage | Borrowed money scaling the position | Only picturing amplified gains, forgetting amplified losses |
| Margin | The deposit posted to open | Assuming margin = maximum loss (it is roughly, not exactly) |
| Liquidation / forced liquidation | Losses eat the margin; the system force-closes | Assuming "hold and it will come back" — liquidation waits for no one |
| Liquidity | The depth of buyers and sellers | Market orders of large size in thin altcoins → brutal slippage |
| Order book (bid/ask levels) | Live resting orders bid 1~N / ask 1~N | Reading "buy price/sell price" as the price you will get |
| Asks / Bids | Ask side / bid side; Ask¹ = lowest ask, Bid¹ = highest bid | Ignoring the spread = forgetting a trading cost |
| Bid-ask spread | The gap between bid and ask | Forgetting the spread causes "in the red on entry" |
| Slippage | Actual fill ≠ expected fill | Estimating fills off the top of book, ignoring depth |
| Market / limit | Market guarantees a fill, limit guarantees a price | Resting limit orders that never fill in a fast market |
| Stop-loss / take-profit | Automatic exit lines | Stops set too tight getting wicked out — or no stop at all |
| Contract face value | How much one contract is worth | Confusing "one contract" with "one coin" |
| Breakeven price | The true cost basis after all fees | Only looking at the price gap, ignoring fees |

---

## 7. Three Action Tips for Beginners

::: danger 💀 Three questions you must answer before opening
1. **What is the leverage multiple?** — How much adverse movement blows you up?
2. **Where is the liquidation point?** — Compute it with the formulas above and write it down.
3. **Where is the stop-loss?** — An order without a stop is sprinting barefoot through a minefield.

**If you cannot answer these three questions, you should not open that trade.**
:::

1. **Treat fees as a real cost**: in frequent short-term trading, fees plus spread often eat most of the profit — see the breakeven price section.
2. **Practice the math with small money first**: on any new exchange or feature, start with the smallest possible position and verify every formula above once.

::: warning ⚠️ Risk Warning
**Leverage is the most dangerous word in this article: at 10x, a 10% adverse move zeroes your capital. Verify every formula on a demo account or with a minimum position first — never "learn while you compute" with real money.**
:::
