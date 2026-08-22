---
title: "03 · Delivery and Rollover: Which Side Is Time On"
description: "Futures delivery and rollover — physical vs. cash delivery, delivery-month risks, how the dominant contract forms and positions roll, basis gaps at rollover, and how to choose contract months"
---

# 03 · Delivery and Rollover: Which Side Is Time On

> Futures are "contracts with an expiry date". Stocks can be held for ten years; futures cannot — every contract has a delivery month and must be settled by then. This article explains the delivery system, the risks of the delivery month, how the dominant contract forms and how positions roll, and how retail traders should choose contract months.

---

## 1. The Delivery System: Physical vs. Cash Delivery

Delivery is how a futures contract is performed at expiry, in two broad types:

### 1.1 Physical Delivery

- The seller delivers physical goods to the contract standard; the buyer pays.
- Used in **commodity futures**: corn, soybeans, copper, crude oil, rebar, gold, etc.
- Delivery quality, location, packaging, and quantity tolerances are strictly specified, involving warrants, inspection, freight, and a series of other costs.
- **Individual investors cannot participate in physical commodity delivery** (domestic rule); they must close or roll beforehand.

### 1.2 Cash Delivery

- No physical goods; funds are transferred by the difference between the expiry settlement price and the opening price.
- Used in **financial futures**: stock index futures (CSI 300, etc.) and treasury bond futures.
- The settlement price is usually a weighted average over a specific window on the last trading day of the delivery month (e.g. the arithmetic average of the last two hours for index futures), preventing single-point manipulation.

### 1.3 Which Products Use Which Method

| Delivery method | Typical products | Characteristics |
|---|---|---|
| Physical delivery | Copper, aluminum, rebar, iron ore, coke, crude oil, soybean meal, corn, sugar, cotton, gold, silver | Strong futures-spot price convergence; high delivery cost |
| Cash delivery | Index futures (IF/IH/IC/IM), treasury futures (TS/TF/T/TL) | No physical cost; pure cash settlement |

> Whichever the method, **for retail traders there is only one goal: close and exit before delivery**. The only ones who actually go to delivery are industrial clients with spot channels (hedgers).

---

## 2. Delivery-Month Risks

As the delivery month approaches, holders face a chain of "rule risks", deeply unfriendly to retail traders:

| Risk | Description |
|---|---|
| **<mark>Margin</mark> surge** | The exchange sharply raises margin on near-delivery contracts (possibly from 10% to 20%–40%); holding costs jump |
| **Liquidity evaporation** | Positions concentrate in the dominant contract; near-month volume dries up, bid-ask **<mark>spreads</mark>** widen, closing gets hard |
| **Position limits** | Individual investors are barred from opening new positions within days before the delivery month and face lot limits; excess is **<mark>force-liquidated</mark>** |
| **Rule discontinuities** | Price-limit ranges, **<mark>margin</mark>**, and opening permissions all have special rules in the delivery month |
| **Squeeze risk** | One side exploits position and spot imbalances to create extreme moves (long squeeze / short squeeze); retail traders are the easiest victims |
| **Physical delivery obligation** | If an individual forgets to close and is pulled into delivery, they face default penalties they cannot perform |

::: danger 💀 Retail Traders Must Never Hold Positions Around the Delivery Month
**Retail traders must never hold positions around the delivery month.** Margin surges, **<mark>liquidity</mark>** evaporation, position-limit liquidations, squeeze risk — every near-delivery rule works against retail traders. Exit commodity futures at least 1–3 weeks early.
:::

**Conclusion: retail traders must never hold positions around the delivery month.** The general rules:

- Commodity futures: exit **at least 1–3 weeks before** the last trading day (a date before the delivery month).
- Index/bond futures: may be traded to the last trading day, but liquidity and volatility also amplify in the final days.

### 2.1 The Delivery Process (Physical Delivery Example)

If you are a corporate client choosing delivery, the rough flow:

| Step | Content | Timing |
|---|---|---|
| Standard warrant | The seller submits warrants meeting quality standards (goods warehoused and inspected) | Before/during the delivery month |
| Matching | The exchange matches longs and shorts by positions | Last trading day |
| Delivery settlement price | Settled at the exchange-specified price (e.g. volume-weighted settlement prices of all trading days in the delivery month) | Last trading day |
| Payment transfer | The buyer pays in full, the seller delivers the warrant, the exchange settles in the middle | Delivery day |
| Pickup / warrant transfer | The buyer collects goods with the warrant or circulates it onward | After delivery |

> This routine for industrial clients is "deep water" for individuals: warrants, inspection, invoicing, default penalties — pitfalls at every step. **That is why the rules simply bar individuals from physical delivery — protection, not discrimination.**

### 2.2 Why Delivery Forces Futures and Spot Prices to Conver

The delivery system is the "anchor" of the futures market:

- If futures > spot + carry cost → **<mark>arbitrage</mark>** traders buy spot, sell futures, deliver, and profit — pushing futures "down" toward spot.
- If futures < spot → arbitrageurs reverse it (buy futures, sell spot), pushing futures "up" toward spot.

Hence **the closer to delivery, the closer the futures price to spot**. This convergence mechanism is the foundation of hedging effectiveness and cash-futures arbitrage.

---

## 3. The Dominant Contract and Rolling

### 3.1 What Is the Dominant Contract

The dominant contract = the contract month with the **largest volume and open interest** among all contracts of a product. It is where the market's capital fights its main battles:

| Product | Typical dominant months | Notes |
|---|---|---|
| Rebar (rb) | Jan, May, Oct | Three dominants rotating |
| Soybean meal (m) | Jan, May, Sep | Follows planting/harvest rhythm |
| SHFE copper (cu) | Continuously active, both near and far months | Open interest persistently top |
| CSI 300 index (IF) | Current month dominates | Liquidity concentrated in current and next month |
| Treasury futures (T) | Dominant quarterly months (Mar/Jun/Sep/Dec) | Shifts with the deliverable bond basket |

![Rollover: before delivery, funds move from the old dominant to the new](_assets/rollover.svg)

### 3.2 Why the Dominant Contract Rolls

As a contract approaches its delivery month, capital "moves house" to the next active month — a process called **rolling**:

- Holders sell the old dominant (close) while buying the new dominant (open) — for the trader this is a **rollover / position switch**.
- The roll usually happens **1–2 months before** the delivery month; volume and open interest complete the "handover" at some point, and the new contract becomes dominant.

### 3.3 Signs of the Roll

```text
Old contract: open interest/volume declining steadily, spread widening, margin raised
New contract: open interest/volume accelerating, spread converging
```

When the new contract's volume exceeds the old one **for several consecutive days**, dominance has formally transferred. Trading software usually tracks it automatically with the "dominant contract" code (e.g. `rb2510`).

---

## 4. **<mark>Basis</mark>** and Gaps at the Roll

### 4.1 Basis

```text
Basis = Futures price − Spot price
```

- **Contango market (futures premium)**: futures > spot, far month > near month; common when supply is loose or carry costs exist.
- **Backwardation market (futures discount)**: futures < spot, near month > far month; common when spot is tight or the market expects lower prices.
- Near delivery, basis converges to 0 (futures and spot must match on delivery day, else a riskless arbitrage exists).

### 4.2 The Roll "Gap"

When switching from the old dominant to the new, the two contracts do not trade at the same price:

| Scenario | New vs. old dominant price | Effect on the roller |
|---|---|---|
| Contango (premium) | New > old | Longs' cost raised after the switch; shorts' cost lowered |
| Backwardation (discount) | New < old | Longs' cost lowered; shorts' cost raised |

**The "gap" on the candlestick chart**: if software stitches different contracts into a continuous chart, a visible gap appears at the roll point — this is not a price crash or spike, but **the price difference between two different contracts**. Beginners who read the gap as a breakout signal on a continuous chart easily misjudge.

### 4.3 Example: Rolling Soybean Meal

- The May contract settles at 3300 CNY/ton (near expiry, discount to spot).
- The September contract trades at 3350 CNY/ton (premium structure).
- You hold 3 lots of May longs and roll — sell May, buy September:
  - May close: 0 (closed at 3300, no P&L)
  - September open: cost 3350, 50 CNY/ton above the original
  - **Long roll cost = +50 CNY/ton (3 lots = 1500 CNY)** — not a market loss, but the cost of the term structure, often called the **rollover loss**.
- If you held shorts, this structure would instead **earn** 50 CNY/ton on the roll (sell high, buy back low).

> Rolling is not simply "moving the **<mark>position</mark>** over"; it is a trade with a cost and a direction. In the long-run "cost of carry" of holding futures, rollover gains/losses often matter far more than margin interest.

### 4.4 What Shapes the Term Structure: Cost of Carry

Why is the far month usually more expensive? The **cost-of-carry theory**:

```text
Forward price ≈ Spot price + storage + insurance + financing interest − convenience yield
```

- Holding commodities (grain, gold, crude) requires storage and capital costs → the far month is naturally pricier (premium / contango).
- If spot is tight and the market urgently needs the commodity now (high convenience yield), the far month is instead cheaper (discount / backwardation).

| Term structure | Shape | Implied market signal | Typical cases |
|---|---|---|---|
| Contango (premium) | Near low, far high | Ample supply, no spot stress | Gold, oversupplied crude |
| Backwardation (discount) | Near high, far low | Spot shortage, inventories strained | Tight-balance crude, scarce products |

> The term structure itself is a "signal source": **backwardated markets often flag short-term supply-demand tightness**. Many trend traders treat term structure as an important confirming indicator.

### 4.5 A Rollover-Return Calculation

Suppose you are long a backwardated product for a year, rolling monthly:

| Item | Value |
|---|---|
| Initial price (near month) | 100.0 CNY |
| Far-month discount (monthly spread) | 0.5 CNY/month |
| Gain per roll | +0.5 CNY/ton |
| Annual rollover return | +6 CNY (≈ 6% extra return) |

Conversely, being long in a contango market means "buying 0.5 CNY dearer" every roll — 6% bled per year. **This is why "holding futures long-term" can produce returns wildly different from holding the spot asset (e.g. a gold ETF).**

---

## 5. Rollover Strategies

Rollover (rolling) is the operation by an investor holding a position across months: close the old, open the new, before the old contract expires, moving the position to the next month.

### 5.1 By Direction: Roll Timing Strategies

| Strategy | Action | Suitable scenario |
|---|---|---|
| Early rollover | Roll 3–4 weeks before the delivery month | Prioritize liquidity safety, avoid delivery rules |
| Last-minute rollover | Drag to the final days before the delivery month | Hope for basis convergence at better prices, but risky (thin liquidity) |
| Staged rollover | Roll in batches (e.g. 1/3 every 5 days) | Smooth the roll gap; suits large capital |

### 5.2 By Structure: Term-Structure Strategies (the long game of holding futures)

- **Contango market**: far dearer than near. Long-term longs "buy dearer" at every roll, accumulating rollover losses; shorts gain accordingly.
- **Backwardation market**: near dearer than far. Longs "buy cheaper" on each roll and can accumulate rollover returns.

| Term structure | Long rolls | Short rolls | Typical products |
|---|---|---|---|
| Contango (premium) | Loses | Gains | Gold (high storage cost), crude in oversupply |
| Backwardation (discount) | Gains | Loses | Crude in tight balance, some farm products in the lean season |

> For anyone attempting a "futures version of long-term investing", **term structure is the key variable deciding long-run P&L** — many "buy gold futures and hold" investors had most of their long-run returns eaten by rollover costs, a problem spot gold (ETF/physical) does not have.

### 5.3 Rollover Practice Notes

1. Complete the roll inside windows of ample liquidity (avoid volatility near the last trading day).
2. Watch the old-new spread (calendar spread); at extremes, rolling can be very favorable or very costly.
3. Large capital rolls in batches to avoid a single-shot market impact.
4. Rolling is not "free switching": commissions × 2 (close old + open new) + possible price differences.

---

## 6. Choosing Contract Months

### 6.1 Why Trade the Dominant Contract

| Dimension | Dominant contract | Non-dominant (far/near) contracts |
|---|---|---|
| Liquidity | Good, tight spreads, enter/exit anytime | Poor, wide spreads, hard to close |
| Volatility | Reflects market consensus, continuous moves | Easily manipulated, erratic patterns |
| Margin | Normal | Near months may be sharply raised |
| Rules | Standard trading rules | Tightened near delivery |
| Data | Full volume, open interest, and flow data | Sparse data, low reference value |

**First principle for retail traders: open and close only on the dominant contract.**

### 6.2 When You May Touch Non-Dominant Contracts

- **Arbitrage**: calendar spreads require holding near and far months simultaneously (professional operations).
- **Industrial clients**: hedging must match actual delivery months.
- **Special liquidity windows**: during some products' dominance handover (e.g. some farm products), the new dominant is just building volume and the spread structure may be favorable.

### 6.3 Practical Advice

1. Trade directly off the "dominant continuous" contract in your software, or place orders manually on the dominant contract month.
2. **Check the contract month regularly** while holding; move proactively before the dominance handover.
3. Set a roll reminder: when your held month is ≤ 1 month from the delivery month, prepare to close/roll unconditionally.
4. Never buy a far-month discounted contract because it "looks cheap" — cheap far months usually have reasons (market expectations, cost of carry).

### 6.4 A Complete Roll Walk-Through

Using rebar, assume it is mid-August 2025:

| Time | Contract status | Your action |
|---|---|---|
| August | October contract (rb2510) dominant, active volume | Trade rb2510 normally |
| Early September | rb2510 nearing its delivery month (expires mid-October), margin raised, open interest sliding; January contract (rb2601) open interest accelerating | Watch rb2601, plan the roll |
| Mid-September | rb2601 volume tops rb2510 for 3 straight days → new dominant confirmed | Sell rb2510 and buy rb2601 at a chosen moment (watch the spread) |
| October | rb2510 enters delivery-month rules, liquidity gone | Fully holding rb2601, no exposure |

> Walk-through conclusion: **the roll window is roughly 4–8 weeks before the delivery month**. Those who remember to roll only two weeks before have usually already taken a loss exiting inside a liquidity-drained contract.

::: warning ⏰ The Roll Window Is 4–8 Weeks Before the Delivery Month
**The roll window is roughly 4–8 weeks before the delivery month — those who remember only two weeks ahead usually exit at a loss inside a liquidity-drained contract.** Watch the dominance-handover signals in advance; do not wait until liquidity disappears.
:::

---

## Risk Warning

::: warning ⚠️ Risk Warning
- Positions near the delivery month face margin hikes, position limits, liquidity evaporation, and squeeze risks; **individual investors must never hold positions around the delivery month**.
- Rolling incurs rollover costs (longs lose persistently in contango structures); it is not a "free move".
- Gaps at roll points on continuous candlestick charts do not represent real market moves; do not chase or dump on them.
- Delivery rules, position-limit standards, and last trading days are subject to the latest exchange regulations; this article is a teaching treatment.
:::


---

## Summary

- Physical delivery is for commodity futures, cash settlement for financial futures; retail traders need take part in neither.
- The delivery month = a risk amplifier: margin hikes, liquidity evaporation, tighter rules, squeeze risk.
- The dominant contract is where capital fights; retail traders trade only the dominant contract.
- At the roll there are basis differences and chart gaps — understand them, don't be fooled by them.
- Rollover has both costs and returns, determined by the term structure (contango/backwardation).
- Time is not your friend in futures: **every contract has an expiry date, and the rules will not wait for your position.**
