---
title: "04 · Options Basics: The Most Sophisticated Financial Instrument"
description: "Options quick-start card — what an option is, premium/strike/expiry, the four basic positions, and buyer-seller obligation asymmetry; the shortest path into options, then on to the Options Strategies chapter"
---

# 04 · Options Basics: The Most Sophisticated Financial Instrument

> **This article is a quick-start card**: it answers "what is an option" by the shortest path. Once the concepts are clear, go straight to [Chapter 27 · Options Strategies](../options-strategies/) — pricing and volatility, the Greeks, the strategy compendium, live-trading risk control, and tools/review all live there (this article's former in-depth content has been merged into that chapter).

> Options let you **buy a future right at limited cost**: right direction, you profit from the move; wrong direction, you lose at most the **<mark>premium</mark>**. An analogy: **you pay 10 yuan to reserve a restaurant table (the premium); if you don't go, you lose only that 10 yuan — and the restaurant (the seller), having taken your money, must hold the table.**

::: danger 💀 Options are one of the fastest ways retail traders lose money
The buyer's premium decays to **<mark>zero</mark>** over time; the seller's risk is theoretically unlimited. **Do not put in a single cent before the rights-and-obligations relationship is crystal clear.**
:::

## 1. Core Concepts at a Glance

| Concept | One-liner |
|---|---|
| **Option** | A contract granting the holder the **right (but not the obligation)** to buy or sell an underlying at an agreed price in the future |
| **Premium** | The price the buyer pays and the seller receives — the cost of buying "a future right" |
| **Strike** | The agreed buy/sell price at expiry |
| **Expiry** | The date the right dies (domestic ETF options are European, the fourth Wednesday of each month; defer to each exchange's latest specifications) |
| **ITM / ATM / OTM** | (Call for illustration) strike below spot = in the money, about equal to spot = at the money, above spot = out of the money (Puts inverted); OTM is cheap, betting on "a surprise" |
| **Obligation asymmetry** | In futures both sides carry obligations; in options **only the seller is obligated — the buyer holds only a right**. This is the fundamental difference from futures |

## 2. The Four Basic Positions

| Position | What you are doing | Max loss | Max gain | View it expresses |
|---|---|---|---|---|
| **Buy Call** | Pay premium for "the right to buy" | Premium | Theoretically unlimited | Strongly bullish |
| **Buy Put** | Pay premium for "the right to sell" | Premium | Theoretically unlimited | Strongly bearish / panic **<mark>hedging</mark>** |
| **Sell Call** | Collect premium, bear the delivery obligation (**<mark>margin</mark>** required) | Theoretically unlimited | Premium | Mildly bearish / sideways |
| **Sell Put** | Collect premium, bear the take-delivery obligation (margin required) | Theoretically unlimited | Premium | Mildly bullish / want to buy lower |

> Example: CSI 300 at 3,800; buy the 3,900 Call for a 50-point premium → at expiry the index must exceed 3,950 to profit (3,900 strike + 50 cost). **Strike + premium = the buyer's true cost.**

## 3. Next Step: Go Deeper in Chapter 27

The in-depth content (pricing, IV, the Greeks, 16 strategies, live-trading risk control, tools/review) all lives in [Options Strategies](../options-strategies/):

| Article | Content |
|---|---|
| [01 · Option Pricing and Volatility](../options-strategies/pricing-volatility.md) | Intrinsic + time value, Black-Scholes intuition, IV and the IV Crush "double kill", the volatility surface |
| [02 · The Greeks in Practice](../options-strategies/greeks-in-practice.md) | Delta/Gamma/Theta/Vega/Rho, the risk balance sheet, Delta-neutral hedging |
| [03 · Options Strategy Compendium](../options-strategies/options-strategies.md) | 16 strategies in four classes (direction/volatility/income/hedging), with payoff diagrams and the market-environment matching table |
| [04 · Options in Practice and Risk Control](../options-strategies/options-trading-risk.md) | Buyer/seller playbooks, margin, market participants, China access channels, and expiry/exercise rules |
| [05 · Option Tools and Review](../options-strategies/options-tools-review.md) | Option chains, IV data tools, strategy builders, review templates, and the learning path |

## Risk Warning

::: warning ⚠️ Risk Warning
Options are derivatives of **extreme professional depth and the most complex risk shape**. Retail traders must remember the two root causes of losses: **① seller risk** — naked short Calls/Puts have theoretically unlimited loss, and a single black swan can swallow years of gains; **② time decay (Theta)** — most options expire worthless, and the right direction with too little speed or volatility still burns the entire premium. This article keeps only the shortest-path introduction; the full content on pricing, the Greeks, strategies, and risk control is in [Options Strategies](../options-strategies/) above. All elements and rules here are teaching-basis — **defer to the exchanges' latest contract specifications and real-time quotes**. This article does not constitute investment advice; complete the broker-required investor education and risk assessment before trading options.
:::
