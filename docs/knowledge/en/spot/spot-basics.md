---
title: "01 · Spot Trading Basics"
description: "Spot trading basics — the definition of spot, the order flow, four order types, fee structures, and indirect ways to short spot, all in one place"
---

# 01 · Spot Trading Basics

> Spot is the most primitive and simplest form of trading: cash for goods, hand to hand.
> You pay and immediately receive the underlying asset itself (stocks, coins, commodities) — no shares to return, no expiry date, no forced liquidation.
> This article walks through the complete logic of spot trading, from definition to order placement, fees, and even how to "short spot indirectly".

---

## 1. What Is Spot

**Spot** is a way of trading in which both parties exchange cash for goods and transfer ownership of the physical/financial asset immediately (or within a very short time). Once you buy, the asset truly belongs to you — you can hold it for 1 second or 10 years, with no forced deadlines of any kind.

Compare it with the spot deals most familiar to you:

| Spot instrument | What you actually buy | Common venues |
|---|---|---|
| Spot gold | Gold bars / paper gold | Banks, gold shops |
| Spot forex | Foreign currency cash or account balances | Bank counters |
| Stock spot | Company shares (T+1 settlement) | Stock exchanges |
| Crypto spot | The coins themselves (on-chain or exchange balances) | Exchanges: CEX/DEX |
| Commodity spot | Physical soybeans, crude oil | Spot wholesale markets |

### Key Characteristics of Spot

- **Real transfer of ownership**: once bought, the asset is yours — you owe nobody anything.
- **No leverage**: 1 dollar buys only 1 dollar's worth of goods; your maximum loss is your principal.
- **No expiry date**: there is no "delivery day" — you decide.
- **No forced liquidation**: however far the price falls, you can never be "**<mark>liquidated</mark>**"; at worst you carry an unrealized loss.
- **Sources of return**: the **<mark>spread</mark>** from buying low and selling high + income generated while holding (dividends, interest, staking, etc.).

### Spot Is the Foundation of All Other Trading

Futures, perpetuals, options, and **<mark>arbitrage</mark>** are all essentially derivative games played around the "spot price". Only by understanding spot can you understand why, in derivatives, "some people are willing to pay a premium" and "some people need to hedge".

---

## 2. Spot vs Futures: One Table Says It All

| Dimension | Spot | Futures |
|---|---|---|
| What is traded | The underlying asset itself | Contracts for future delivery |
| **<mark>Leverage</mark>** | None (full payment) | Yes (**<mark>margin</mark>** system, typically 5-20x) |
| Delivery | Instant settlement, instant transfer of ownership | Fixed delivery date (or daily/periodic settlement) |
| Shorting | Cannot short directly; indirect means such as securities lending needed | Open a short position directly |
| Holding period | Unlimited | Must close or roll before expiry |
| Liquidation/**<mark>forced liquidation</mark>** | None | Margin shortfall triggers forced liquidation; the entire principal can be lost |
| Risk level | Maximum loss = purchase cost | Theoretical loss can exceed principal (**<mark>negative balance</mark>**) |
| Capital tied up | Full amount | Only the margin (**<mark>leverage</mark>** amplifies both return and risk) |
| Typical instruments | Stocks, crypto spot, paper gold | Index futures, commodity futures, crypto perpetuals |

> One-line summary: **spot is "buying groceries", futures is "signing an order"**. With groceries, the money is spent on the spot and what you buy is yours forever; with an order you only pay a deposit, price moves are settled on the full contract value, and if the direction is wrong the deposit is wiped out — and you may even owe more.

::: tip 🛒 Spot groceries vs futures orders: one comparison decides everything
**Spot is "buying groceries", futures is "signing an order" — with groceries, the money is spent on the spot and what you buy is yours forever; with an order you only pay a deposit, price moves are settled on the full contract value, and if the direction is wrong the deposit is wiped out and you may even owe more.** For beginners, starting with spot essentially means starting from "owning an asset", not from "betting on contracts".
:::

---

## 3. The Complete Spot Buy/Sell Flow (Exchange Example)

The following uses a typical centralized exchange (crypto CEX) as the example; the flow at stock brokerages is nearly identical, with only an extra "bank-broker transfer" step.

### Complete Flowchart

```text
Register / identity verification → deposit / fund the account → transfer to the spot account
    → place an order (limit / market / stop-loss / take-profit)
    → matching and execution → assets credited (position / available)
    → sell / withdraw → funds out to the bank card
```

### Step 1: Registration and Identity Verification

- Choose a compliant exchange/broker and register an account.
- Complete identity verification (KYC) as required by the platform — usually an ID document and facial recognition.
- Crypto note: some platforms are region-restricted; using a VPN with non-real-name operation is a **violation of the rules** and leaves your funds completely unprotected. See [03-Crypto Spot](crypto-spot.md).

### Step 2: Funding

| Instrument | Funding method | Arrival time |
|---|---|---|
| A-shares | Bank-broker transfer (trading days only, 9:00-16:00) | Instant |
| HK/US stocks | Bank wire / broker-linked card deposit | 1-3 business days |
| Crypto CEX | Fiat purchase (OTC) / on-chain deposit | Minutes (on-chain requires confirmations) |

> ⚠️ Funding does only two things: **verify the channel works and verify the funds are yours**. Before any large deposit, run a small test transfer and confirm it arrives before scaling up.

### Step 3: Order Placement and Execution

1. Open the trading page and pick the trading pair (e.g. BTC/USDT, AAPL).
2. Choose the order type (limit / market, see the next section).
3. Enter price and quantity; check the estimated cost of "fill price + fees".
4. Click buy; the order enters the matching engine.
   - A **<mark>limit order</mark>** rests on the order book waiting for a counterparty; a **<mark>market order</mark>** fills immediately at the opposing side's price.
5. Once filled, the asset enters your "positions"; unfilled limit orders stay in "open orders" (you can cancel them manually).

### Step 4: Selling and Withdrawal

- Selling mirrors buying; the cash proceeds go into your "available balance".
- Withdraw to your bank card (in crypto: cash out to fiat or withdraw coins to an on-chain wallet); watch the fees and withdrawal limits.

### Common Terms Quick Reference

| Term | Meaning |
|---|---|
| Best bid / best ask | Highest **<mark>bid price</mark>** / lowest **<mark>ask price</mark>** on the order book |
| Fill price | The price at which the order actually matched |
| Open order / cancel | An unfilled limit order / canceling that order |
| Depth | Order volume resting on the book; the thicker the depth, the harder the price is to push through |
| **<mark>Slippage</mark>** | The gap between the actual fill price and the expected price (obvious for large orders or low **<mark>liquidity</mark>**) |

---

## 4. The Four Order Types

| Order type | Meaning | Execution logic | Use case | Drawback |
|---|---|---|---|---|
| Limit order | Buy/sell at a specified price | Fills only when price reaches your specified level | Entering/exiting at a clear price; resting orders to catch pullbacks | May never fill |
| Market order | Fill immediately at the current best opposing price | Fills in seconds | Racing the clock (news moves, breakout moments) | Slippage; large orders may get a poor price |
| **<mark>Stop-loss</mark>** order (Stop) | Sell at market once price breaks below/above the trigger | Executes at market immediately after trigger | Controlling losses, avoiding deep traps | It is a market order after the trigger; the fill can be far worse in extreme moves |
| **<mark>Take-profit</mark>** order (Take Profit) | Sell once price reaches the target | Auto-fills at the target | Locking in profit, quitting while ahead | May sell too early and miss a further rally |

### Combined Usage Example

```text
Buy: limit order resting at 100
Downside protection: stop-loss trigger at 90 (loss capped at 10%)
Target: take-profit trigger at 130 (profit locked at 30%)
```

- Stop-loss/take-profit is **the only automated risk control in spot**, ideal for those who cannot watch the market.
- Advanced usage: trailing stop — as price rises, the stop price moves up with it, locking in against **<mark>drawdown</mark>**.
- Some platforms support binding a "stop-loss + take-profit order pair" to the same position; whichever side is hit, the position is closed automatically.

> ⚠️ Risk Warning: a stop-loss order does not guarantee the fill price. In a flash crash, trading halt, or liquidity drought, the market order triggered afterward may fill far below the trigger price (slippage can exceed 10%). A stop-loss is "a tool to cap the maximum loss", not "insurance against losing".

---

## 5. The Fee Structure of Spot Trading

### 1. Trading Fees (Commission)

| Type | Typical rate | Notes |
|---|---|---|
| Maker fee | 0.02%-0.1% | You rest a limit order and provide liquidity; cheaper on most platforms |
| Taker fee | 0.05%-0.15% | You take existing orders off the book; more expensive on most platforms |
| Brokerage commission | About 0.025% for A-shares; a few dollars per trade for HK/US stocks | Varies widely by market; watch for minimum fees |

> Crypto platforms usually charge "trade value × fee rate" directly; brokerages also levy stamp duty, transfer fees, etc. (A-share stamp duty is 0.05% on sells).

### 2. Other Costs

| Cost | When it occurs | Rough standard |
|---|---|---|
| Withdrawal / cash-out fee | Withdrawing to a bank card or withdrawing coins | Crypto charged by on-chain Gas; bank wire tens of CNY per transfer |
| Deposit fee | Fiat funding | Mostly free; wires incur intermediary bank fees |
| Funding fee (perpetuals) | Not in spot; perpetuals only | Does not exist in spot |
| **<mark>Spread</mark>** | An implicit cost on every trade | The gap between bid and ask; wide for thin books |

### 3. How Fees Eat Returns

- **High-frequency trading is the hardest hit by fees**: in-and-out all day at 0.1% per side can consume more than 10% of your principal in a year.
- The formula for true cost:

```text
True cost per trade ≈ spread + fees + amortized withdrawal fee
```

- Strategically: the higher your trade frequency, the more you need a low-fee platform, more resting limit orders (Maker rate is lower), and VIP/VIP0 discounts.

---

## 6. Indirect Ways to Short Spot

Spot has no native "short" button — without holding the asset, you cannot sell it. But the following methods achieve "profit when price falls":

### 1. Securities Lending (Borrow and Sell)

- **Mechanism**: borrow the asset from a broker/platform, sell it, buy it back cheaper later to return it, and keep the difference.
- **Cost**: borrowing interest (a few to tens of percent annualized) + trading fees.
- **Risk**: if the price rises, losses are theoretically unlimited, and the broker may force you to buy back (a short squeeze).
- **Barrier**: A-shares require margin trading permission (500,000 CNY threshold + margin exam); borrowing in HK/US stocks and crypto is more relaxed.

### 2. Buying Puts / Selling Calls

- **Mechanism**: buy a put option — the more the underlying falls, the more you earn; maximum loss = the **<mark>premium</mark>**.
- **Advantage**: loss is capped (only the premium), and no borrowing is needed.
- **Drawback**: **<mark>time value</mark>** decays; even if the underlying does not fall, the premium bleeds away.
- **Fit**: those worried about a short-term drop who want to **<mark>hedge</mark>** position risk.

### 3. Inverse ETFs (Overseas Markets)

- HK/US markets have inverse ETFs (e.g. `SQQQ`, which shorts the Nasdaq index); buying it equals shorting the index.
- Note: inverse ETFs suffer daily **<mark>compounding</mark>** decay — **only suitable for short-term holding**; long holding is guaranteed to underperform the theoretical value.

### 4. Shorting Futures (Strictly Speaking, Not Spot)

- Opening a short directly in the futures/perpetual market is derivatives territory, with **leverage and forced-liquidation risk combined** — not recommended as a shorting tool for spot traders. See [03-Futures](../futures/).

| Method | Maximum loss | Barrier | Cost | Fit |
|---|---|---|---|---|
| Securities lending | Theoretically unlimited | High (margin account, 500,000 CNY threshold) | Borrowing interest | Professional investors |
| Put options | Limited to premium | Medium | Premium + time decay | Holders with hedging needs |
| Inverse ETF | Limited to principal | Low | Compounding decay | Short-term bears |
| Shorting futures | Can exceed principal (liquidation) | Low | Fees + funding | High risk tolerance (use with caution) |

> ⚠️ Risk Warning: the number one source of losses for spot investors is "opening futures just to short". Shorting inherently carries leverage thinking (borrowed shares, premiums, inverse products); once the direction is wrong, losses accumulate far faster than a spot buy. **Do not attempt any shorting before you fully understand the margin mechanism.**

---

::: warning ⚠️ Risk Warning
⚠️ Although spot trading is the lowest-risk form, the following risks remain:

1. **Asset going to <mark>zero</mark> risk**: a listed company delisted, a coin's team absconding, commodities spoiling — the price can hit zero and the principal is lost entirely.
2. **Platform risk**: an exchange/broker going bankrupt, absconding, being hacked, or maliciously freezing accounts (especially unregulated offshore platforms).
3. **Liquidity risk**: small-cap instruments have thin depth; a large sell order can crash the price or even fail to find a buyer.
4. **Operational risk**: mistapping a market order, forgetting to set a stop, leaking passwords, entering a wrong address.
5. **FX and funding risk**: when investing across markets, currency swings and frozen deposits can erode all returns.

Spot does not amplify risk, but it **never eliminates it**. Before buying any asset, assess first: would losing 100% of this money affect my life?
:::
