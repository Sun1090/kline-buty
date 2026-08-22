---
title: "01 · Perpetual Swaps"
description: "Crypto perpetual swaps explained — what a perpetual swap is, USDT-margined vs coin-margined contracts, cross vs isolated margin, liquidation price calculation, leverage risk, and how to avoid liquidation"
---

# 01 · Perpetual Swaps

> The perpetual swap (Perpetual Contract / Perp) is the most popular derivative in the crypto market: trading volume routinely exceeds spot, markets are open 24/7, and **<mark>leverage</mark>** can reach 100x or more.
> It has no delivery date and no expiry — one contract can be held all the way until "**<mark>liquidation</mark>**" — which is exactly the warning retail traders hear most often in the perpetual market.

> ⚠️ **Risk Warning: perpetual swaps are the No. 1 disaster zone for retail blow-ups.**
> Crypto trades 365 days a year, 24 hours a day; late-night wicks (instant, violent price moves) and extreme conditions can trigger **<mark>forced liquidation</mark>** of a high-leverage position within seconds.
> For every "100x miracle" there are countless accounts whose positions went to **<mark>zero</mark>**. **Do not open a single leveraged position before you understand <mark>margin</mark>, the liquidation price, and the <mark>funding rate</mark>.**
> All rules in this article follow the latest terms of major exchanges such as Binance and OKX; formulas are general teaching versions.

---

## What Is a Perpetual Swap

One-sentence definition: **a perpetual swap = a futures contract with no delivery date.**

Regular futures (see the futures chapter) have an expiry date and must be delivered at expiry (physically or in cash), which is why positions must be "rolled". A perpetual swap has no expiry and can theoretically be held indefinitely, sparing you the rolling trouble.

But it must solve one key problem: **with no delivery price as an anchor, why should the contract price track the spot price?**

Traditional futures rely on "convergence at expiry" to keep the price near spot; perpetual swaps rely on two mechanisms:

1. **Funding rate** — longs and shorts periodically pay each other, "pulling" the price back toward spot when it drifts (see [02-Funding Rates](funding-rate.md));
2. **Mark price** — settlement and liquidation prices are computed from benchmarks such as the spot index price, preventing the contract price from being manipulated (see below).

In short: a perpetual swap ≈ a futures-style margin-and-leverage system + a funding-rate anchoring mechanism in place of delivery.

---

## Perpetuals vs Dated Futures

| Dimension | Perpetual swap | Dated futures (current/next quarter) |
|---|---|---|
| Expiry | None; can be held indefinitely | Fixed expiry (e.g. quarter-end) |
| Delivery | No delivery; rolls on forever | Physical/cash delivery at expiry; positions must be rolled |
| Price anchoring | Funding rate + mark price | Natural convergence to spot at expiry |
| Main liquidity | Always the main market, best depth | Liquidity dries up as delivery approaches |
| Suited for | The vast majority of traders; intraday/swing | Those needing to lock forward prices; institutional hedgers |
| Funding rate | Yes, settled periodically | None (the spread shows up directly in the contract price) |

> Conclusion: 99% of retail crypto contract trading happens on perpetual swaps. Dated futures are used mainly by institutions for hedging or "calendar spreads".

---

## USDT-Margined vs Coin-Margined

Perpetual swaps fall into two families by margin/settlement currency, instantly recognizable on any trading interface:

| Dimension | USDT-margined (USDT-M, linear) | Coin-margined (COIN-M, inverse) |
|---|---|---|
| Contract size | Denominated in coin (e.g. 1 contract = 0.001 BTC) | Denominated in USD (e.g. 1 contract = 100 USD) |
| Margin/P&L | Settled in USDT (or USDC) | Settled in the underlying coin (BTC/ETH etc.) |
| How you profit | Earn USDT; intuitive | Earn coin: when the coin rises, "coin-denominated gains × the coin's own rise" compounds |
| Suited for | Almost everyone; the default for beginners | Veterans who are long-term bullish and want to "earn ever more coins" |
| Liquidation math | Linear; simple formulas | Non-linear; complex calculations |

### What Makes Coin-Margined Special

Coin-margined contracts post BTC as margin. If you open a BTCUSD perpetual with "1 contract = 100 USD" and BTC rises from 50,000 to 60,000:

- Notional value of the contract: 100 USD (unchanged);
- Margin occupied: 100 ÷ 50,000 = 0.002 BTC (at opening);
- BTC needed to close: 100 ÷ 60,000 ≈ 0.00167 BTC — **you get fewer BTC back**.

An even more direct example: **when you are long a coin-margined contract and BTC rises 20%, your return is "the BTC-denominated gain" × "BTC itself also rose 20%"** — double amplification; when BTC crashes, losses are amplified the same way. That is where the name "inverse contract" comes from.

> Beginner advice: **always start with USDT-margined contracts.** Coin-margined looks flexible, but its P&L math, liquidation price, and funding fees (paid in coin) are an order of magnitude more complex than USDT-margined.

---

## Contract Specifications

Whichever exchange you use, the fields on the order screen before opening a perpetual are roughly the same (values per the exchange's latest rules):

| Element | Meaning | Typical example (Binance/OKX) |
|---|---|---|
| Contract size | How much underlying one contract represents | BTCUSDT: 1 contract = 0.001 BTC; BTCUSD (coin-margined): 1 contract = 100 USD |
| Minimum order | Minimum order quantity and minimum notional value | Minimum 0.001 BTC; minimum notional about 5 USDT |
| Price precision | Minimum tick size | BTC: 0.1 USDT; small altcoins may be 0.00001 USDT |
| Quantity precision | Order quantity step | BTC step 0.001; varies hugely across coins |
| Leverage range | Maximum leverage allowed | BTC/ETH: up to 100x–125x; small coins: 20x–75x |
| Fees | Taker/maker rates | Regular user Taker 0.05%, Maker 0.02% |
| Settlement time | Funding fee settlement points | Every 8 hours (UTC 0/8/16) |

### Leverage Tiers (Tiered Margin)

Exchanges will not let you "run 100x leverage on a full-size position"; they use **tiered leverage brackets**: the larger the position, the lower the allowed leverage and the higher the maintenance margin rate. Example (always defer to the exchange's page):

| Tier | Position notional (USD) | Max leverage | Maintenance margin rate |
|---|---|---|---|
| 1 | 0 – 50,000 | 125x | 0.40% |
| 2 | 50,000 – 250,000 | 100x | 0.50% |
| 3 | 250,000 – 1,000,000 | 50x | 1.00% |
| 4 | 1,000,000+ | 20x | 2.50% |

> The point: the larger your position, the more sensitive the system is to every dollar of movement, and the higher the required margin ratio. **"100x leverage" applies only to tiny positions** — do not be fooled by marketing numbers.

---

## Margin Modes: Cross vs Isolated

You choose at opening and can switch anytime afterwards (switching triggers a recalculation of the liquidation price):

| Dimension | Isolated | Cross |
|---|---|---|
| Margin source | Only the margin allocated to that position | The account's entire available balance |
| Liquidation consequence | Only that position's margin is lost; other funds unaffected | Potentially the entire account equity |
| Liquidation price | Fixed; easy to compute (formula below) | Moves with account balance; more funds = farther away |
| Suited for | Strict per-trade risk control; multiple independent positions | Those staking the whole account as one bet |

> Isolated is a "private gambling table" — lose the chips on that table and you simply leave; cross is "all-in on yourself" — lose, and you are wiped out.
> **Beginners must use isolated margin**, quarantining risk within a single position.

---

## Liquidation Price Calculation

Definition of forced liquidation: when margin can no longer maintain the position, the exchange closes it by force. **Liquidation is not triggered "only when the principal is fully lost" — it triggers as soon as the margin ratio falls below the maintenance margin rate.**

### Core Concepts

| Term | Meaning |
|---|---|
| Initial margin rate (IMR) | Margin required to open = 1 ÷ leverage |
| Maintenance margin rate (MMR) | Minimum margin ratio that must be maintained while holding (set by the tier brackets) |
| Bankruptcy price | The price at which margin is exactly exhausted |
| Liquidation price | The price that triggers liquidation (before the bankruptcy price) |

### USDT-Margined Isolated Long

Formula (ignoring fees and funding):

```text
Liquidation price = Entry price × (1 − 1/Leverage) ÷ (1 − Maintenance margin rate)
```

**Worked example: BTC = 60,000 USDT, 20x isolated long, maintenance margin rate 0.5%**

```text
Liquidation price = 60,000 × (1 − 1/20) ÷ (1 − 0.005)
                  = 60,000 × 0.95 ÷ 0.995
                  ≈ 57,286 USDT
```

- Distance: 60,000 − 57,286 = 2,714 USDT, i.e. **a price drop of about 4.5% liquidates the position**;
- Sanity check: 20x leverage means a 5% adverse move wipes out the margin; after subtracting maintenance margin and fees, liquidation actually hits at about 4.5%.

### USDT-Margined Isolated Short

```text
Liquidation price = Entry price × (1 + 1/Leverage) ÷ (1 + Maintenance margin rate)
```

**Worked example: ETH = 3,000 USDT, 10x isolated short, maintenance margin rate 0.5%**

```text
Liquidation price = 3,000 × (1 + 1/10) ÷ (1 + 0.005)
                  = 3,000 × 1.1 ÷ 1.005
                  ≈ 3,284 USDT
```

- Distance: 3,284 − 3,000 = 284 USDT, i.e. **a price rise of about 9.5% liquidates the position**;
- Shorting caveat: **upside is theoretically unlimited** — a doubling of price is a 100% loss. Short liquidations are the crypto market's classic "one big green candle wipes out all the shorts".

### Coin-Margined (Inverse) Liquidation Price

The coin-margined formula is non-linear; skip the derivation and remember the conclusion:

```text
USDT-margined: an adverse move of about 1/Leverage brings you close to liquidation
Coin-margined: an adverse move of about 1/(Leverage − 1) brings you close to liquidation (P&L is in coin, and the coin price itself moves)
```

> Conclusion: **trust the "estimated liquidation price" displayed in real time on the exchange interface.** All hand formulas are approximations — actual liquidation is also affected by fees, funding, the mark price, and the maintenance margin tiers.

### Liquidation Price in Cross Mode

In cross mode, every unused dollar in the account counts as margin:

```text
Liquidation price ≈ the price at which "total account equity = maintenance margin requirement"
```

- More USDT in the account → liquidation price farther away;
- Other profitable positions in the account → push the liquidation price farther;
- Other losing positions in the account → pull it closer, and **one position's losses can detonate the whole account**.

### Why Liquidation Is Not "Losing Exactly Everything"

| Price zone | State |
|---|---|
| Entry price ~ bankruptcy price | Normal holding; floating P&L |
| Between bankruptcy price and liquidation price | Margin < maintenance margin rate; liquidation triggered (before total loss) |
| Filled below the bankruptcy price | The position itself "loses beyond zero"; the gap is covered by the insurance fund (see below) |

**This is the logic behind "you can still owe money after liquidation"**: the liquidation order is a **<mark>market order</mark>**. If an instant wick blows through the bankruptcy price and fills below it, the position has already "lost beyond zero".

---

## Insurance Fund and Auto-Deleveraging (ADL)

When a liquidation order fills better than the bankruptcy price, the surplus flows into the **insurance fund**; when it fills worse, the fund covers the gap. If the insurance fund is exhausted, **auto-deleveraging (ADL)** kicks in:

| Mechanism | Description |
|---|---|
| Bankruptcy price | The price at which margin hits zero |
| Insurance fund | A pool funded by "the surplus from liquidations", used first to absorb liquidation losses |
| ADL trigger | The insurance fund cannot cover the losses (extreme markets, cascading liquidations) |
| What ADL does | The system ranks counterparties by "profit ratio × leverage" and force-closes **high-leverage, high-profit opposing positions** |
| ADL price | Fills at a price better than the bankruptcy price (but likely worse than your expected exit price) |
| How to avoid ADL | Lower leverage, take **<mark>profits</mark>** promptly, watch the exchange's ADL ranking/indicator |

> ⚠️ **Risk Warning: ADL means "you can be force-closed even while in profit".**
> In extreme markets, profitable high-leverage positions can be singled out and forcibly closed (to offset the losses of blown-up positions).
> This is a tail risk unique to perpetual swaps: **your position is not entirely yours to decide.** Low leverage plus prompt profit-taking is the only defense.

---

## P&L Calculation

### USDT-Margined Long/Short P&L

```text
Long:  P&L = Position size × (Exit price − Entry price)
Short: P&L = Position size × (Entry price − Exit price)
```

**Worked example: 1 BTC perpetual long, entry 60,000, exit 63,000, 20x leverage (margin 3,000 USDT)**

| Item | Amount (USDT) |
|---|---|
| Price P&L | 1 × (63,000 − 60,000) = +3,000 |
| Entry fee (Taker 0.05%) | −60,000 × 0.05% = −30 |
| Exit fee (Taker 0.05%) | −63,000 × 0.05% = −31.5 |
| Funding (assume 3 settlements at 0.01% each) | −61,500 × 0.03% ≈ −18.5 |
| **Net profit** | **≈ +2,920** |

- Return on margin: 2,920 ÷ 3,000 ≈ **97%** (spot only rose 5% over the same period — this is leverage's amplification);
- The reverse holds too: if you exit at 57,000, price P&L is −3,000; add fees and funding, and the **3,000 margin is wiped out — and you may still owe more**.

### Coin-Margined P&L

```text
Long P&L (BTC) = Contracts × Contract size (USD) × (1/Entry price − 1/Exit price)
```

**Example: 100 contracts of 100 USD BTCUSD perpetual, entry 60,000, exit 66,000**

```text
P&L = 100 × 100 × (1/60,000 − 1/66,000)
    = 10,000 × 0.000001515
    ≈ 0.01515 BTC
```

- 0.01515 BTC is worth about 1,000 USD at 66,000; in coin-margined terms, **the number of coins you earned also grew with the coin's rise** — the double amplification described earlier.

### Fees and Funding: The Profit Killers

| Cost | Paid to | Typical rate (regular user) | Notes |
|---|---|---|---|
| Taker fee | The exchange | 0.05% (lower for VIP) | Charged on both entry and exit |
| Maker fee | The exchange | 0.02% | Charged only when a resting order is filled |
| Funding fee | The counterparty (longs pay shorts / shorts pay longs) | Commonly ±0.01%–0.03% | Settled every 8 hours |

> High-frequency scalpers can burn their entire principal on fees alone in a year; long-term holders must constantly watch the funding direction — when it turns against you, **the position itself bleeds continuously**.

---

## Mark Price Mechanics

Liquidation, funding, and floating P&L are all computed from the **mark price**, not the latest traded price on the order book:

| Dimension | Last price | Mark price |
|---|---|---|
| Source | The last trade on the order book | Composite of the spot index price + funding rate basis, etc. |
| Trait | Easily spiked by large orders | Smooth; hard for a single exchange to manipulate |
| Liquidation basis | No | **Yes** (liquidation watches the mark price) |
| Funding basis | Used in some calculations | **Yes** |

- On Binance and other exchanges, mark price = spot index (weighted across multiple spot venues) + a moving average of the funding rate basis;
- Purpose: **to stop players with deep pockets from printing a fake price in the contract book, liquidating you, and letting the price return** — the classic "wick-hunt liquidation";
- Caveat: the mark price itself cannot be manipulated, but **in extreme markets the spot index swings violently too**, and the mark price will still race toward your liquidation price.

> Practical tip: order screens usually show both "last price" and "mark price" — **when judging the distance to your liquidation price, check it against the mark price**.

---

## Beginner Checklist

- [ ] Understood margin, leverage, and liquidation from the futures chapter;
- [ ] Start with USDT-margined, isolated margin, low leverage (5x or below);
- [ ] Computed the liquidation price before opening, and set a **<mark>stop-loss</mark>** (placed before the liquidation price);
- [ ] Noted the funding rate's payment direction and the next settlement time;
- [ ] Only use money whose total loss would not affect your life.

::: warning ⚠️ Risk Warning
A perpetual swap = no delivery date × high leverage × 24/7 trading × funding × ADL — one of the most retail-hostile products in all of finance.
It can blow up fast enough to go "from floating profit to zero within one minute". **Do not fight volatility with leverage; leverage only amplifies the damage volatility does to you.**
:::
