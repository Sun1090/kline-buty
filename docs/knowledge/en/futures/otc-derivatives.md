---
title: "06 · OTC Derivatives: The Dark Side of Custom Contracts"
description: "OTC derivatives explained — forwards, swaps, exotic OTC options, structured products and snowballs; see the real risks behind tailor-made contracts"
---

# 06 · OTC Derivatives: The Dark Side of Custom Contracts

> What trades on an exchange is "standardized"; contracts in the over-the-counter (OTC) world can take any shape: terms, prices, and maturities privately agreed between two sides, with no central clearing and no exchange backstop. This article walks you through forwards, swaps, OTC options, and structured products (including snowballs), so you can see what "tailor-made" really costs.

---

## 1. What OTC Derivatives Are

OTC derivatives (Over The Counter) are contracts **not listed on an exchange, negotiated and signed privately between two parties**. Your counterparty is another institution or individual — not a clearing house.

The typical family:

| Product | One-line essence |
|---|---|
| Forward | A private deal to "buy or sell at an agreed price in the future" |
| Swap | A contract exchanging a series of future cash flows |
| OTC option | An option with customizable terms (including exotics) |
| Structured product | Option terms packaged into a wealth product (snowballs, structured deposits) |

> In one line: **on-exchange is "buying standard goods"; OTC is "custom-made on demand".** The price of customization is losing standardized protection — everything rests on the contract and counterparty credit.

---

## 2. Exchange vs. OTC: One Table Says It All

| Dimension | On-exchange | OTC |
|---|---|---|
| Contract form | Standardized (exchange-defined) | Customized (freely negotiated) |
| Trading venue | Exchange matching | Private negotiation (phone, platforms, **<mark>market maker</mark>** quotes) |
| Clearing | Central counterparty (CCP); clearing house backstops | Bilateral; default risk borne by counterparties |
| **<mark>Margin</mark>** | **<mark>Mark-to-market</mark>** + exchange margin | Per bilateral agreements (e.g. ISDA master agreement and collateral arrangements) |
| **<mark>Liquidity</mark>** | High; close anytime | Low; early termination often requires compensation |
| Transparency | Public quotes, positions, volumes | Trades not public; regulatory data lags |
| Regulation | Strong (CSRC + exchange rules) | Weak (mainly bilateral contracts and after-the-fact oversight) |
| Default risk | Near zero (clearing house guarantee) | Real (counterparty bankruptcy = blow-up) |
| Participants | All types of investors | Mostly institutions; retail cannot participate directly |
| Typical products | Futures, exchange-traded options | Forwards, swaps, exotic options, structured products |

**The key difference in one sentence**: on-exchange eliminates credit risk by "institution" (clearing house + margin); OTC manages credit risk by "contract" (collateral + netting). Behind the contract stands a person — and people can default.

---

## 3. Forwards

The forward is the **oldest, most primitive** derivative: two parties agree to buy or sell a set quantity of an underlying at an agreed price at a future date. Every term is privately negotiated — quantity, quality, maturity, delivery method.

### 3.1 Forward vs. Futures

| Dimension | Forward | Futures |
|---|---|---|
| Standardization | Fully custom | Exchange-unified |
| Trading venue | OTC | Exchange |
| Clearing | Bilateral, no clearing house | Central counterparty |
| Margin / MTM | Usually none; settled once at maturity | **<mark>Mark-to-market</mark>**; margin topped up continuously |
| Delivery | Usually physical at maturity | Mostly closed early; a few physical/cash deliveries |
| Credit risk | High (counterparty default) | Minimal (clearing house guarantee) |
| Liquidity | Poor; exiting mid-way is hard | Good; close anytime |
| Regulation & transparency | Weak | Strong |

> A futures contract is essentially "a standardized forward". The 1848 Chicago grain story in Article 01 is exactly how modern futures evolved from the flaws of forwards.

### 3.2 Forward Premium/Discount

The relation between forward and spot prices is the **term structure**:

- **Contango**: forward > spot; the market expects looser future supply, or funding costs inflate carry.
- **Backwardation**: forward < spot; the market expects tight future supply, or spot is being scrambled for right now.

The difference is the "**<mark>basis</mark>**", which converges over time — the pricing foundation of hedging and **<mark>arbitrage</mark>** (see Article 05).

### 3.3 Credit Risk (Counterparty Default)

The greatest forward risk is not price but **credit risk**: if the counterparty goes bankrupt or refuses to pay at maturity, the contract becomes waste paper.

- When Lehman Brothers collapsed in 2008, the OTC counterparties of its derivatives book (many **<mark>hedging</mark>** funds, banks, corporates) suffered overnight; the forward "hedge" instantly turned into a landmine.
- History is full of corporates taking huge losses on forwards signed with weak-credit counterparties.

### 3.4 Use Case: Corporate FX Locking

The FX forward is the most common forward application:

- A domestic importer must pay 1M USD in 3 months; the current rate is 7.20.
- Fearing CNY depreciation (higher conversion cost), the company signs a forward purchase with a bank: buy 1M USD at 7.25 in 3 months.
- At maturity:
  - If spot is 7.40 → the company buys at 7.25, saving 1M × (7.40 − 7.25) = **150k CNY**;
  - If spot is 7.10 → the company still buys at 7.25, paying 150k more — but this is **locked-in certainty**, far more controllable than naked FX risk.

> The essence of corporate FX locking: trade "possibly earning less" for "never losing catastrophically". For operations, a certain cost curve matters far more than a fluctuating exchange rate.

---

## 4. Swaps

A swap is an agreement to **exchange a series of cash flows**: two parties pay each other at multiple future dates. The two most common are interest rate swaps and cross-currency swaps; there are also commodity swaps, equity return swaps, and credit default swaps (CDS).

### 4.1 Interest Rate Swap (IRS): Fixed for Floating

**Principle**: One side pays fixed-rate cash flows, the other pays floating-rate flows (e.g. LPR); **no principal is exchanged**, only the net interest difference computed on a notional.

**Worked example**:

| Party | Existing liability | Wish |
|---|---|---|
| Company A | 100M CNY floating-rate loan (LPR + 0.5%, current LPR 3.85% → effective 4.35%) | Fears LPR rising; wants to lock the cost |
| Company B | 100M CNY fixed-rate loan (4.5%) | Expects rates to fall; wants floating |

- Swap agreement: A pays B **fixed 4.2%**; B pays A **floating LPR + 0.5%** (notional 100M CNY).
- Result (net cash flow each period, settled at the current LPR):
  - A: pays loan interest LPR+0.5%, receives swap LPR+0.5%, pays fixed 4.2% → **net cost locked at 4.2%** (down from 4.35% to 4.2%, saving 15 bps);
  - B: pays loan interest 4.5%, receives swap 4.2%, pays LPR+0.5% → **net cost = LPR + 0.8%** (now floating; benefits when rates fall).
- Throughout, the 100M principal never moves; only the interest difference changes hands.

### 4.2 Cross-Currency Swap

Both sides exchange **principal + interest in different currencies**: swap principal at inception, interest during the term, and principal back at maturity:

- A domestic company wants USD but USD funding is expensive; a foreign company wants CNY but CNY funding is expensive.
- Each borrows in its home currency and "swaps" the loans via a cross-currency swap — both get the currency they want at a lower total cost.
- Classic hedging use: trading companies hedge long-dated FX receivables/payables with cross-currency swaps.

### 4.3 Commodity Swap

No physical commodity changes hands; cash flows settle on **the difference between an agreed price and the market price**:

- An airline signs a crude swap with a bank: each month for a year settles at 600 CNY/barrel; above 600 the bank pays the difference, below 600 the airline pays.
- Result: the airline fixes its yearly oil cost near 600 CNY/barrel without a single barrel physically delivered.

### 4.4 Credit Default Swap (CDS)

A CDS is **"default insurance"**: the protection buyer pays periodic premium (quoted in basis points); the protection seller pays out upon a credit event (default, bankruptcy).

- Role in the 2008 crisis:
  - Banks packaged subprime loans into MBS/CDOs sold worldwide; investors bought CDS to "insure";
  - Insurance giant **AIG** sold CDS at massive scale (underwriting roughly USD 440 billion of subprime-related risk) while setting aside almost no reserves;
  - The subprime default wave hit → AIG could not pay, verged on bankruptcy, and was rescued by the US government — the seller of "insurance" became the biggest landmine itself.
- More insidiously: CDS can be bought without holding the underlying (naked CDS), turning it into a pure short instrument that amplifies systemic risk.

### 4.5 Pricing Intuition: Who Trades Swaps and Why

| Participant | Motivation |
|---|---|
| Banks | Manage own rate/FX mismatches; make markets for the **<mark>spread</mark>** |
| Corporates | Optimize funding cost; lock cash flows (fixed ↔ floating) |
| Insurers / pension funds | **<mark>Duration</mark>** matching; lock long-term liability costs |
| Hedge funds | Bet on rate direction, term structure, credit spreads |
| Central banks | Counterparty for FX/rate policy operations (reserve swaps, etc.) |

> Swaps are not "zero-sum gambling" but an **exchange of risk preferences**: someone wants to pay fixed (lock), someone wants to receive fixed (bet on decline). The bigger the market, the more active the swaps — interest-rate products account for over 70% of global OTC notional in the long run (per the latest BIS statistics).

---

## 5. OTC Options (Exotic Options)

OTC option terms are freely customizable: underlying, **<mark>strike price</mark>**, tenor, exercise conditions, settlement — everything is negotiable. Relative to exchange-standard options (vanilla European/American), OTC markets are full of **exotic options**.

### 5.1 Common Exotics

| Type | Concept | One-line example |
|---|---|---|
| Barrier options | The contract activates (**<mark>knock-in</mark>**) or dies (**<mark>knock-out</mark>**) when price touches a barrier | Down-and-out call: void if it breaks 90 |
| Binary (digital) options | Pay a fixed amount at expiry if the condition is met, else 0 | Pay 100 if expiry price > strike, else 0 |
| Asian options | Settled on the average price over the observation window, not the expiry price | Settled on the 30-day average; resists single-day manipulation |
| Bermuda options | Exercisable only on specified dates | Between European and American |
| Lookback options | Settled at the best price during the period | Automatically buy at the lowest point |

### 5.2 Binary Options: A High-Risk Warning

**⚠️ Retail binary options are essentially a scam.** Their payoff (fixed payout or total loss) is a standard "bet" on short-term direction, and the overwhelming majority of so-called "binary options platforms":

- Have no real matching or trading; quotes are manipulated by the platform's back office;
- Block user withdrawals with "technical issues" and "withdrawal reviews";
- Are in substance **gambling or fraud**. The CSRC and many foreign regulators explicitly list them as illegal; China has run concentrated crackdowns on online binary platforms since 2016;
- Even where legal (e.g. the US), the long-run expectation is negative — **no trading strategy can turn a "win X% or lose everything" structure into a long-term winner**.

### 5.3 Counterparty Risk of OTC Options

OTC options have no clearing-house guarantee — **the seller's credit is your risk**:

- Option lives can run months to years; if the seller defaults or fails in the meantime, your **<mark>premium</mark>** and potential gains evaporate;
- Domestic OTC options (including single-stock OTC options) are open only to qualified institutional investors via securities firms' **tier-1/tier-2 dealer channels; retail investors are explicitly barred from direct participation in OTC single-stock options** (subject to the latest regulations);
- Institutional counterparties usually demand collateral and netting agreements (ISDA/NAFMII master agreements), compressing credit risk into a manageable range.

---

## 6. Structured Products: Snowballs and Structured Deposits

A structured product = a fixed-income shell + a derivatives core. You hand money to an institution; it parks most of it in deposits/bonds and uses a small slice (or all of the upside) to build an option structure. **The truth of the return hides inside the option terms.**

### 6.1 Snowball Products: The Principle

A snowball is in essence **the investor selling a barrier put option to a securities firm**, with underlyings mostly the CSI 500, CSI 1000, or Hang Seng Tech indices. Take a classic term sheet (**always defer to the product contract**):

| Term | Typical design |
|---|---|
| Underlying | CSI 500 / Hang Seng Tech index |
| Knock-out barrier | 100%–103% of the initial price, observed **monthly**: if the observation-day close ≥ knock-out price → early knock-out, product ends |
| Knock-in barrier | 75%–80% of the initial price, observed **daily**: if any trading-day close < knock-in price → knock-in triggered |
| Coupon | 15%–25% p.a. (accrued until knock-in) |
| Tenor | Usually 12–24 months, with automatic knock-out |

### 6.2 Coupon Returns and Risks: Three Endings

**Ending 1: No knock-in, no knock-out to maturity**
The index oscillates below the knock-out price and above the knock-in price → hold to maturity, collect the full coupon. This is the "perfect world" of the marketing poster.

**Ending 2: Knock-out along the way**
In some month the observation-day close ≥ knock-out price → the product ends early, paying the coupon on actual days held (knock out after 6 months, collect half a year).

**Ending 3: Knock-in without knock-out (the bloodbath script)**
The index breaks the knock-in price and never knocks back out → the investor **bears the full downside of the index**:

- Index down 20% at maturity → principal loses 20% (coupon **<mark>wiped to zero</mark>**);
- Index down 40% → principal loses 40%;
- In extremes, **principal goes almost to zero** (if the index nears zero).
- There is even the "knocked in, then rebounds but never reaches knock-out" case — **no coupon at all, while the loss is taken in full**.

> In option language: the investor effectively **sells a down-and-in put**; the coupon is the premium collected. The downside protection is a "75% wall" — once breached, every point of downside is yours.

### 6.3 Why Institutions Love to Sell and Retail Loves to Buy

| Viewpoint | Institution (securities firm) | Retail |
|---|---|---|
| What they get | Coupon funding far cheaper than issuing debt, plus the **<mark>position</mark>** needed for hedging; can hedge dynamically with index futures/options (Delta hedging), earning pricing slippage and hedge P&L | The 15%+ p.a. "quasi-fixed-income" illusion |
| What they bear | **<mark>Rollover</mark>** / **<mark>volatility</mark>** risk from imperfect hedges (manageable) | Full principal loss in a tail crash (unmanageable) |
| Motivation | Structured products = cheap funding + fee income | The "can't lose either way" illusion in range-bound markets |

**Why it is an illusion**: when the Hang Seng Tech crashed in April 2022, and when the CSI 500/1000 plunged in Jan–Feb 2024, masses of snowballs knocked in together — holders lost, and the concentrated hedging sell-off accelerated the fall. **The snowball resells the "insurance" risk to the market and to the holder at the instant of knock-in.**

::: danger 💀 Snowball Knock-In: The Downside Protection Is a Paper Wall
**The snowball resells the "insurance" risk to the market and to the holder at the instant of knock-in.** After knock-in there is no floor of any kind; the "high coupon" holds only while the index never breaks the knock-in price — once the 75% wall is breached, every point of downside is yours.
:::

### 6.4 The Truth About Structured Deposits

A structured deposit = **bank deposit + embedded option**:

- Principal portion: the vast majority sits in a time deposit, principal protected at maturity (covered by deposit insurance as to principal);
- Return portion: a small slice (or the upside space) buys/sells options tied to gold, FX rates, or indices;
- Result: **principal very likely protected, but returns are capped**. For example "1.2%–5% floating": the market goes your way, 5%; the wrong way, 1.2% — near a demand deposit.

| Misconception | Truth |
|---|---|
| "Principal and interest guaranteed" | Structured deposits **guarantee principal, not interest**; returns float within a band |
| "No risk if principal is safe" | In extreme cases some products can impair principal too (complexly linked ones); and the return cap means you gave up the upside |
| "Rigid payment after the new rules" | Post the new asset-management rules, bank wealth products are mark-to-market; **any "principal and interest guaranteed" marketing is a probable violation** |

### 6.5 The Risk Transfer Behind "Guaranteed" Talk

Behind the four words "guaranteed principal and interest" there is no magic, only **risk transfer**:

- The only true backstops are deposit insurance (within 500k CNY), government bonds, and the central bank — any other "guarantee" means the risk is hidden somewhere: pooled operations (Ponzi-style rolling redemption), a steep hidden cost you paid (the return cap), or risk ultimately passed to the next buyer and the systemic bailout (the shadow-banking model before implicit guarantees broke);
- Remember the iron law of pricing: **return and risk share the same source**. A product promising "high return + guaranteed principal + high liquidity" cannot have all three — at least one is a lie.

---

## 7. Size and Participants of the OTC Market

The global OTC derivatives notional has long run in the **hundreds of trillions of dollars** (per BIS statistics), far larger than exchange-traded markets. Participants:

| Participant | Role |
|---|---|
| Commercial banks | The largest market makers; main counters for IRS/FX swaps |
| Investment banks / brokers | Creators and hedgers of OTC options, structured products, CDS |
| Hedge funds | Trade direction, volatility, credit, and rates with OTC tools |
| Insurers | Sell CDS; run rate/duration hedges |
| Non-financial corporates | Lock FX, lock rates, lock commodity prices (hedging) |
| Central banks | Counterparties for FX swaps and rate instruments |

> A big market ≠ a safe market. The two most famous "accidents" both came from OTC: in 1998, LTCM bet on spreads with high-**<mark>leverage</mark>** OTC derivatives and needed a central-bank-coordinated rescue when it blew up; in 2008, AIG's CDS book and Lehman's OTC counterparties ignited the global financial crisis. **The other face of custom contracts: no one backstops you.**

---

## 8. Where Ordinary People May Participate

| Channel | Accessible? | Notes |
|---|---|---|
| Exchange-traded futures/options | ✅ Yes | Standardized, centrally cleared, best regulated |
| Structured deposits | ✅ Yes | Principal mostly protected, returns capped; read every word of the terms |
| Broker snowballs / yield-note products | ⚠️ Restricted | Bound by the new asset-management rules and suitability requirements; qualified-investor status needed, and regulation has tightened in recent years (subject to the latest rules) |
| OTC options (signing single stock/index directly) | ❌ Banned for individuals | Institutions only, via securities firms' tier-1/tier-2 dealer channels |
| FX forwards/swaps | ❌ Essentially not for individuals | Bank counters serve institutions and corporates only |
| Binary options platforms | ❌ Strictly prohibited | Mostly gambling fraud; regulators have cracked down hard |

**The real risk after peeling the wrapper**: every "quasi-fixed-income" purchase by an ordinary person is someone selling you an option structure — every cent of coupon you collect is the premium someone pays you to "bear the risk". **No one performs for you when you lose, and no god backstops you when you collect the interest.**

::: danger 💀 The Essence of Quasi-Fixed Income: Your Coupon Is Someone Else's Premium
**No one performs for you when you lose, and no god backstops you when you collect the interest.** Behind every "quasi-fixed-income" purchase by an ordinary person is a person or institution selling you an option structure — every cent of coupon you collect is the premium someone pays you to bear the risk.
:::

---

## Risk Warning

::: warning ⚠️ Risk Warning
- **Snowballs and similar structured products can lose all or most of the principal**: after knock-in there is no floor; the "high coupon" holds only while the index never breaks the knock-in price; the tail risk is entirely the investor's.
- **Most binary option platforms are scams**: the fixed-payout structure has negative expectation by itself, and illegal platforms manipulate quotes and block withdrawals — do not participate.
- OTC derivatives have no central-clearing protection; **counterparty default risk is real**; any "guaranteed principal and interest" promise is very likely a violation or hides risk.
- All terms in this article (knock-in/knock-out levels, coupons, capital thresholds, suitability requirements) are subject to the product contract, regulations, and the latest exchange rules.
- This article is for education only and is not investment advice; if you are unsure which kind of risk-bearer you are, stay away from these products.
:::


---

## Summary

- OTC vs. exchange: custom vs. standard, bilateral vs. central clearing, weak vs. strong regulation — **credit risk is OTC's original sin**.
- Forwards: the most primitive derivative and the mainstay of corporate FX locking — but counterparty default risk is high.
- Swaps: contracts exchanging cash flows; IRS is the corporate tool for locking funding costs; CDS amplified systemic risk in 2008.
- OTC options: free terms but bigger risks; individuals are banned from direct participation in domestic OTC options.
- Snowballs = selling a put with barrier terms; the coupon is the price of selling volatility — **once the downside protection is breached, losses are uncapped**.
- Structured deposits: principal protected, interest not; returns capped; "guaranteed" talk is risk transfer in disguise.
- The boundary for ordinary people: exchange-traded instruments > structured deposits > carefully-evaluated structured products; the rest mostly has nothing to do with you.

> The first lesson of the OTC market is not "how to earn" but "who is my counterparty, and will they run". **Before you see the last page of the contract clearly, do not look at the returns on the first page.**

::: tip 📜 OTC Lesson One: Read the Last Page Before the First-Page Returns
**Before you see the last page of the contract clearly, do not look at the returns on the first page.** The first lesson of the OTC market is not "how to earn" but "who is my counterparty, and will they run" — the counterparty credit behind the contract matters more than the **<mark>rate of return</mark>** in it.
:::
