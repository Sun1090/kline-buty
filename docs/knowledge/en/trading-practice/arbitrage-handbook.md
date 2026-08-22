---
title: "Arbitrage in Practice"
description: "The core logic of arbitrage and seven mainstream plays — cash-and-carry, calendar, cross-market, cross-commodity, ETF, crypto, and statistical arbitrage."
---

# Arbitrage in Practice

> Arbitrage is the trading world's closest thing to a "money printer": no directional bets — only the certainty of **spread** convergence. In reality, though, arbitrage is full of traps: spreads that refuse to converge, **liquidity** drying up, fees devouring profit, black swans blowing up. This article lays out the core logic of arbitrage and seven mainstream plays — principle, operational steps, risk points, who they suit — ending with the 5 most common ways arbitrageurs die.

---

## The Core of Arbitrage

What arbitrage earns is essentially **the certainty of spread convergence**, independent of price direction. One sentence:

```text
Spread = the price difference of the same asset across markets/contracts/instruments
Arbitrage = buy the undervalued side + sell the overvalued side, close when the spread converges
```

| Point | Explanation |
|---|---|
| Not directional forecasting | You don't need to know whether gold rises or falls — only that "Shanghai gold and London gold will eventually trade at the same price" |
| Low risk ≠ no risk | Most arbitrage is "low-risk"; only very few plays (instantaneous ETF arbitrage) approach "risk-free" |
| Thin returns, scale-dependent | A single arb window is often just 0.1%-3% — capital size or high frequency is needed to make it worthwhile |
| Key variables | Will the spread converge? How long will it take? Do costs (fees/**<mark>slippage</mark>**/funding interest) eat the profit? |

> Remember the first principle of arbitrage: **spreads exist because markets are temporarily irrational; the arbitrageur's job is to wait for rationality to return. But if the market never returns to reason, you are the one being harvested.** So the real skill isn't "finding spreads" — it's "assessing whether the spread will converge, and when".

::: warning ⚠️ Arbitrageurs die from treating low risk as no risk
**Arbitrageurs die from treating "low-risk" as "no-risk".** Genuinely near-risk-free arbs (instantaneous ETF arbitrage, flash matching) are monopolized by institutional programs; individuals can barely participate. Nearly every "arbitrage" retail touches carries **basis**, liquidity, time, FX, or platform risk — you've merely swapped "betting direction" for "betting convergence".
:::

---

## 1. Cash-and-Carry (Futures-Spot) Arbitrage

### Principle

Futures and spot prices have a theoretical relationship: **futures price = spot price + cost of carry** (funding interest + storage + freight + insurance). When the futures-spot gap (**basis = spot price − futures price**) deviates from fair range, an opportunity appears:

- **Contango (futures > spot)**: basis negative → theoretically "buy spot + sell futures", hold to delivery and capture convergence;
- **Backwardation (futures < spot)**: basis positive → reverse: "sell spot (or short via securities lending) + buy futures", again waiting for convergence.

Numeric example (gold):

```text
Gold spot 600 CNY/g, December futures 615 CNY/g, one-month carry ≈ 5 CNY/g
→ fair futures price should be 605 CNY/g; actual premium 10 CNY/g (abnormally rich)
→ Arb: buy 10 kg spot (6M CNY), sell 10 lots December futures
→ At delivery the gap reverts to carry level; locked profit ≈ (10 − 5) × 10,000 g = 50,000 CNY
```

**"Long backwardation / short contango" logic**: without touching physical delivery, when basis is positive (backwardation), going long futures equals "buying future goods cheaper than spot today"; profit arrives as the market normalizes (backwardation narrows). Shorting futures in contango works symmetrically.

### Steps

1. Compute theoretical basis (cost-of-carry model);
2. Compare with actual basis; act only when deviation exceeds costs (fees + funding + market impact);
3. Open both legs: buy the cheap side, sell the rich side, matched by notional;
4. Hold until basis reverts and close, or hold to delivery (requires spot channels/warehousing);
5. Monitor basis throughout; set a "basis won't revert" **<mark>stop-loss</mark>** line.

### Risk points

- **Basis may not revert**: in extreme markets (squeezes, roll squeezes), basis can keep widening;
- **Heavy capital usage**: buying spot requires full payment; returns diluted by cost of capital;
- **Delivery risk**: individuals cannot take physical delivery — must swap or roll;
- **Squeeze**: when the spot side is cornered, shorts are forced to buy back at ruinous prices.

### Suited to

**Institutions, industrial players, investors with large capital (millions+).**

::: warning ⚠️ Retail has no spot channel — this becomes speculation carrying basis risk
**Without a spot channel, what retail actually trades is the "long backwardation/short contango" futures leg — which is not risk-free arbitrage but speculation carrying basis risk.** Once you operate "speculation" under an "arbitrage" label, stop-losses, **position sizing**, and psychology all go off the rails — you earn money from basis reversion, not zero-risk spread.
:::

---

## 2. Calendar (Inter-Temporal) Arbitrage

### Principle

Contracts of different months on the same instrument (e.g. rebar January vs May) differ mainly by **time value (funding interest, storage, seasonal supply-demand)**. When the far-near spread deviates from its normal range, do **long near month + short far month** (or reverse) and bet on convergence. Directional exposure is **hedged**; only the "calendar spread" risk dimension remains.

**Positive/negative spreads**:

| Name | Operation | Scenario |
|---|---|---|
| Positive spread (near strong, far weak) | Buy near + sell far | Tight spot supply, near month bid up, far-near spread too wide |
| Negative spread (near weak, far strong) | Sell near + buy far | High inventory pressuring the near month, far-near spread too narrow or negative |

Numeric example:

```text
Rebar Jan contract 4,000 CNY/t, May 4,200 CNY/t; normal spread ~150 CNY/t
→ actual spread 200 CNY/t (too wide, near month undervalued)
→ Positive spread: buy 10 lots Jan + sell 10 lots May
→ Spread reverts to 150: profit (200−150) × 10 t × 10 lots = 5,000 CNY
```

### Steps

1. Establish the historical normal range of near-far spreads (mean ± 2 standard deviations);
2. Open when the spread breaches the range with an explainable logic (inventory, maintenance, seasonality);
3. Use liquid benchmark month pairs; avoid illiquid near months;
4. Close or roll before the delivery month approaches (last 10 trading days);
5. **<mark>Take-profit</mark>**: spread back at range midpoint; stop-loss: spread extends to historical extremes (e.g. 3 standard deviations).

### Risk points

- **Structural widening**: long-term fundamental shifts (new capacity online) move the whole "normal range";
- **Roll slippage**: **<mark>spread</mark>** and slippage during main-contract switches;
- **Squeeze**: near-month squeeze forces the positive-spread short into massive losses;
- **Margin usage**: two-sided positions mean high margin and heavily compressed **<mark>leverage</mark>**.

### Suited to

**Intermediate investors with 100k-1M capital who tolerate low returns.** Small swings, clear logic — a good starting point for learning arbitrage, but beware turning "positive/negative spreads" into disguised directional betting.

---

## 3. Cross-Market Arbitrage

### Principle

The same commodity trading on different markets should converge in price (after freight, tariffs, FX). When domestic-international gaps turn abnormal, buy the cheap market + sell the expensive one and wait for convergence. Classic pairs:

| Pair | Markets | Main spread source |
|---|---|---|
| SHFE gold vs London gold (COMEX) | SHFE / offshore | FX, domestic premium (demand/capital controls) |
| Crude SC vs Brent | INE / ICE | FX, freight, quality differential, import quotas |
| SHFE copper vs LME | SHFE / LME | FX, tariffs, inventories, landed cost |

**FX** is the most critical variable in domestic-international arbitrage: SHFE and London gold are denominated in different currencies; spreads must be converted into a common currency. With USD/CNY at 7.2 and London gold at $2,000/oz:

```text
Theoretical SHFE price = 2000 × 7.2 ÷ 31.1035 ≈ 463 CNY/g (1 oz ≈ 31.1 g)
If actual SHFE gold is 480 CNY/g → domestic premium 17 CNY/g (abnormally high)
→ Arb: buy London gold + sell SHFE gold, wait for premium to normalize
```

### Steps

1. Normalize units and currency (CNY/g vs USD/oz; barrels vs tonnes);
2. Compute theoretical spread including FX, freight, tariffs, premia/discounts;
3. Open both legs when actual deviation exceeds operating cost;
4. During volatile FX periods **hedge the exchange rate simultaneously** (forwards/options) or cut size;
5. Close when the spread converges — never bet direction.

### Risk points

- **FX risk**: sharp RMB moves swallow the entire spread profit (one of the most common deaths);
- **Time mismatch**: different trading hours onshore/offshore; overnight gaps;
- **Liquidity differences**: night sessions vs offshore hours misaligned — closing one leg may find no counterparty;
- **Cross-border capital**: deposit/withdrawal restrictions, FX controls, conversion costs;
- **Policy risk**: trade or quota changes permanently shift the spread midpoint.

### Suited to

**Investors with overseas accounts, FX/tariff fluency, and meaningful capital.** Domestic-international spreads are where professional institutions camp permanently — retail should be extra careful: **the "onshore-offshore inversion" you read about in the news is usually already the endgame after institutions finished positioning.**

---

## 4. Cross-Commodity Arbitrage

### Principle

Upstream-downstream commodity prices are **strongly correlated**: processing margins (crushing, smelting, rolling) define the fair range between them. When margin compresses to extremes or balloons absurdly, long "the undervalued leg", short "the overvalued leg", betting on margin normalization.

**Classic logics**:

| Pair | Logic |
|---|---|
| Soybean meal − soybean oil (crush spread) | Crushing soybeans yields meal + oil; crush margin = meal price × meal yield + oil price × oil yield − bean price − processing fee; margin too low → buy meal/oil, sell beans (or reverse) |
| Rebar − iron ore (steel mill margin) | Rebar price − iron ore cost − coke cost − processing fee = mill margin; too high/too low reverts to mean |
| Coking coal − coke | Coking margin reversion |
| Oil − meal (soybean oil/meal seesaw) | The two compete over crush output; spreads follow statistical patterns |

Numeric example (crush spread):

```text
Soybeans 4,000 CNY/t, meal yield 78%, oil yield 19%
Meal 3,800 CNY/t, soybean oil 8,000 CNY/t
→ output value = 3800×0.78 + 8000×0.19 = 2964 + 1520 = 4,484 CNY/t
→ crush margin = 4484 − 4000 − 100 fee ≈ 384 CNY/t (historical mean ~150)
→ Margin abnormally high → buy beans + sell meal/oil, wait for margin to fall back
```

### Steps

1. Understand the industry chain (who processes whom, yield ratios, cost structure);
2. Compute processing margin; plot its historical range (mean ± std dev);
3. When margin exits its range with explainable fundamentals, position against it (short high margin, long low margin);
4. Match legs by **yield ratio** (e.g. 1 lot beans ≈ 0.78 lots meal + 0.19 lots oil, adjusted for contract multipliers);
5. Set margin-reversion targets and extreme-value stops.

### Risk points

- **Permanently changed ratios**: breeding cycles, capacity exits shift the spread midpoint;
- **Contract specification mismatch**: quality standards and delivery rules break "1:1 hedging";
- **One-sided market risk**: in macro crashes/rallies the two legs desynchronize — a "pseudo-hedge";
- **Margin calls**: while margin keeps extending, both legs float against you, forcing top-ups.

### Suited to

**Investors who know the industry chain and can research (capital 100k-1M).** Cross-commodity arb demands continuous fundamental tracking — "research-driven arbitrage", a higher bar than cash-carry or calendar arb, but the most interesting logic of all.

---

## 5. ETF Arbitrage

### Principle

An ETF has **two prices**: the secondary-market trading price (real-time matching) and NAV (real-time weighted basket value). When they diverge (discount/premium), the creation/redemption mechanism locks the spread:

- **Premium (market price > NAV)**: buy the stock basket → create ETF units → sell on-exchange → pocket premium;
- **Discount (market price < NAV)**: buy ETF on-exchange → redeem into the basket → sell shares → pocket discount.

Numeric example:

```text
ETF NAV 2.000 CNY, market price 2.010 (premium 0.5%)
→ create 100k units: basket costs 200k, sell on-exchange for 201k
→ gross 1,000 CNY; net ~500-800 CNY after commissions, creation/redemption fees, slippage
```

### Steps

1. Monitor premium/discount rate (premium = market price ÷ NAV − 1);
2. Trigger only beyond the cost line (~0.2%-0.5%, depending on liquidity);
3. Direct creation/redemption requires **thresholds** (typically 500k-1M units or equivalent value); small accounts can only trade the premium's fluctuation on-exchange — that's speculation, not arbitrage.

### Risk points

- **Creation latency**: seconds-to-minutes delay between creation and selling; NAV moves eat the spread;
- **Thresholds and fees**: creation/redemption fees, constituent slippage, T+0/T+1 constraints (some ETFs allow same-day redemption);
- **Liquidity trap**: small ETFs show fat premiums you cannot actually sell into;

::: danger 💀 Buying high-premium ETFs is donating money to arbitrageurs
**Don't buy ETFs at 2%+ premiums.** High-premium ETFs are donations to arbitrageurs — by the time you see the premium, institutional programs have already harvested it; retail chasing is exit liquidity. For ordinary investors, avoiding "high-premium ETFs" by watching the premium rate matters far more than doing the arbitrage yourself.
:::

### Suited to

**Institutions/professionals with programmatic capability or large capital.**

---

## 6. Crypto Market Arbitrage

### Principle

Crypto trades 24/7, exchanges are numerous, leverage tools abundant — the densest arbitrage terrain globally:

- **Spot-perpetual funding-rate arbitrage**: perpetuals never settle; "**<mark>funding rate</mark>**" balances longs and shorts. When funding is positive (longs pay shorts), **long spot + short perpetual** collects funding each cycle (usually every 8 hours);
- **Cross-exchange spreads**: the same token prices differently on Binance, OKX, Coinbase etc. (especially during big moves); buy low, sell high;
- **Cash-carry/calendar**: same as the futures chapter, but shorter tenor and smaller size.

Numeric example (funding arb):

```text
BTC spot 60,000 USDT; perpetual funding annualized +25% (common in bull markets)
→ deploy 100,000 USDT: long spot + short 1 BTC perpetual (hedged)
→ collect ~25% × 100,000 = 25,000 USDT funding annually
→ after fees, spread losses, slippage: realistic annualized ~10%-18%
```

### Steps

1. Pick exchanges and instruments; confirm funding rates, position limits, withdrawal fees;
2. Open equal-sized legs: buy spot + short perpetual (size = spot quantity × price);
3. Each settlement cycle (8 hours), verify funding receipts;
4. Exit when funding turns negative (or fees erode the arb return);
5. Cross-exchange spread play: monitor → fire both orders fast → close on receipt.

### Risk points

- **Extreme speed requirements**: cross-exchange gaps close within tens of seconds; manual execution almost always loses — API automation required;
- **Platform risk**: exchanges pulling plugs, halting withdrawals, or vanishing (black-swan death is especially common in crypto);
- **Funding-rate volatility**: bull-to-bear flips turn funding negative instantly and the arb loses in reverse;
- **Imperfect hedge**: underlying/caliber differences between spot and perpetual funding calculations;
- **Capital movement costs**: fiat ramps, on-chain fees, slippage eat small-spread profits.

### Suited to

**Intermediate investors with programming ability who accept platform risk.** Funding arb is one of few "quasi-arbitrages" open to individuals, but it is essentially a **beta strategy earning volatility compensation**: collecting rent in bulls, paying rent in bears — not passive income.

---

## 7. Statistical Arbitrage (Concept)

### Principle

Statistical arbitrage (Stat Arb) skips fundamental logic: **use historical data to model the relationship between two assets' prices; when the relationship deviates, long the cheap one and short the rich one**, betting on reversion. Core concepts:

- **Mean reversion**: many pairs' price differences (spreads, ratios) oscillate around a long-run mean; the farther the deviation, the higher the reversion probability;
- **Cointegration**: two price series each random-walk, but **their linear combination is stationary** — i.e. "this spread won't run away". After testing cointegration, fading deviations beyond 2 standard deviations is textbook stat arb.

Numeric example (pairs trading):

```text
Kweichow Moutai vs Wuliangye: historical spread mean 50 CNY, std dev 8 CNY
→ current spread 70 (> mean+2σ = 66)
→ short Moutai + long Wuliangye (equal notional), bet on reversion
→ close at spread 50, earning ~20 CNY/share × position
```

### Steps

1. Find highly correlated asset pairs (same sector, chain, or index constituents);
2. Run cointegration tests on historical data; compute spread mean and standard deviation;
3. Enter at ±2σ deviations, exit at mean reversion, stop-loss beyond ±3σ;
4. Match positions by "equal notional / equal beta" to control portfolio volatility;
5. Roll tests continuously: if the relationship structurally breaks, retire the pair.

### Risk points

- **Relationship failure**: statistical patterns may be historical coincidence; after structural change the spread never reverts (stat arb's biggest killer);
- **Backtest overfitting**: parameters reverse-engineered from history fail live;
- **One-sided markets**: in systemic crashes the shorted leg squeezes — both legs lose together;
- **Capital requirements**: 10-20 diversified pairs are needed for smoothing — hard for individual capital to sustain.

### Suited to

**Quant-literate investors with 1M+ capital.** Stat arb is quant funds' home turf; for individuals it's mostly "learning the concept" — understanding cointegration and mean reversion helps judge any spread's convergence odds.

---

## 5 Common Ways Arbitrage Traders Die

| # | Death | Typical scene | Prevention |
|---|---|---|---|
| 1 | **Spread won't converge** | Structural change (policy, supply-demand, capacity) invalidates the "historical range"; the spread keeps running away | Before every entry ask: why *should* this spread revert? Confirm with fundamentals + statistics; set extreme-value stops |
| 2 | **Liquidity trap** | Spread looks perfect but the cheap side won't fill and the rich side won't sell (small contracts, delisted stocks, suspensions) | Trade only liquid benchmark contracts and TOP instruments; check order-book depth first |
| 3 | **Fee devouring** | Two entries + two exits — 4 costs (commission, stamp duty, slippage, creation fees) exceed the spread | Compute "all-in-cost spread" (with slippage estimate) before acting; low commissions are arb hygiene |
| 4 | **FX risk** | Sharp RMB depreciation/appreciation mid-trade, or bad conversion timing, swallowing the whole spread | Always hedge FX in cross-market arb (forwards/options) or cut size; skip when spread income < expected FX swing |
| 5 | **Black swan** | Exchange collapse, sudden rule changes, extreme squeezes, regulatory shocks — the spread gaps past any stop in seconds | Cap single-arb exposure (<20% of capital); diversify across venues; always keep a "worst-case loss" plan |

> What these 5 share: **arbitrageurs die from treating low risk as no risk**. True arbitrage discipline is defining "what if it doesn't converge" before discussing "how much we make".

---

::: warning ⚠️ Risk Warning
Arbitrage is not a free lunch: **nearly all "arbitrage" accessible to retail carries basis, liquidity, time, FX, or platform risk** — swapping "direction bets" for "convergence bets" reduces risk dimensions but eliminates none. Truly near-risk-free arbs (instantaneous ETF arbitrage, flash matching) are monopolized by institutional programs.

**Return and risk are always paired.** Any "risk-free high-return" arbitrage pitch (especially ones demanding upfront transfers, **<mark>margin</mark>** deposits, or referrers) is almost certainly a scam. This article is not investment advice; decide carefully within your own means and risk tolerance.
:::
