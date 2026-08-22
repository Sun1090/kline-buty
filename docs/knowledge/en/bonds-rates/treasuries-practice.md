---
title: "Treasury Investment in Practice"
description: "Treasuries (US government bonds) are the anchor of the global risk-free rate and the 'cleanest fixed income' ordinary investors can buy — no credit risk (under the assumption that Treasuries don't default), only interest rate risk"
---

# Treasury Investment in Practice

> Treasuries (US government bonds) are **<mark>the anchor of the global risk-free rate</mark>** and the "cleanest fixed income" ordinary investors can buy — no credit risk (under the assumption that Treasuries don't default), only **<mark>interest rate risk</mark>**.
>
> The concepts chapter covered "price and yield move inversely." This chapter dives into practice: **how instrument types are classified, how to read yields, which channels to buy through, what **<mark>duration</mark>** really means, when to hold to maturity, when to sell, and how much an ordinary investor should actually allocate.**

---

## I. Treasury Types: T-Bill / T-Note / T-Bond

The US Treasury issues debt in three maturity buckets, colloquially lumped together as Treasuries:

| Instrument | Maturity | Quote convention | Characteristics |
|---|---|---|---|
| **T-Bill** | Under 1 year (4/8/13/26/52 weeks, etc.) | **<mark>Issued at a discount</mark>**: bought below par, redeemed at face value at maturity, no interim coupons | A near-cash instrument with minimal rate sensitivity; tracks the Fed's policy rate most closely |
| **T-Note** | 2 / 3 / 5 / 7 / 10 years | Quoted against par of 100, pays interest semiannually | The 10Y is the world's most actively traded bond and the strongest pricing benchmark |
| **T-Bond** | 20 / 30 years | Quoted against par of 100, pays interest semiannually | Longest duration, most rate-sensitive, and the most likely to get hurt in hiking cycles |

::: info 📖 Quote Conventions
T-Notes/T-Bonds are quoted against a "par of 100" basis — 98.5 means 98.5% of face value; trading also commonly uses 1/32-point (tick) granularity. **Exact quoting rules are subject to the latest regulations/policy and your broker's conventions.**
:::

### Intuition for Choosing a Maturity

- **Dollars you'll need within a year (or might)** → T-Bills: like a deposit, almost no price movement.
- **A steady 3–5 year allocation** → intermediate T-Notes: middle ground on both yield and volatility.
- **10y/30y** → violent volatility; these are the main battleground for institutions and hedge funds. Retail investors should understand exactly what they're buying before touching them.

### Two Advanced Instruments (As Needed)

| Instrument | What it is | Features |
|---|---|---|
| **TIPS (Treasury Inflation-Protected Securities)** | Treasuries whose principal adjusts with the CPI index | Purpose-built inflation fighters; real yields are usually lower than nominal Treasuries; issued across 5–30 year maturities |
| **STRIPS (Separate Trading of Registered Interest and Principal)** | Splits a Treasury's coupons and principal into individual zero-coupon securities | Zero-coupon with extremely long duration (a 30-year STRIPS has duration 30); used by institutions for liability matching — rarely by retail |

::: tip 💡 The Core Logic of TIPS
**Nominal yield = real yield + inflation expectations.** Rising TIPS yields (i.e., real rates) are the biggest enemy of gold and growth stocks — in 2022 real yields surged and both gold and tech stocks came under pressure, exactly this transmission chain at work (subject to the latest data).
:::

---

## II. How to Read Yields: YTM vs Coupon

Two concepts must be kept separate (covered in the concepts chapter; a quick review):

| Concept | What it is | Determined by |
|---|---|---|
| **<mark>Coupon rate</mark> (Coupon)** | The annual interest percentage fixed in the contract | Market rates at issuance; never changes |
| **<mark>Yield to maturity</mark> (YTM)** | The **actual annualized return** from buying at today's market price and holding to maturity | Fluctuates with market price, changes in real time |

**For the same bond, the coupon is a dead number; YTM is alive.** When news says "the US 10Y yield is 4.3%," it refers to the YTM level of newly issued 10-year Treasuries — also the pricing benchmark for global assets.

Why does an old 3%-coupon bond deliver a 4% YTM if held to maturity? Because its market price has already fallen below 90 — **you buy cheap, so besides collecting $3 of interest per year per $100 face value, you also pocket the gap between face value and purchase price at maturity**. Annualized together, that's the YTM.

::: info 📖 Two Phrasings, One Fact
When media say "yields rose" = "bond prices fell" = "bond bear market" — two phrasings for one fact; don't get spun around.
:::

---

## III. Price and Yield Move Inversely: A Back-of-Envelope Estimate

Bond prices move **strictly inversely** to yields (proven in the concepts chapter). Here's a mental-math intuition:

**Rule of thumb: a bond with duration of roughly D years moves about D% inversely for every 1 percentage point change in yield.** (First-order approximation; ignore convexity correction for now.)

### Numeric Example (teaching approximation; actual prices depend on the market)

- Current 10Y Treasury yield is **4.0%**; a 30-year bond with a 4% coupon and 100 face value trades at roughly 100.
- If the yield rises to **4.5%** (+0.5%), and the 30-year bond's duration is about **17–18**:
  - Estimated price decline ≈ 17 × 0.5% ≈ **8.5%**
  - Actual decline is slightly smaller (convexity), about **7%–8%**, i.e., price falls to around 92–93.
- For contrast: a 2-year T-Note with duration ~2 drops only about **1%** on the same +0.5%.

::: tip 💡 Long Bonds Are Rate Amplifiers
**The same +0.5% in yields: 30-year bonds fall ~8%, 2-year notes only ~1%.** Buying 30-year bonds earns you money from falling long-end rates, but the price is enduring 8x the volatility.
:::

---

## IV. Three Ways to Buy Treasuries

| Method | Threshold | Pros | Cons |
|---|---|---|---|
| **Direct brokerage purchase** (IBKR and other international brokers) | Just open an account; single trades from a few thousand dollars | Precise selection of maturity/coupon; can hold to maturity; no management fee | Account opening and capital outflow compliance requirements are strict; bid-ask **spreads** are unfriendly to small sums |
| **Treasury ETFs** (SHY / IEI / TLT, etc.) | From one share, tens of dollars | Extremely low threshold, good **liquidity**, easy trading (T+0) | Management fees apply; **an ETF has no maturity date, its price never converges back to par**, so duration risk persists indefinitely |
| **QDII bond funds** (domestic USD-bond mutual funds) | From ~1,000 RMB | No overseas account needed; subscribe directly in RMB | Subject to quota premiums and purchase limits (historically common); slow redemption (T+7 common); extra fee layers |

### Treasury ETF Duration Comparison (subject to the latest data)

| ETF (reference) | Tracks | Duration (approx.) | Character |
|---|---|---|---|
| SHY | 1–3 year Treasuries | ~2 years | Near-cash substitute, tiny volatility |
| IEI | 3–7 year Treasuries | ~4–5 years | Medium duration, conservative profile |
| TLT | 20+ year Treasuries | ~17 years | High duration, high volatility, the rate bellwether |

::: info 📖 Related Products
Tickers subject to the latest regulations/policy; peers include IEF (7–10 years), VGSH (short end), and others, each differing in fees and duration — check holdings maturity before buying.
:::

### Practical Details of Direct Bond Purchases (IB and similar brokers)

- **Primary market (Auction)**: the US Treasury auctions new issues on a fixed calendar; brokers can participate on your behalf via non-competitive bids filled at the auction's weighted average price — no bid-ask spread, the simplest way to buy.
- **Secondary market purchases**: you can trade outstanding bonds at market prices anytime, but note: **secondary quotes include accrued interest**; the **<mark>purchase price</mark>** = clean price + accrued interest. Liquidity varies widely by maturity — best near the 10Y point, wider spreads for off-the-run distant maturities.
- **Automatic settlement at maturity**: bonds held to maturity have principal plus final coupon credited automatically — no need to sell.
- **Fees**: brokers typically charge zero commission or no transaction fee (Treasury interest is exempt from state tax at the federal level; reporting rules are subject to the latest regulations/policy) — the main cost is the bid-ask spread.

---

## V. Duration: The Core Measure of Rate Sensitivity

**Duration ≈ price sensitivity to rates**: a bond with duration 5 moves about 5% (inversely) for every 1% change in rates.

| Instrument | Duration (approx.) | Price at +1% rates | Price at −1% rates |
|---|---|---|---|
| T-Bill (3 months) | <0.25 | −0.25% | +0.25% |
| 2Y T-Note | ~2 | −2% | +2% |
| 10Y T-Note | ~8–9 | −8%~−9% | +8%~+9% |
| 30Y T-Bond | ~17–18 | −17%~−18% | +17%~+18% |
| **TLT (20+ ETF)** | **~17** | **around −17%** | around +17% |

### Why Did TLT Crash 30%+ During the 2022 Hikes?

In 2022 the Fed hiked aggressively; the 10Y yield went from ~1.5% to above 4%, and long-end yields rose even more:

- TLT's duration is ~17; yields rose about 2 percentage points → first-order estimate is a **34%** price drop; adding convexity effects and basis effects measured off the post-September-2022 high gives an **actual drawdown of 30%+** — that's the mechanism behind "the safest asset" losing 30% that year.
- Over the same period the 2-year ETF (duration ~2) drew down only a few percent.

> **Duration cuts both ways**: in easing cycles TLT also rebounds hardest (it surged when rate-cut expectations heated up in late 2023). It isn't a "direction" indicator — it's a "volatility multiplier" indicator.

::: danger 💀 Iron Rule: Duration Is a "Volatility Multiplier," Not a "Direction" Indicator
**Duration cuts both ways.** TLT with duration 17 loses roughly 17% of price for every 1% rise in yields — during the Fed's aggressive 2022 hikes it crashed 30%+ in a single year; that's the mechanism behind "the safest asset" losing 30%. So duration isn't a "direction" indicator but a "volatility multiplier": buying 30-year bonds earns money from falling long-end rates, but the price is enduring 8x the volatility.
:::

---

## VI. Hold to Maturity vs Trade: Two Completely Different Kinds of Money

### Hold to Maturity (Buy & Hold)

- The YTM at purchase is locked in: **hold to maturity and no matter how rates move along the way, you earn the YTM you locked in** (provided no default; Treasuries are considered extremely low credit risk in local-currency terms).
- Interim price declines are just "paper losses"; receiving par at maturity closes it out — **interim mark-to-market swings contribute exactly zero to the realized return**.

### Selling Before Maturity (Trading)

- The price is fully exposed to rate fluctuations: rates up → sell at a loss; rates down → sell at a profit.
- Here your profit doesn't come from the coupon but from **getting the direction of rates right** — that's already "trading."

### Numeric Example (teaching approximation)

- Buy a 30-year bond at YTM 4% and hold to maturity → 4% annualized, locked.
- Rates rise to 5%; the price drops 8%; you sell now → roughly an 8% loss on principal (plus accrued interest earned while holding).
- Same scenario, **but if you hold to maturity, not a cent of the 4% YTM is missing** — that's the moat of "holding to maturity" over "trading."

::: tip 💡 Conclusion: Decide First Which Money You're Chasing
**If you buy for the yield-to-maturity, pick a term without guessing direction; if you buy for the price spread, you must hold a view on rates.** Most retail losses come from taking money meant to be "held to maturity" and turning it into a "sell-before-maturity" trade.
:::

::: warning ⚠️ Counterintuitive: Holding vs Selling Earns Two Completely Different Kinds of Money
**If you buy for the yield-to-maturity, pick a term without guessing direction; if you buy for the price spread, you must hold a view on rates.** Held to maturity, the YTM arrives intact; sold early, the price is fully exposed to rate swings — most retail losses come from turning "hold-to-maturity" money into a "sell-early" trade. So before buying Treasuries ask yourself: is this money meant to be held to maturity, or traded on the direction of rates?
:::

---

## VII. Treasuries as a Near-Substitute for Dollar Cash

T-Bills and dollar cash (USD deposits / USD money funds) are close cousins:

| Tool | Yield character | Liquidity | Risk |
|---|---|---|---|
| USD bank deposits | Posted bank rate, moves with the Fed | Term deposits lock funds; early withdrawal pays demand-deposit rates | Very low |
| USD money market funds | Track short-term rates; historically close to T-Bills | T+0/T+1 | Very low |
| **T-Bills (<1 year)** | Market-based "cash yield," usually above same-term deposits | Sellable any time in the secondary market | Very low; price fluctuation negligible |

**The "cash yield" logic**: when Fed rates sit high, simply "sitting in cash" earns 4%–5% annualized (subject to the latest rates) — that itself is an asset allocation decision. (The so-called T-Bill carry trade — borrowing low-rate currency, converting to USD, and buying T-Bills for the differential — is institutional behavior; individuals mainly use its yield as a comparison benchmark.) **When risk-free cash yields are high enough, the opportunity cost of stocks and long bonds rises — exactly why high rates suppress risky assets.**

---

## VIII. Allocation Framework for Ordinary Investors

### Start With the Yield Comparison (common-knowledge figures; subject to the latest rates)

| Option | USD annualized (approx.) | Volatility | Suited for |
|---|---|---|---|
| USD demand / call deposits | Low | None | Dollars needed anytime |
| USD time deposits | Medium (generally higher with longer terms) | None (except early withdrawal) | Funds untouched for 1–2 years, locking the term rate |
| USD money fund / T-Bills <1 year | Close to the Fed rate | Very low | Cash management within a year |
| Intermediate Treasuries / short-duration ETFs | Term premium | Small–medium | A steady 2–5 year allocation |
| Long Treasuries / TLT | Long-end yield + capital gains elasticity | Large | Betting on falling rates or hedging a portfolio |

### Lock Long or Lock Short: A Decision Framework

1. **No idea where rates go → lock short**: T-Bills/short-term paper — decent yield, zero volatility, essentially "pocketing the Fed's rate."
2. **Believe hikes are ending / cuts are coming → lock long**: pre-lock high long-end yields, plus potential capital gains as prices rise (duration gains).
3. **Portfolio "insurance" → use long bonds**: in years when stocks crash and rates fall, long bonds are negatively correlated with equities — a hedge (note it fails in stock-bond double-crush years like 2022).
4. **RMB considerations → remember returns are in dollars**: converting Treasury returns back to RMB stacks FX volatility on top; RMB appreciation eats into returns (see Chapter 14 on overseas allocation).

### Common Mistakes

- Buying 30-year bonds as a "deposit" — **not realizing you're trading duration**.
- Going all-in on long bonds mid-hiking-cycle to catch the bottom — **the 2022 lesson: while the rate trend hasn't ended, duration can keep breaching your tolerance for unrealized losses**.
- Buying QDII RMB share classes at high premiums — **the premium itself is where losses begin**.
- Looking only at "the YTM number" without checking "remaining maturity" — **a 5% 10-year and a 5% 30-year are entirely different investments** (double the duration, double the volatility).
- Confusing "coupon income" with "total return" — in easing cycles an ETF's total return includes capital gains, of which the coupon is just part; in hiking cycles the coupon won't cover price losses.

### One-Line Summary

**Treasuries are the "cleanest" allocation tool ordinary investors can buy among global assets: use T-Bills for cash, intermediate T-Notes to lock yield, and long bonds to express a rate view or hedge a portfolio — provided you know which duration you're buying.**

::: danger 💀 Iron Rule: Buying a 30-Year Bond as a "Deposit" Means You Don't Know You're Trading Duration
**Buying a 30-year bond as a "deposit" — means not realizing you're trading duration.** The 2022 lesson: while the rate trend hasn't ended, duration can keep breaching your tolerance for unrealized losses. So the first question when buying Treasuries should be: which duration am I buying, and can I stomach its sensitivity to rates?
:::

---

## Risk Warning

::: warning ⚠️ Risk Warning
Treasuries are not a "risk-free asset": **interest rate risk** (long-duration instruments can swing 10%–30% in price), **currency risk** (volatility when converting dollar assets back to your home currency), and **inflation risk** (if nominal returns trail inflation, you lose in real terms) all exist. Holding to maturity locks the YTM, not purchasing power. Overseas brokers/capital outflows must comply with current FX and regulatory rules (subject to the latest regulations/policy). All yields, durations, and prices here are teaching approximations; **defer to the latest market data**. This article is not investment advice.
:::
