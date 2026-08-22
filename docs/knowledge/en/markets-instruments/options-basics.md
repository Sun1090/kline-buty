---
title: "04 · Options Basics: The Most Sophisticated Financial Instrument"
description: "Options basics — Call and Put, the four elements, ITM/ATM/OTM, buyer vs seller rights and obligations, intrinsic and time value, implied volatility IV, and the Greeks"
---

# 04 · Options Basics: The Most Sophisticated Financial Instrument

> Options are the "smartest" contracts in the financial world: they let you **buy a future right at limited cost** — right direction, you profit from the move; wrong direction, you lose at most the **<mark>premium</mark>**. Sounds wonderful?

::: danger 💀 Options are one of the fastest ways retail traders lose money
The buyer's premium decays to **<mark>zero</mark>** over time; the seller's risk is theoretically unlimited. This article explains the rules first, then the strategies — **do not put in a single cent before the rights-and-obligations relationship is crystal clear.**
:::

---

## 1. What Is an Option: Buying a "Right for the Future"

An option is **a contract that grants the holder the right (but not the obligation) to buy or sell an underlying asset at an agreed price on an agreed date**.

- The buyer pays money (the **premium**) for the right; at expiry they **may exercise or walk away** (walking away costs only the premium)
- The seller collects that money and bears the obligation: **must perform** if the buyer exercises

An analogy: you pay 10 yuan to reserve a restaurant table for September (the premium). If you decide not to go, the 10 yuan is lost; if you go, you sit as agreed (exercise). **The restaurant (the seller) took your money and must hold the table.**

> Option vs futures: **in futures both sides carry obligations (must perform); in options only the seller is obligated — the buyer holds only a right.** Hence the option buyer's max loss = the premium with theoretically unlimited gain; the seller's gain is capped (the premium) with unlimited risk.

---

## 2. Call and Put: Bullish and Bearish

| Type | Name | Buyer's right | View it expresses |
|---|---|---|---|
| **Call Option** | Bullish option | **Buy** the underlying at the **<mark>strike</mark>** | Bullish |
| **Put Option** | Bearish option | **Sell** the underlying at the strike | Bearish |

- Buying a Call: profit begins only after the underlying passes "strike + premium"
- Buying a Put: profit begins only after the underlying falls below "strike − premium"
- Example: CSI 300 index at 3,800; buy the 3,900 Call for a 50-point premium → at expiry the index must exceed 3,950 to profit (3,900 strike + 50 cost)

---

## 3. The Four Elements: Underlying, Strike, Expiry, Premium

| Element | Meaning | Example (ETF option) |
|---|---|---|
| **Underlying** | The asset the option is written on | SSE 50 ETF, CSI 300 ETF |
| **Strike** | The agreed buy/sell price at expiry | 3.000 yuan |
| **Expiry** | The date the right dies | Fourth Wednesday of each month (monthly contracts) |
| **Premium** | The price the buyer pays and the seller receives | 0.0300 yuan/unit |

> Exact expiry and exercise rules follow **each exchange's latest contract specifications** (CFFEX index options and SSE ETF options differ, for example).

---

## 4. In the Money / At the Money / Out of the Money

Classified by "the relation between current price and strike" (Call for illustration):

| State | Call | Put | Notes |
|---|---|---|---|
| **In the money (ITM)** | Strike < spot | Strike > spot | Immediate exercise yields profit; expensive |
| **At the money (ATM)** | Strike ≈ spot | Strike ≈ spot | Most price-sensitive; fiercest Theta |
| **Out of the money (OTM)** | Strike > spot | Strike < spot | No profit now; cheap; betting on "a surprise" |

Example: SSE 50 ETF spot 2.800 yuan:

- The 2.700 Call = ITM (immediate exercise earns 0.1 yuan/unit)
- The 2.800 Call = ATM
- The 2.900 Call = OTM (valuable only if the ETF rises above 2.9)

---

## 5. Buyer and Seller: Rights and Obligations Compared

| Dimension | **Buyer (Long)** | **Seller (Short)** |
|---|---|---|
| Right/obligation | Rights only | Obligations only |
| Max loss | **The premium** (limited) | **Theoretically unlimited** (naked short) |
| Max gain | Theoretically unlimited | The premium (limited) |
| **<mark>Margin</mark>** | None (just pay the premium) | **Yes (must post margin)** |
| **<mark>Time value</mark>** | Time is the enemy (decays daily) | Time is the friend (harvested daily) |
| Attitude to **<mark>volatility</mark>** | Loves volatility (big swings pay) | Hates volatility (big swings hurt) |

**This is the most important table in the article.** Read it again: the buyer's "limited loss, unlimited gain" is true only on paper — in reality most buyers **hold a limited premium while buying an extremely low probability** — expiring worthless is the norm; the seller's income looks like a steady drip, but **one extreme move (a black swan) can wipe out years of premiums and leave them in debt**. **Neither side has it easy.**

---

## 6. Intrinsic value and Time Value

```text
Option price = Intrinsic value + Time value
```

| Component | Definition | Characteristics |
|---|---|---|
| **Intrinsic value** | What immediate exercise yields = max(spot − strike, 0) (Call) | Exists only for ITM options; zero for OTM |
| **Time value** | Price − intrinsic value | "The price of future possibility"; **bleeds away with time, zero at expiry** |

Example: Call strike 2.800, ETF spot 2.850, option quoted at 0.0800:

- Intrinsic value = 2.850 − 2.800 = 0.0500
- Time value = 0.0800 − 0.0500 = 0.0300
- If the ETF still sits at 2.850 at expiry, the option is worth only 0.0500 → **the 0.03 of time value fully evaporates**

**Time decay is not linear**: the closer to expiry, the faster it decays (especially the final 30 days). That is what "option buyers are racing against time" means.

---

## 7. Implied volatility IV: The Option's "Sentiment Gauge"

**Implied volatility (IV)** is the market's expectation of future underlying volatility, backed out from option prices. It is not historical volatility — it is **the thermometer of market sentiment**.

- **High IV** = the market expects violent swings (panic/euphoria) → options get expensive across the board
- **Low IV** = the market expects calm → options are cheap

### How volatility moves option prices

| Scenario | IV change | Option price | Evidence |
|---|---|---|---|
| Before earnings/major events | Rising | Up (even if the underlying is flat) | Options spike before earnings |
| After the event | Sudden drop (IV Crush) | Collapse | The "double kill" on earnings day |
| Crash regime | Spikes | OTM Puts at sky-high prices | Hedging costs soar in panic |

**Mind the "double kill"**: after buying an option, even with the direction right, if IV collapses when the event lands + time decay, the option can still lose money — **right on direction ≠ the option made money**.

::: warning ⚠️ Right on direction does not mean the option made money
**After buying an option, even with the direction right, if IV collapses when the event lands + time decay, the option can still lose money — right on direction ≠ the option made money.** Options spiking before earnings and getting double-killed on release day is the most classic lesson.
:::

> IV levels have no absolute high or low; compare against their own historical percentile. **Defer to real-time data in option trading software.**

---

## 8. A First Look at the Greeks

The Greeks measure the sensitivity of an option's price to each factor — the "dashboard" of options trading.

| Greek | Measures | Plain reading | Intuition |
|---|---|---|---|
| **Delta (Δ)** | How much the option gains per 1 yuan rise in the underlying | **Direction sense**: Call Delta 0~1, Put −1~0; ATM Call ≈ 0.5 | Index up 100 points, the Call gains ~50 points |
| **Gamma (Γ)** | How fast Delta itself changes | **Acceleration**: largest near the ATM, meaning Delta can blow up fast with the move | The nearer expiry and the closer to ATM, the more "neurotic" |
| **Theta (Θ)** | How much the option loses per passing day | **The cost of time**: buyers pay "rent" to sellers daily | ATM Theta turns brutal near expiry |
| **Vega (ν)** | How much the price gains per 1-point IV rise | **Volatility sensitivity**: event-driven moves are about Vega | In panic, high-Vega contracts explode |

**The two traps retail traders step into most**: watching Delta but not Theta (winning direction, losing time), and watching direction but not Vega (getting hammered by IV collapse after the event). **Remember: buying means starting to pay Theta; selling means starting to collect rent — but the price of collecting rent is tail risk.**

---

## 9. Common Strategies and Their Use Cases

> The following are teaching descriptions of standardized strategies — **exact payoff profiles and margin requirements follow the latest broker/exchange rules**. Beginners should pick from the rightmost column.

| Strategy | Construction | Use case | Max risk |
|---|---|---|---|
| **Buy Call** | Buy a call option | Strongly bullish and expecting an explosive move (direction + volatility both pay) | Total loss of premium |
| **Buy Put** | Buy a put option | Strongly bearish, or panic **<mark>hedging</mark>** | Total loss of premium |
| **Covered Call** | Hold stock/ETF + sell the matching Call | Already holding, expecting mild sideways moves; enhance yield with premium | Assigned in a big rally, missing the upside (gain capped) |
| **Protective Put (insurance)** | Hold stock/ETF + buy a Put | Afraid of a crash; pay premium for insurance | Premium cost drags on long-term returns |
| **Straddle** | Buy an ATM Call + Put simultaneously | Expecting **big movement but unsure of direction** (earnings, major events) | If the event fizzles, both premiums lost |
| **Bull <mark>Spread</mark>** | Buy a lower-strike Call + sell a higher-strike Call | Mildly bullish, want to cut premium cost | Gains capped above the top strike |
| **Bear Spread** | Buy a higher-strike Put + sell a lower-strike Put | Mildly bearish, cutting cost | Gains capped |

**One-line strategy logic**: first judge "is there a directional view + how big is the move + how much time is left", then choose — **with no directional view, spreads/straddles resist time better than naked buying.**

::: warning ⚠️ Buying means paying Theta; selling means carrying the tail
**Buying means starting to pay Theta; selling means starting to collect rent — but the price of rent is tail risk.** The common retail mistakes are watching direction but not time (winning direction, losing Theta), or collecting premium while ignoring the tail — one extreme move can zero out years of rent and leave debt.
:::

---

## 10. Who Trades Options

| Participant | Role | Typical behavior |
|---|---|---|
| **Institutions (hedge funds/asset managers)** | Most active | Use options to hedge (insure), manage portfolio volatility, **<mark>arbitrage</mark>** |
| **<mark>Market makers</mark>** | **<mark>Liquidity</mark>** providers | Quote both sides for the spread; hedge finely with the Greeks |
| **Listed companies / industrial clients** | Hedgers | Lock prices, lock in M&A costs |
| **Retail traders** | Tiny share | Mostly buying-side speculation — and the main prey of Theta and IV |

**The brutal reality**: retail option buyers are betting against "institutions + market makers + statistical edge" at once. Institutions trade options to **manage risk**; retail traders mostly trade options to **gamble for amplified returns** — same instrument, two destinies.

::: danger 💀 The double trap of buyers and sellers
**Most buyers hold a limited premium while buying an extremely low probability — expiring worthless is the norm; the seller's income drips steadily, but one extreme move can wipe out years of premiums and leave debt.** Neither side has it easy — options are not a retail playground.
:::

---

## 11. How to Participate in China

| Market | Representative products | Account requirements (per latest rules) |
|---|---|---|
| **SSE 50 ETF options** (SSE) | Underlying: 510050 | CNY 500k threshold + options knowledge test + simulated trading experience |
| **CSI 300 ETF options** (SSE/SZSE) | Underlying: 510300 / 159919 | Same as above |
| **CSI 500/1000 ETF options, STAR 50 ETF options** | Newer products | Same as above (per the latest list) |
| **Index options** (CFFEX) | CSI 300 index options etc. | Higher threshold (CNY 500k + index futures experience) |
| **Commodity options** (commodity exchanges) | Soybean meal, sugar, gold, crude oil options etc. | Relatively low threshold; linked to commodity futures |
| **US stock options** | Single-stock/index options (e.g., SPY) | Needs a US account and options permission (tiered approval) |
| **Crypto options** | Offered by major exchanges (BTC/ETH options) | High **<mark>leverage</mark>**, round-the-clock, no regulatory protection — **extremely risky** |

> Crypto options have thin liquidity, extreme volatility, and heavy platform risk — **not recommended as a starting point for learning options**. Domestic ETF options have the most standardized rules and the fullest documentation — the **only recommended entry channel for beginners**. Permissions and capital requirements for each product **follow the exchanges' latest announcements**.

---

## 12. Expiry and Exercise Rules

| Rule item | Description (domestic ETF options for illustration; latest exchange rules prevail) |
|---|---|
| Expiry | Fourth Wednesday of each month (postponed for holidays) |
| Exercise style | **European**: exercisable only on the expiry date (domestic ETF options) |
| After exercise | Receive/deliver the underlying ETF (T+1); most retail traders close before expiry |
| Closing | Sell the held option contract (like a stock); no need to wait for exercise |
| Margin | Only the **seller** posts it, per the exchange's formula |
| Total loss | OTM options expire worthless at expiry; premium goes to zero |

**Practical advice**: the vast majority of retail traders never need to "exercise" — **closing before expiry is the mainstream**. A buyer holding to expiry must be clear that "strike + premium = true cost"; if you cannot run that arithmetic, be a seller or stay out.

---

## Risk Warning

::: warning ⚠️ Risk Warning
Options are derivatives of **extreme professional depth and the most complex risk shape**. Retail traders must remember the two root causes of losses:

**① Seller risk**: naked short Calls/Puts have theoretically unlimited loss (domestic short selling is restricted, but extreme markets can still burn all margin and leave debt); a single black swan can swallow years of gains. **Do not sell naked without ample margin and hedging tools.**
**② Time decay (Theta)**: buyers pay time value every day, and **most options expire worthless** — statistically, OTM options expire worthless far more often than they profit. Right direction but not fast enough or volatile enough still burns the entire premium.

Beyond these: IV collapse (IV Crush) causing "right on direction, still losing", thin liquidity making exits hard, and margin calls. All elements, rules, and Greek values in this article are teaching-basis — **defer to the exchanges' latest contract specifications and real-time quotes**. This article does not constitute investment advice; complete the broker-required investor education and risk assessment before trading options.
:::
