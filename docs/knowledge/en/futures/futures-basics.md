---
title: "01 · Futures Basics: What a Contract Is"
description: "An introduction to futures contracts — what futures are, their historical origins, the eight contract elements, the trading process, domestic futures exchanges, and a full futures vs. stocks comparison"
---

# 01 · Futures Basics: What a Contract Is

> Futures are among the "cleverest" and most "dangerous" instruments in the trading world. They were born from the need to hedge spot price risk, yet over a century of evolution they grew into a giant market where speculation and **<mark>hedging</mark>** coexist. This article starts from zero: what futures are, where they came from, what a contract contains, how trading works, and which exchanges you trade on in the domestic market.

---

## 1. What Futures Are

A **futures contract** is a **standardized contract**, uniformly defined by an exchange, to deliver a specified quantity of an underlying asset at a specific time and place in the future.

Break it down:

- **Standardized**: The product, quantity, quality, delivery location, and delivery time are all set by the exchange. The two parties can only choose to "buy" or "sell", to open or to close — no bargaining as in spot deals.
- **Future delivery**: Sign today, perform later. Buying one lot of rebar futures does not mean you own a ton of steel now; it means you have agreed to buy it at the delivery month at a pre-agreed price.
- **<mark>Margin</mark> trading**: You do not pay the full value — only a small fraction of the contract value (e.g. 8%–15%) is posted as margin, yet you control the full value. That is the source of **<mark>leverage</mark>**.

The essence of futures is **the standardization of forward transactions**. It upgrades private deals like "Zhang San agrees to buy 100 tons of soybeans from Li Si in three months at a price negotiated today" into a public market instrument where "anyone buying one lot of soybean futures today locks in a price for some future month".

> In one sentence: **a futures contract is a "price contract for the future" — the price is set now, performance comes later.**

---

## 2. The Birth of Futures: Hedging in the Spot Market

Futures were not invented out of thin air; they emerged from one plain pain point: **price volatility hurt everyone doing real business**.

### 2.1 Background: the 19th-century American grain market

In the mid-19th century, Chicago became the grain hub of the United States. Farmers planted in spring and harvested in autumn; merchants stockpiled in autumn and shipped year-round. Two sharp conflicts ran through this chain:

- **Farmers**: At harvest, supply surged and prices collapsed — "cheap grain ruined farmers"; in spring, when supplies ran out, prices soared, but farmers had nothing left to sell.
- **Grain merchants / warehouse operators**: Bought cheap in autumn and stockpiled, betting on higher prices next year; if prices fell instead, the stockpile became a huge loss, even bankruptcy.

Both sides faced enormous **price uncertainty**. Whoever bore that risk paid for it in blood.

### 2.2 The emergence of the forward contract

The market spontaneously evolved the "forward contract": in spring, a farmer agreed with a grain merchant — "in autumn I will sell you 100 bushels of corn at X dollars per bushel". The price was locked in advance and both sides' risk was hedged: the farmer no longer feared a harvest-time price drop, and the merchant no longer feared the stockpile losing value.

But forward contracts had fatal flaws:

| Flaw | Consequence |
|---|---|
| Non-standard terms | Quantity, quality, and timing of every contract were privately negotiated; resale was extremely difficult |
| Reliance on counterparty credit | If the other side defaulted, the hedge promise evaporated (credit risk) |
| No liquidity | The contract was locked between the two signatories and could not be transferred to a third party |

### 2.3 Standardization and the clearing house: the birth of modern futures

In 1848, 82 Chicago merchants founded the **Chicago Board of Trade (CBOT)** on the shore of Lake Michigan, initially trading spot grain only.

In 1865, CBOT launched the **standardized futures contract**: quantity, quality, and delivery months were unified, and a **margin system** was introduced (both sides post margin to guarantee performance).

Over the following decades, exchanges refined the rules:

- **Margin system**: The cost of defaulting was paid up front, and credit risk dropped sharply.
- **The clearing house**: The exchange itself became the "central counterparty" of every trade — the buyer's counterparty is the clearing house, and so is the seller's. Even if one side defaults, the clearing house guarantees performance — credit risk was structurally eliminated.
- **Open outcry → electronic trading**: From hand signals in the trading pit to today's millisecond-level electronic matching.

After CBOT's grain futures succeeded, cotton, coffee, and metals followed; from the 1970s, financial futures (FX, rates, stock indices) exploded. Today the global futures market turns over trillions of dollars a day, and the notional size of derivatives far exceeds spot markets.

> **The lesson**: The core mission of futures has been "**transferring price risk**" since birth — letting those who do not want price volatility (farmers, airlines, steel mills) pass the risk to those willing to bear it for profit (speculators). Speculators are not parasites; they are the risk "buyers of last resort". It is precisely their existence that allows hedgers to exit smoothly.

---

## 3. The Eight Elements of a Futures Contract

Every futures contract is precisely defined by its exchange. The following eight elements form the complete profile of a contract:

| Element | Meaning | Example (rebar rb) |
|---|---|---|
| **Underlying** | The commodity or financial asset the contract references | Rebar (HRB400 and other standard grades) |
| **Contract multiplier / trading unit** | How much one lot represents | 10 tons/lot |
| **Quotation unit** | The unit of the price | CNY/ton |
| **Tick size** | The minimum price increment | 1 CNY/ton (one "tick" = 10 CNY per lot) |
| **Price limit** | The daily price move cap | ± 4% of the previous settlement price (adjusted with market conditions) |
| **Margin rate** | The fraction of contract value posted to open | Exchange baseline ~7%; futures firms typically add on to 10%–14% |
| **Delivery months** | Months in which the contract can be delivered | Jan/Mar/May/Jul/Aug/Sep/Oct/Nov/Dec |
| **Delivery method** | How the contract settles at expiry | Physical delivery (rebar); cash settlement for index futures |

### 3.1 Element by Element

**① Underlying**
It can be a commodity (soybeans, gold, crude oil) or a financial asset (stock index, government bond, FX rate). Domestically these are the two big categories: "commodity futures" and "financial futures".

**② Contract multiplier / trading unit**
Futures trade in "lots"; one lot represents a fixed quantity. For example, rebar is 10 tons/lot, gold is 1000 grams/lot, and CSI 300 index futures are 300 CNY per index point. **Total value of one lot = price × multiplier** — the basis for calculating **<mark>margin</mark>** and P&L.

**③ Quotation unit**
Such as CNY/ton, CNY/gram, CNY/point. The quotation unit determines the magnitude of the price figure and indirectly shapes the tick size design.

**④ Tick size**
The minimum increment of price movement. Rebar 1 CNY/ton → each tick per lot = 1 CNY × 10 tons = 10 CNY; CSI 300 index 0.2 points → each tick per lot = 0.2 × 300 = 60 CNY.

**⑤ Price limit**
The cap on the daily move relative to the "previous trading day's settlement price" (note: settlement price, not close). Exchanges adjust it near delivery months or during unusual markets; extreme conditions can trigger "consecutive limit" circuit-breaker-like measures.

**⑥ Margin rate**
The fraction of contract value frozen at opening, typically 5%–15%. This rate determines the leverage multiple: 10% margin = 10x leverage (see Article 02).

**⑦ Delivery months**
Contracts have a life cycle. The dominant contract is usually the month with the largest volume and open interest (e.g. Jan/May/Oct for rebar). Contracts near delivery suffer drained **<mark>liquidity</mark>** and special rules — retail traders should avoid them (see Article 03).

**⑧ Delivery method**
- **Physical delivery**: Mainly commodity futures; at expiry, goods are delivered/received at standard quality.
- **Cash settlement**: Financial futures such as stock index and bond futures; funds are transferred by the settlement **<mark>price spread</mark>** at expiry, with no physical goods.

---

### 3.2 The Three Functions of the Futures Market

With contract elements understood, one question remains: what is the futures market for? The answer is three functions:

| Function | Meaning | Who benefits |
|---|---|---|
| **Price discovery** | Futures prices formed by the competition of many traders reflect the market's consensus on future supply and demand, more "authoritative" than any single company's quote | Spot traders, policymakers, all market participants |
| **Risk management** | Hedgers transfer price risk to speculators; production and trade can now be "priced" | Farmers, airlines, steel mills, foreign-trade firms |
| **Asset allocation / speculation** | Investors earn returns by bearing risk; institutions use futures to hedge stock and bond portfolios | Speculators, institutional investors |

> Why are futures prices "authoritative"? Because they aggregate supply-and-demand information across the whole market, and every participant's judgment is backed by real money (margin). Lying has a cost.

### 3.3 The Three Types of Participants

| Participant | Goal | Position characteristics |
|---|---|---|
| Hedgers | Hedge spot price risk | **<mark>Position</mark>** matched to spot; long holding periods, often held to delivery |
| Speculators | Profit from price volatility | Light positions, quick in and out; the vast majority close same-day or short-term |
| **<mark>Arbitrage</mark>** traders | Earn the near-certain profit of spread convergence | Hold both long and short legs simultaneously, earning "riskless" profit |

The three are counterparties to one another and mutually dependent: without speculators, hedgers find no counterparty; without hedgers, speculators lose the source of liquidity.

---

## 4. The Futures Trading Process

The complete flow for an individual trading futures:

```text
Open account → Deposit funds → Place order → Mark to market → Close / Deliver
```

### 4.1 Opening an Account

- Choose a licensed futures firm, prepare your ID and bank card, and sign the brokerage contract and risk disclosure.
- You must pass the **suitability assessment** (risk tolerance evaluation) and a **knowledge test** (some products also have capital thresholds).
- Thresholds for special products: stock index futures (CFFEX) require available funds ≥ 500k CNY plus relevant trading experience; crude oil futures (INE) ≥ 500k; iron ore, PTA and other specific products ≥ 100k (exchange rules differ; refer to the latest regulations).

### 4.2 Depositing Funds

- Funds move via bank-futures transfer (bank account ↔ futures account), available T+0.
- Account funds split into **margin occupied** (frozen on positions) and **available funds** (can open new positions or be withdrawn).

### 4.3 Placing Orders

- Order types: **<mark>market order</mark>**, **<mark>limit order</mark>**, **<mark>stop-loss</mark>** order (some platforms support conditional orders), spread orders, etc.
- Directions: **buy to open** (open long), **sell to open** (open short), **sell to close** (close long), **buy to close** (close short).
- Matching: price priority, time priority. Sessions split into day (9:00–11:30 a.m., 1:30–3:00 p.m.) and night (from 21:00; end time varies by product).

### 4.4 Mark to Market

- Futures use **<mark>mark-to-market</mark>**: after each close, the exchange recalculates your position P&L at the "daily settlement price", and gains/losses are credited/debited to your account the same day.
- If floating losses drain your equity, the account will face a **<mark>margin call</mark>** or trigger **<mark>forced liquidation</mark>** — one of the biggest differences from stocks (see Article 02).

### 4.5 Closing / Delivery

- The vast majority of traders (> 99%) never reach delivery; they **close the position** (an offsetting trade) and keep only the price difference.
- If you hold into the delivery month and meet delivery conditions, delivery proceeds: physical delivery for commodity futures, cash settlement for financial futures.
- Individual investors are usually barred by the exchange or futures firm from physical delivery (individuals cannot take physical delivery of commodity futures and must close before the delivery month).

### 4.6 The Costs of Trading Futures

| Cost item | Description | Typical magnitude (reference) |
|---|---|---|
| Commission on open/close | Charged per lot or per traded value, both sides | Rebar ~0.01%–0.03% per side (close-today discounts vary) |
| Margin interest | Cost of occupied capital (opportunity cost) | Depends on cost of funds |
| **<mark>Slippage</mark>** / market impact | Gap between fill price and expected price | Depends on liquidity |
| Rollover cost | Double-sided cost of closing the old contract and opening the new at roll (see Article 03) | Depends on the term structure |

> Never underestimate commissions: a high-frequency day trader can pay more in fees per year than their principal. **Trading costs are the only "loss" you are 100% certain of.**

### 4.7 Quick Glossary

| Term | Meaning |
|---|---|
| Long / Short | Holder of long positions (bullish) / holder of short positions (bearish) |
| Open / Close | Establish a new position / exit an existing position |
| Open interest (OI) | Total number of unsettled contracts in the market |
| Volume | Number of contracts traded that day |
| Settlement price | The official price used for daily P&L and margin calculations |
| Dominant contract | The contract month with the largest volume and open interest |
| Rollover / roll | Moving a position from the old contract month to a new one |
| Long squeeze on longs | Longs stampede over each other to close in panic, accelerating the fall |
| Corner / squeeze | Players with spot and position advantages force counterparties to buy back at extreme prices |

### 4.8 The Logic of Short Selling: Profiting from Falls

Stocks can only be bought long; futures can be sold short — sell high first, buy back low, and pocket the downside spread:

- You expect rebar to fall from 3500 to 3300.
- Action: **sell to open** 1 lot (you hold no steel at all; you are selling "a promise of a future price").
- After it falls to 3300, **buy to close**.
- Profit = (3500 − 3300) × 10 tons = **2000 CNY** (fees excluded).

> ⚠️ Shorting is equally leveraged: if the price rises 10%, your margin loses 10% just the same. Shorting is not a "safer" game — the direction is simply reversed.

::: warning 🎯 Shorting Is Not Safer, Only Reversed
**Shorting is equally leveraged: if the price rises 10%, your margin loses 10% just the same.** Shorting is not a "safer" game — the direction is simply reversed; the P&L structure and the forced-liquidation mechanism are identical to going long.
:::

---

## 5. The Domestic Futures Market

Domestic futures are regulated by the CSRC. There are currently **5 commodity/financial futures exchanges** (plus GFEX):

| Exchange | Abbreviation | HQ | Major products |
|---|---|---|---|
| Shanghai Futures Exchange | SHFE | Shanghai | Copper, aluminum, zinc, nickel, gold, silver, rebar, hot-rolled coil, rubber, fuel oil, bitumen, pulp, stainless steel, alumina |
| Shanghai International Energy Exchange | INE | Shanghai | Crude oil, low-sulfur fuel oil, TSR 20 rubber, international copper, container shipping index (EC), paraxylene |
| Dalian Commodity Exchange | DCE | Dalian | Soybean meal, soybean oil, palm oil, corn, soybean No.1/No.2, eggs, live hogs, coke, coking coal, iron ore, LLDPE (plastics), polypropylene, ethylene glycol, styrene, LPG |
| Zhengzhou Commodity Exchange | CZCE | Zhengzhou | Sugar, cotton, cotton yarn, PTA, methanol, glass, soda ash, urea, rapeseed oil, rapeseed meal, apples, red dates, peanuts, staple fiber, caustic soda, paraxylene |
| China Financial Futures Exchange | CFFEX | Shanghai | CSI 300 / SSE 50 / CSI 500 / CSI 1000 index futures, 2/5/10/30-year treasury bond futures |
| Guangzhou Futures Exchange | GFEX | Guangzhou | Industrial silicon, lithium carbonate |

> Mnemonic: **Copper, aluminum, gold and silver on SHFE; petrochemicals and coal in Dalian; farm goods and chemicals in Zhengzhou; index and bonds at CFFEX; new energy in Guangzhou.**

Characteristics of the domestic futures market:

- **T+0 trading**: Positions opened today can be closed today, unlike the T+1 of A-shares.
- **Two-way trading**: You can go long (buy) or short (sell); falling prices can be profitable too.
- **Margin leverage**: Typically 7–15x; financial futures run slightly lower leverage but steeper swings.
- **Night session**: Most commodity futures have a night session covering European and American hours — volatility risk does not pause while you sleep.
- **Price limit system**: Daily moves are capped, but consecutive limit boards carry extreme liquidity risk.

---

## 6. Futures vs. Stocks: One Table Says It All

| Dimension | Futures | Stocks (A-shares) |
|---|---|---|
| Underlying | Standardized contracts on commodities, indices, rates | Shares of listed companies |
| Direction | Two-way (long and short) | Long only (short selling restricted) |
| Trading system | T+0, closeable same day | T+1, shares bought today sell tomorrow |
| Capital occupied | Margin (5%–15%), leveraged | Full value, no leverage (except margin financing) |
| Source of profit | Price movement (spread) + hedging/arbitrage | Rising prices + dividends |
| Loss profile | Can lose all principal and even **<mark>blow through to negative balance</mark>** | At worst goes to 0; you cannot owe money |
| Expiry | Has delivery months; must close or deliver | No expiry; can hold indefinitely |
| Price limits | Yes (varies by product) | Main board 10%, ChiNext/STAR 20% |
| Settlement | Mark-to-market; P&L transferred daily | No daily settlement; floating losses not transferred |
| Trading cost | Commission + margin interest (low) | Commission + stamp duty |
| Volatility risk | High (amplified by leverage) | Relatively low |
| Participants | Hedgers + speculators + arbitrageurs | Mostly investors |

**The core difference in one sentence**: A stock is a "cash-for-goods" asset investment; a futures contract is a "small-stakes, big-exposure" risk-transfer contract — a losing stock can be held and waited out, but holding a losing futures position burns margin continuously until the account **<mark>blows up</mark>**.

::: danger 💀 Holding a Losing Futures Position = Margin Burned Until Liquidation
**A losing stock can be held and waited out; the cost of holding a losing futures position is margin consumed until forced liquidation.** The biggest difference between futures and stocks is not the returns but the exit — stocks leave you a chance to come back, futures eject you at the line.
:::

---

## Risk Warning

::: warning ⚠️ Risk Warning
Futures are margin (leveraged) trading; both gains and losses are multiplied. A common beginner mistake is treating futures like stocks — "buy and hold" or "hold and hope" — which under leverage can easily end in forced liquidation or even a negative-balance blow-through (losses exceeding principal). This article covers basic concepts only; **before any live trading, read Article 02 "Margin, Leverage & Forced Liquidation" in full** and confirm you understand everything about forced liquidation and negative balances. This content does not constitute investment advice; contract rules are subject to the latest exchange regulations.
:::


---

## Summary

- Futures = standardized forward contracts = "price now, performance later".
- Born in 1848 from spot hedging needs in Chicago's grain market; margin and the clearing house solved credit risk.
- Eight contract elements: underlying, multiplier, quotation unit, tick size, price limit, margin rate, delivery months, delivery method.
- Trading flow: open account → deposit → order → mark to market → close/deliver.
- Five domestic commodity/financial exchanges plus GFEX, covering the full range of commodity and financial products.
- Futures vs. stocks: T+0, two-way, leverage, expiry — every difference means more risk and more professionalism required.
