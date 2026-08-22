---
title: "China Bond Market in Practice"
description: "China's bond market is the world's second largest, yet over 90% of trading happens in the interbank market — the institutional playground. Retail investors' real arena is the exchange market, and there's plenty to play with: government bond reverse repos, savings bonds, bond funds, convertible bonds"
---

# China Bond Market in Practice

> China's bond market is the world's second largest, yet **<mark>over 90% of trading happens in the interbank market</mark>** — the institutional playground. Retail investors' real arena is the exchange market, and there's plenty to play with: government bond reverse repos, savings bonds, bond funds, convertible bonds.
>
> This chapter dives into how China's bond market actually works: get the structure straight first, then dissect every retail-accessible tool in detail, and finally see clearly the institutions' carry game and the risk truth behind "**<mark>breaking implicit guarantees</mark>**."

---

## I. Market Structure: Interbank vs Exchange

| Market | Participants | Share of volume | Can individuals participate? |
|---|---|---|---|
| **Interbank market** | Banks, insurers, funds, brokers and other institutions | **~90%+** | Not directly (only indirectly via funds, etc.) |
| **Exchange market** | Institutions + qualified individual investors | Under ~10% | Can trade Treasuries, local government bonds, corporate bonds, convertible bonds |

### Outstanding Stock Composition (common-knowledge figures; defer to latest data)

| Instrument | Issuer | Approximate share | Risk |
|---|---|---|---|
| **Government bonds (Treasuries)** | Ministry of Finance | Around 20% of outstanding | No **<mark>default</mark>** risk in local currency; benchmark rates |
| **Local government bonds** | Local fiscal authorities | **Largest single instrument class in recent years (~40%)** | Backed by local fiscal credit; low risk |
| **Financial/policy bank bonds** | Policy banks, commercial banks, etc. | Around 20% of outstanding | Low risk; mainstream institutional allocation |
| **Credit bonds** (enterprise/corporate bonds, MTNs, commercial paper) | Corporates | Around 20% of outstanding | Depends on issuer quality; highly dispersed |

::: info 📖 Why Retail Lives on the Exchange
The interbank market is a wholesale market between institutions — minimum trade sizes, account systems, and quoting habits are all built for them. The exchange market is the counter prepared for retail investors. So "the retail China bond market" ≈ exchange-traded Treasuries/corporate bonds/convertibles + over-the-counter savings bonds and funds.
:::

---

## II. Government Bond Reverse Repos: The Retail "Cash-Like" Tool

A **government bond reverse repo** = you lend money, the counterparty pledges government bonds, principal plus interest is repaid at maturity. In essence it's "overnight/short-term lending collateralized by Treasuries" — credit risk is extremely low (collateral is government paper).

### Codes and Thresholds (subject to the latest regulations/policy)

| Market | Instrument | Code | Entry threshold (reference) |
|---|---|---|---|
| Shanghai | GC001 (1 day) and the GC series | 204001 etc. | From 100,000 RMB |
| Shenzhen | R-001 (1 day) and the R series | 131810 etc. | From 1,000 RMB |

- You act by choosing **"sell"/"lend securities"** (you are lending funds); just enter the code and annualized rate, and funds return automatically at maturity.
- Funds usable T+1, withdrawable T+2 (subject to each broker's latest rules).

### When Are Rates High?

- **Month-end, quarter-end, year-end**: assessment points for banks/institutions tighten funding; reverse repo rates spike seasonally.
- **Before long holidays (Spring Festival / National Day / May Day)**: demand for funds peaks; historically 3%–10% or higher annualized was common (subject to the latest conditions).
- **Normal times**: usually only 1%–2%, fluctuating with the pace of central bank **<mark>liquidity</mark>** injections.
- **Pattern**: **the rate center is set by funding tightness, and it reliably rises around quarter/year/holiday crossings**.

### How Returns Are Calculated (numeric example, teaching approximation)

```text
Return ≈ lent amount × annualized rate × actual days funds are occupied ÷ 365
```

- Buy GC001 one day before National Day at a 6% annualized rate, funds occupied 8 days (holidays count):
  - On 100,000 RMB: ≈ 100,000 × 6% × 8 ÷ 365 ≈ **131.5 RMB**
- The same 100,000 RMB on a normal day at 1.8% for 1 day: ≈ 100,000 × 1.8% × 1 ÷ 365 ≈ **4.9 RMB**
- Net of fees (on the order of one hundred-thousandth), pre-holiday returns clearly beat same-period money funds and demand deposits.

### Versus Money Funds / Deposits

| Tool | Yield elasticity | Liquidity | Suited for |
|---|---|---|---|
| Demand deposits | Low | Anytime | Everyday pocket cash |
| Money market funds | Stable (roughly the 7-day repo range) | T+1 | Daily cash management |
| **Reverse repos** | Low normally, **spiking at key moments** | Back at maturity | Month/quarter ends and pre-holiday "picks" |

::: tip 💡 Practical Tip: Watch the Key Dates
**Watch reverse repo rates 1–2 days before long holidays and on the last 1–2 trading days of a quarter**; switch if they're clearly above money funds. Don't bother otherwise.
:::

---

## III. Savings Bonds: The Counter's "Risk-Free Deposit"

Savings bonds come in two types, purchasable only at bank counters/online banking, **not tradable on secondary markets**:

| Type | Certificate form | Rate features | Early redemption |
|---|---|---|---|
| **Certificate-type** | Paper certificate/electronic record; lump-sum principal + interest at maturity | Fixed at issuance | Tiered interest accrual after 6 months of holding, with a handling fee; early redemption forfeits some interest (subject to the latest rules) |
| **Electronic-type** | Electronic account; **interest paid annually** | Fixed at issuance, interest arrives yearly | Early redemption deducts interest and fees, and **usually only full redemption is supported** (subject to the latest rules) |

- Threshold: from 100 RMB (subject to the latest rules); issued periodically through the year and **often sells out instantly** — popular tenors (3/5 years) require a scramble.
- Rate character: somewhat above same-term time deposits, less flexible than secondary-market Treasuries, but **no mark-to-market risk** (hold to maturity and the **<mark>coupon</mark>** is paid as contracted).
- Suited for: **extremely conservative money certain not to move within 5 years**.

::: tip 💡 In an Easing Cycle, the Earlier You Lock, the Better
Savings bond coupons **declining year after year** is historical normal (they track easing cycles): "grabbing an issue means locking today's rate." In an easing cycle, earlier locking beats later.
:::

---

## IV. Bond Funds: A Risk-Return Hierarchy

| Type | Investment scope | Historical annualized range (reference) | Typical max **<mark>drawdown</mark>** (reference) | Risk |
|---|---|---|---|---|
| **Short-term bond funds** | Mostly bonds under 1 year | 2%–3% | Tiny (a few thousandths) | Very low |
| **Pure bond funds** (intermediate/long) | Bonds only, no equities | 3%–5% | 2%–4% | Low |
| **Hybrid bond funds** (secondary) | ≥80% bonds + ≤20% stocks/convertibles | 4%–7% | 5%–10% | Medium |
| **Convertible bond funds** | Mainly convertibles | Highly elastic: can double in bull markets, halve in bears | 15%–40% | High |

### "Hidden Leverage" and NAV Volatility

- Bond funds commonly lever up via **repo financing** (public bond fund leverage cap ~140%, subject to the latest regulations/policy): the fund company borrows to buy more bonds, amplifying both returns and volatility — **the NAV swings you see are post-leverage results**.
- **Bond funds can lose money too**: in November 2022's domestic bond market correction, many pure bond funds drew down more than 1% in a month (seismic for low-risk products), mainly due to rapidly rising rates and a negative feedback loop of wealth-management redemptions. Lesson: **bond funds ≠ "can't fall"**; short-duration holds up better than intermediate/long, and redemption waves hurt more than the hikes themselves.

::: tip 💡 Three Things to Check When Picking a Bond Fund
**Is <mark>duration</mark> long (<mark>rate risk</mark>)? Is leverage high (amplification factor)? Is the convertible share large (a source of volatility)?** — their combination determines NAV volatility.
:::

::: danger 💀 Iron Rule: Bond Funds Are Not "Can't-Fall" Assets
**Bond funds can lose money — in November 2022's domestic bond correction, many pure bond funds drew down more than 1% in a month (seismic for low-risk products), mainly due to rapidly rising rates and the wealth-management redemption feedback loop.** Lesson: **bond funds ≠ "can't fall"**; short duration resists better than intermediate/long, and redemption waves hurt more than hikes themselves. So treating a bond fund as a "deposit replacement" invites real NAV losses when hikes and redemption waves hit together.
:::

---

## V. Convertible Bonds Deep Dive

A convertible = bond + free option: within the agreed window it can be converted into stock at the conversion price. **Bond floor below, equity upside above**, T+0 trading, no daily price limits (circuit breakers added under newer Shanghai/Shenzhen rules; subject to the latest regulations/policy).

### 5.1 Bond Floor and Conversion Premium

| Concept | Meaning |
|---|---|
| **<mark>Bond floor</mark> (straight-bond value)** | Its value as an ordinary bond — coupon plus redemption price discounted; forms the price "floor" |
| **Conversion value** | Current stock price × 100 ÷ conversion price |
| **<mark>Conversion premium</mark>** | (Convert price ÷ conversion value − 1). High premium = weak equity character, sluggish upside follow-through |

- Premium ≈ 0 → the convert moves almost in lockstep with the stock (equity-like); high premium → rises slower than the stock (bond-like).
- **The lower the price, the closer to the bond floor**: near par of 100, downside is cushioned by the floor while upside tracks the stock — the "downside protection" story only truly holds here.

### 5.2 Forced Redemption Clause (The Issuer's "Death Sentence")

- If the underlying stock closes at ≥ **130%** of the conversion price for a stretch of days (e.g., 15 of 30), the issuer may redeem at par plus accrued interest (terms per each convert's prospectus).
- After a **<mark>forced redemption</mark>** announcement, converts often fall from 130+ toward 100–105 — **holders who neither convert nor sell get bought out at 100, vaporizing the premium**.
- Practical meaning: **never hold a convert nearing forced redemption as an "unrealized bull story."**

::: danger 💀 Iron Rule: Never Hold a Convert Near Forced Redemption
**Never treat a convert nearing forced redemption as an "unrealized bull story."** After the announcement, converts often fall from 130+ toward 100–105 — holders who don't convert or sell get bought back at 100, vaporizing the premium. So the biggest risk in convertibles isn't the underlying stock but clause games: read each issue's prospectus terms, and never mistake "floor" for "principal guarantee."
:::

### 5.3 The Double-Low Strategy (Entry-Level Parameters)

- **Double-low = low convert price + low conversion premium**; classic screen: price < 110 (or 115), premium < 30% (parameters vary by strategy and market conditions; subject to the latest data), then rank and diversify across names.
- Logic: low price → near the bond floor, limited drawdown; low premium → follows the stock as soon as it rallies.
- Caveat: the double-low strategy buys **patience for **<mark>volatility</mark>**** — if the stock doesn't rise during your holding period, the convert drifts sideways or bleeds slowly (time cost). It is not a "guaranteed return" strategy.

### 5.4 The "Downward Revision Game": Relatively Higher-Certainty Opportunities

- **Downward revision clause**: when the underlying falls sharply, the issuer may lower the conversion price (requires shareholder meeting approval); conversion value jumps, and the convert usually gaps up.
- Why would issuers revise down? Because they **don't want to repay the debt** — pushing the stock toward conversion turns debt into equity.
- Game-theory essentials:
  - High yield to maturity + major shareholders motivated to convert (e.g., large convert share outstanding, company short of cash) → high probability of revision;
  - But **revision is a "right," not an "obligation"**; announcements are uncertain, and shareholder meetings have genuinely voted revisions down.
  - Discipline: **enter only once a revision lands and the price is reasonable; never go heavy on rumors of a "possible revision."**

::: warning ⚠️ Clause Games Run Deep — Read Each Issue's Terms
Convertibles are retail investors' advanced "attack-and-defense" tool in the bond market, but clause games run deep: **read each issue's prospectus terms** (conversion price, put, forced redemption, revision thresholds all differ), subject to the latest announcements.
:::

---

## VI. The Institutional Games of the Bond Market

### Carry Trade: Borrow Short, Buy Long

```text
Logic: borrow short-term funds at low rates (repos), buy longer-dated bonds yielding more
Return = long-end yield − short-end funding cost = term spread (carry)
Risk = when rates rise, falling long-bond prices eat the carry
```

- When the curve is steep (low short end, high long end), carry is fat and institutions lever up eagerly; when flat/inverted, carry compresses to zero or negative and institutions are pushed into directional rate trades.
- **Why retail can't copy this**: institutions lever via repo financing (leverage of several to a dozen-plus times), amplifying both returns and volatility; retail has no funding access (individual repo thresholds are extremely high) and can't withstand the **<mark>forced liquidation</mark>** pressure that levers positions face when rates rise.

### Leverage: A Double-Edged Sword

- In bond bull markets, institutions feast on "leverage + coupon"; once rates rebound, deleveraging accelerates the decline (the November 2022 "redemption → selling → more redemption" spiral being the classic case).

::: tip 💡 Why Understanding Institutional Games Matters
Reading institutional games isn't about imitation — it's about **finding low prices at the moments institutions are forced to liquidate (panic selling)** and avoiding crowded, richly valued trades.
:::

::: tip ✅ Conclusion: Find Low Prices When Institutions Are Forced Out; Avoid Crowded Trades
**Reading institutional games isn't imitation — it's finding low prices at forced-liquidation moments (panic selling) and avoiding crowding.** In bond bull markets, institutions profit handsomely from "leverage + coupons"; once rates rebound, deleveraging accelerates declines (November 2022 being typical). Retail's correct stance isn't to follow the leverage but to wait for such "stampede" moments and pick up bargains.
:::

---

## VII. China Bond Market Risks: Breaking Implicit Guarantees

### The Process of "Breaking Implicit Guarantees"

- 2014: the "11 Chaori Bond" default (China's first substantive credit bond default); 2015–2016: chain defaults like the "12 Shengda Bond" — **the belief that "SOEs never default" began to crack**.
- 2016: the "15 Tewoo" event — a centrally-affiliated issuer suspended payments and the market shook; afterward **implicit-guarantee expectations were thoroughly broken** and credit bond pricing shifted to genuine risk pricing.
- Private-enterprise defaults became routine (every year; specific cases subject to the latest market data), and the myth of "stable returns" from bond funds/wealth products dissolved.

### The Divergence of Chengtou (LGFV) Bonds

| Historical phase | Characteristics |
|---|---|
| Past | Local government financing platform (chengtou) debt was treated as quasi-sovereign credit with strong implicit guarantees |
| Present (subject to the latest regulations/policy) | As debt-resolution policies advance, **risk pricing diverges between high-debt regions and weaker platforms**; "on-balance-sheet bond guarantees" coexist with "off-balance-sheet defaults" — public bonds and non-standard instruments are two different things |
| Core discipline | **Chengtou bonds are not "risk-free"; any "XX will never default" narrative is not a reason to buy** |

### Three Cognitive Upgrades for Ordinary Investors

1. **"Bonds can lose money too"**: rate risk and credit risk show up in real NAVs (November 2022 being the most recent lesson for everyone).
2. **"High yields always come with an explanation"**: a bond yielding far above its rating cohort at the same maturity is being tagged with default risk — it isn't a free lunch.
3. **"Don't step outside your circle of competence"**: direct credit bond purchases require qualified-investor thresholds (historically ~1 million RMB; subject to the latest rules); retail's correct route is **indirect participation via funds**, leaving credit research to professionals.

---

## Risk Warning

::: warning ⚠️ Risk Warning
China's bond market is no "sure win": rising rates drag down bond fund NAVs; credit bonds carry **substantive default risk** — after implicit guarantees broke, "capital guaranteed" no longer exists; convertibles bring clause risks (forced redemption, downward revision, investor puts) plus transmission from the underlying stock, and T+0 raises the bar for trading discipline; even Treasury reverse repos, though collateralized, carry a small probability of counterparty and liquidity risk. All codes, thresholds, rates, and drawdown figures here are teaching approximations — **defer to the latest market conditions and the latest regulations/policy**. This article is not investment advice.
:::
