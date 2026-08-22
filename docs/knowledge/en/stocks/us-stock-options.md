---
title: "06 · US Stock Options Primer"
description: "A hands-on guide to US stock Options — reading the option chain, four beginner strategies with worked numbers, US permission tiers, margin and tax rules, and the classic ways to blow up"
---

# 06 · US Stock Options Primer

> For the basic concepts of Options (rights vs obligations, the four elements, in/out of the money, the Greeks), read [Options Basics](../markets-instruments/options-basics.md) first.
> This article upgrades that base toward US practice: what the world's most active options market looks like, how to read an option chain, how to run four beginner strategies (with worked numbers), the US-only permission tiers/**<mark>margin</mark>**/tax rules, and the most common ways to die. **Do not touch any strategy here before the basics of Options are fully digested.**

---

## 1. Features of the US Options Market

| Feature | Description |
|---|---|
| The world's most active | Under OCC statistics, US options volume has long exceeded **half of the global total** |
| Underlying types | Single-stock Options (AAPL, TSLA, etc.), index Options (SPX S&P 500, NDX Nasdaq 100), ETF Options (SPY, QQQ) |
| Contract spec | **1 contract = 100 shares** (index Options cash-settle; no share count) |
| Expiry cadence | Monthly Options (third Friday of each month) + **weekly Options (every Friday)** side by side |
| Market-maker depth | Bid-ask spreads on benchmark contracts are razor-thin (often USD 0.01-0.05); the world's deepest liquidity |
| Directional freedom | Two-way trading: buy or sell, naked selling allowed (with permission) — none of the strict seller restrictions of A-shares |

| Type | Examples | Exercise style | Settlement |
|---|---|---|---|
| Single-stock Options | AAPL, TSLA | American | Physical delivery of shares |
| ETF Options | SPY, QQQ | American | Delivery of ETF units |
| Index Options | SPX, NDX | European | **Cash-settled** (only the difference changes hands, no shares delivered) |

---

## 2. American vs European: Why the Exercise Difference Matters in Practice

| Type | Instruments | Feature |
|---|---|---|
| **American Options** | Single-stock and ETF Options | Exercisable early on **any trading day** before expiry |
| **European Options** | Index Options (SPX etc.) | Exercisable **only on the expiry date itself** |

This is not an academic distinction; it hits live trading in three direct ways:

| Scenario | American (single stock/ETF) | European (index) |
|---|---|---|
| Surprise exercise against the seller | **Possible**: near ex-dividend dates, holders of in-the-money calls often exercise early for the dividend, forcing the seller to deliver shares | Not possible: exercise only at expiry; you hold in peace |
| Handling deep in-the-money positions | Mind the tail risk of "exercised at any moment" | Held to expiry, auto-settled; the rules are certain |
| Locking in profit early | Exercise anytime (though closing the position is usually the cheaper choice) | Close only; no early exercise |

> One-line conclusion: **sellers of single-stock/ETF Options must stay alert around ex-dividend dates**; index Options (SPX) have no early-exercise problem, but a single contract carries enormous notional value (on the order of USD 60,000) — not the beginner's first learning instrument.

---

## 3. Delivery and Settlement

| Step | Rules (per your broker's and the OCC's latest) |
|---|---|
| Options trade settlement | Same as stocks, **T+1 settlement** (US markets went fully T+1 in May 2024) |
| Post-exercise delivery | Single-stock/ETF Options exercised → **T+1 share delivery**: exercising a call buys the shares, exercising a put sells the shares |
| Cash-settled products | Index Options settle the difference at the closing settlement price on expiry; cash hits the account directly |
| Automatic exercise | Options **in the money beyond a threshold are auto-exercised** at expiry (generally ITM ≥ $0.01, broker-dependent); close before expiry if you do not want exercise |
| Early exercise | American-option buyers may submit exercise instructions on any trading day |

> The vast majority of traders **never exercise** — closing before expiry is the norm. Exercise happens to two kinds of people: those who genuinely want to buy/sell the shares at the strike, and those who forgot to close.

---

## 4. How to Read an Option Chain

The option chain is the main screen of options trading. Take SPY: each row = the call and the put at one strike for one expiry:

| Field | Meaning | How to read it |
|---|---|---|
| Strike | The agreed buy/sell price at expiry | In/at/out of the money at a glance |
| Expiry | The date the right dies | Monthly = third Friday; weekly = every Friday; plus LEAPS long-dated Options (up to ~2-3 years) |
| Bid / Ask | Best buy / best sell price | Buyers fill at the Ask, sellers at the Bid |
| Spread | Ask − Bid | **The wider the spread, the worse the liquidity**; in-the-money and front-month benchmark contracts are usually razor-thin |
| Volume / OI | Today's volume / open interest | Liquidity check: low volume + low OI = hard in, hard out |
| IV | **Implied volatility** | The "how expensive" thermometer; spikes before earnings |
| Delta | How much the option's price moves per USD 1 of the underlying | Directional sensitivity: an at-the-money call ≈ 0.5 |

### Monthly vs Weekly Options

| Type | Expiry | Characteristics | For whom |
|---|---|---|---|
| Monthly Options | Third Friday of each month | Best liquidity, gentle Theta decay, the benchmark contracts | Position strategies, covered calls, spreads |
| Weekly Options | Every Friday | Cheap, **brutally fast Theta decay**, the lottery ghetto | Short-term traders; beginners stay away |

**Three steps to picking a contract**: fix the expiry first (30-90 days recommended — time value stays manageable without excess decay) → then the strike (directional view + room for error) → finally check the spread and OI to confirm liquidity.

---

## 5. Core Strategies in Practice

> All prices below merely illustrate the math and are not trading advice of any kind. Assume SPY at USD 600; every strategy uses "1 contract = 100 shares".

### 1. Covered Call — collecting rent (owning 100 SPY)

Assume you own 100 shares of SPY (at 600) and expect a month of mostly sideways movement:

- Sell 1 call at strike **620**, expiring in 30 days, **premium** **4.00**
- Premium income = 4.00 × 100 = **USD 400** (credited immediately; hold to expiry or get assigned)

| At expiry | Result |
|---|---|
| SPY < 620 | The option expires worthless; keep the 400 and keep holding the shares |
| SPY ≥ 620 | Assigned: sell at 620; total return = 400 + (620-600)×100 = **USD 2,400** (capped) |

- Essence: **trading "upside" for "certain cash income"** — about 0.7% per month (400 / 60,000), roughly 8% annualized (assuming the underlying does not rally hard)
- The biggest cost: if SPY surges (say to 700), you make only 2,400 instead of 10,000+ — the **missed rally**

### 2. Protective Put — insurance (cost vs black swans)

Assume you own 100 shares of SPY (at 600), fear a crash, but do not want to sell:

- Buy a put at strike **570**, 60 days out, premium **5.50**
- Cost = 5.50 × 100 = **USD 550** (the premium, like an insurance fee)

| Scenario | Result |
|---|---|
| SPY rises instead | Lose the 550 premium; keep the stock's gains |
| SPY falls to 570 | The put starts paying; max loss locked = (600-570)×100 + 550 = **USD 3,550** |
| SPY crashes 20% in a single week (a March-2020-style move) | The stock loses 12,000, the put pays back nearly 10,000 — **total loss still locked within 3,550** |

- Essence: small money buys "disaster insurance" — **a slow bleed in calm times (Theta charges daily), a lifeline in a black swan**
- Common mistake: when insurance is too dear, picking a further out-of-the-money put (cheaper but thinner protection), or shortening the term (lower premium, shorter coverage window)

### 3. Cash-Secured Put — getting paid to buy (margin and assignment flow)

Assume you want to buy SPY at 580 (now 600) while collecting some premium:

- Sell a put at strike **580**, 30 days out, premium **3.00**
- The broker freezes **USD 58,000 of margin** (strike × 100); selling the put pays 300

| At expiry | Result |
|---|---|
| SPY ≥ 580 | The option expires worthless; keep 300 (about 0.5% on the frozen margin — significant annualized) |
| SPY < 580 | **Assigned**: buy 100 SPY at 580; effective cost = 580 - 3.00 = **USD 577/share** |

- Assignment flow: auto-exercised after the expiry close; the shares settle **T+1**
- Essence: **"your target buy price + rent if it never gets there"** — like resting a limit buy order that pays you
- Note: if the stock keeps falling after assignment, you carry the holding loss — selling puts is "taking delivery", not a "bottom-picking magic tool"

### 4. Bull Call Spread

Assume SPY at 600; you expect a moderate rise and find a naked call too expensive:

- Buy the **610** call (premium 12.00)
- Sell the **630** call (premium 5.00)
- Net outlay = (12.00 - 5.00) × 100 = **USD 700**

| At expiry | Result |
|---|---|
| SPY < 610 | Both expire worthless; lose the full 700 (max loss) |
| SPY between 610-630 | Grind from breakeven into profit |
| SPY ≥ 630 | Max profit = (630-610)×100 - 700 = **USD 1,300** |

- Essence: **trading "capped gains" for "half the cost"**; both risk and reward are defined — the best fit for a moderately bullish view
- Versus a naked call: cost drops from 1,200 to 700, and breakeven sits lower too

### Strategy Quick Reference

| Strategy | Construction | Fits | Max risk |
|---|---|---|---|
| Covered Call | Stock + short call | Collecting rent in sideways markets | Upside capped (missed rally) |
| Protective Put | Stock + long put | Insurance for holders afraid of a crash | Premium bleeding over time |
| Cash-Secured Put | Cash + short put | Wanting entry + premium income | The stock keeps falling after assignment |
| Bull Call Spread | Long lower call + short higher call | Moderately bullish | Max loss = net premium |

---

## 6. Rules Unique to US Options

### Options Permission Tiers (the Tier 1-4 basics)

US brokers approve options in **tiers**; the naming varies slightly by broker (some use 0-5). Follow your broker's latest scheme:

| Tier | Allowed strategies | Threshold (rule-of-thumb) |
|---|---|---|
| Tier 1 | Covered Call, Cash-Secured Put | Low: stock/cash is enough; beginner-friendly |
| Tier 2 | Long Call / Put buying | Requires an options knowledge questionnaire and some experience |
| Tier 3 | Spreads | Higher knowledge and asset requirements |
| Tier 4 | **Naked** Call / Put selling | Highest bar: extensive experience, higher net worth, extra broker scrutiny |

> Practical meaning: **beginners usually start with only Tier 1** — which is in fact protection: naked selling and spreads demand deeper understanding and a thicker capital cushion.

### Margin Rules

| Role | Margin requirement |
|---|---|
| Option buyer | The premium only; no margin |
| Cash-secured seller | Strike × 100 in frozen cash (the "secured" in cash-secured — what makes taking delivery safe) |
| Naked seller (margin account) | Per the broker's formula (roughly a fraction of notional + premium); **must keep topping up as the market moves against you** |
| Portfolio margin | For institutions/whales, computed off a portfolio-wide risk model; effectively unavailable to retail |

**Margin shortfall → forced liquidation**: the broker may **force-close** positions once floating losses eat the margin, and forced closes tend to fill at the worst prices.

### Tax Basics (non-residents; defer to professionals)

- For non-resident aliens (NRAs filing W-8BEN): **US capital gains are generally not taxed in the US** — the spread from closing or exercising Options usually does not touch US income tax
- But the following may be withheld or owed:
  - **Dividends** on shares acquired via exercise → 30% dividend withholding
  - Under certain conditions, income from selling options can be treated as a "dividend equivalent" and withheld at 30% (classically, high-Delta strategies near ex-dividend dates)
  - Spending over 183 days in the US / becoming a US tax resident triggers entirely different rules
- ⚠️ **Cross-border tax is extremely complex; this is rule-of-thumb only — defer entirely to professional tax advice and the latest IRS rules**

### **Leverage** and **Blow-Ups**: A Naked Short Force-Liquidated

```text
Account: USD 20,000
Trade: naked-sell 3 TSLA calls at strike 100, premium 2.00 (collect 600)
Setup: TSLA at 95, "it can't possibly reach 100"

Earnings land, TSLA rockets to 150:
  Floating loss = (150 - 100) × 3 × 100 = USD 15,000
  Margin shortfall → broker force-closes (buys back the 3 calls at market)
  Realized loss ≈ USD 14,000+ (far beyond the premium collected; 70% of the account)
```

- In extreme moves (short squeezes, earnings blow-ups), a naked short's loss is **theoretically unlimited**; a single forced close can swallow the whole account

::: danger 💀 Naked-selling losses are theoretically unlimited — one forced close swallows the account
**In extreme moves (short squeezes, earnings blow-ups), naked-selling losses are theoretically unlimited; a single forced close can swallow the whole account — if the underlying keeps rocketing and the broker cannot close in time, the account can go negative.** Never sell naked without ample margin and risk capacity.
:::
- If the underlying keeps rocketing and the broker cannot close in time, the account can end up **owing money (negative balance)**

---

## 7. The Classic Ways to Die

| Death | Typical scene | Ending |
|---|---|---|
| **Naked call meets a moonshot** | Earnings, a squeeze (GME 2021), a stock doubling in a day | Unlimited loss; years of premium gone in days, possibly owing money |
| **Lottery weeklies going to zero** | Buying cheap options 1-2 days from expiry (the USD 0.05 lottery ticket) | Theta devours them; 95%+ expire worthless; nine small wins, one total loss |
| **Illiquid chains** | Deep out-of-the-money, weekly backwaters, pre/after-hours trading | Enormous bid-ask spreads; a round trip loses 30-50% to the spread alone |
| **IV crush double-kill** | Buying calls before earnings on direction; direction right, volatility collapses after | "Right on direction, losing anyway" |
| **Forgetting the expiry date** | Holding into expiry without closing | Auto-exercise delivers/takes shares; surprise positions and tax bills |

> Summary of deaths: **buyers die of time and volatility; sellers die of extreme moves** — both bypass your directional call. The first lesson retail traders must learn is "respect".

::: danger 💀 The two great option deaths: buyers die of time and volatility, sellers die of extreme moves
**Buyers die of time and volatility; sellers die of extreme moves — both bypass your directional call.** The first lesson retail traders must learn is "respect": even a correct directional call can lose money to time or volatility.
:::

---

## ⚠️ Risk Warning

::: warning ⚠️ Risk Warning
Options are **one of the most complex instruments in risk shape and the biggest source of retail losses**; this article stresses seller risk above all:

**① Seller risk (the biggest minefield)**: losses on naked Call/Put selling are **theoretically unlimited**. A single black swan (earnings blow-up, squeeze, circuit breaker) can wipe out years of premium income and leave you **owing the broker money**. Cash-Secured Puts are cash-collateralized and cannot blow up into debt, but the loss after assignment when the stock keeps falling is just as real. **Never sell naked without ample margin, hedging tools, and risk capacity.**

**② Buyer risk**: time decay (Theta) bleeds daily, and most Options expire worthless; the IV collapse after events like earnings produces "right on direction, losing anyway". Lottery weeklies and deep out-of-the-money tickets are the surest ways to lose money.

**③ Rule risk**: permission tiers, margin formulas, forced-liquidation rules, and exercise/settlement details all defer to **your broker's and the OCC's latest rules**; cross-border tax defers to **professional tax advice**.

This article is education and worked examples only; example prices are not investment advice of any kind. Complete your broker's options investor education and risk assessment before considering live trading.
:::
