---
title: "05 · Futures Trading Strategies: From Hedging Risk to Trading Volatility"
description: "Futures trading strategies explained — hedging, cash-futures arbitrage, calendar and inter-commodity spreads, trend following, intraday scalping, and algorithmic trading"
---

# 05 · Futures Trading Strategies: From **<mark>Hedging</mark>** Risk to Trading Volatility

> Futures strategies broadly serve two kinds of people: those who want to **eliminate risk** (hedging, **<mark>arbitrage</mark>**) and those who want to **take risk for returns** (trend, intraday, algorithmic). This article lays out the mainstream ways to play futures — principle, suitable audience, risk points — to help you find your own position.

---

## Strategy Overview

| Strategy | Essence | Risk profile | Suitable audience |
|---|---|---|---|
| Hedging | Transfer price risk | Gives up excess returns; **<mark>basis</mark>** risk | Industrial clients (farmers, airlines, steel mills) |
| Cash-futures arbitrage | Earn the near-certain money of basis convergence | Low risk, high capital threshold | Institutions, those with spot channels |
| Calendar spread | Earn convergence of inter-month **<mark>spreads</mark>** | Low-to-medium risk | Advanced investors |
| Inter-commodity spread | Earn convergence of chain-wide price ratios | Medium risk, complex logic | Investors who know the chains |
| Trend following | Earn directional trends | High risk, discipline-dependent | Those with a trading system |
| Intraday / scalping | Earn tiny spread fluctuations | Extremely high friction; mentally draining | Full-time short-term traders |
| Algorithmic trading | Replace human nature with rules | System risk and extreme-market risk | Those who can code |

> Remember the master key: **hedgers and arbitrageurs earn "certainty"; trend and intraday traders earn "volatility". Decide first what you earn money from, then act.**

::: tip 🎯 The Master Principle: Earn Certainty or Earn Volatility
**Hedgers and arbitrageurs earn "certainty"; trend and intraday traders earn "volatility".** Decide first what you earn money from, then act — the four positions must not be confused, and strategy must match capital.
:::

---

## 1. Hedging

### 1.1 Principle

Hedging means **establishing a futures position opposite in direction and matched in size to a spot position**, using futures P&L to offset spot price swings.

```text
Buy spot later (fear of price rise) → hedge with long futures
Hold spot (fear of price fall) → hedge with short futures
```

Its mathematical basis: futures and spot prices are highly correlated (converging near delivery), so whatever spot loses, futures most likely gains (and vice versa).

### 1.2 Example 1: The Farmer Selling Soybeans (Short Hedge)

- Spring: soybean spot is 5000 CNY/ton. Farmer Li grows 100 tons and **fears prices fall by the September harvest**.
- Action: **sell** 100 tons of soybean No.1 futures (10 lots, 10 tons/lot), locking 5000 CNY/ton.
- At the September harvest the market falls to 4500 CNY/ton:
  - Spot sells for less: 100 × (5000 − 4500) = **−50k CNY**
  - Futures profit: 100 × (5000 − 4500) = **+50k CNY**
  - **Net result: 0 loss** — price risk fully hedged.
- If September rises to 5500 CNY/ton: spot earns 50k more, futures loses 50k — **the net result is still 0**.

> The essence of hedging: **give up the possibility of "earning more in a rally" in exchange for the certainty of "not losing in a fall".** Farmer Li traded 50k of possible excess return for a good night's sleep.

### 1.3 Example 2: The Airline Locking Fuel Prices (Long Hedge)

- An airline needs 1 million barrels of jet fuel a year and **fears rising oil prices** inflating costs.
- Action: buy 1000 lots of crude futures (1000 barrels/lot), locking 500 CNY/barrel.
- Six months later oil rises to 600 CNY/barrel:
  - Spot procurement cost up: 1M × 100 CNY = +100M CNY of cost
  - Futures profit: 1M × 100 CNY = +100M CNY
  - **Net cost stays locked at 500 CNY/barrel.**

### 1.4 The Costs and Risks of Hedging

| Cost/risk | Description |
|---|---|
| Giving up excess returns | When the market moves your way, spot's extra gains are offset by futures losses |
| Basis risk | The futures-spot spread (basis) does not move in lockstep; the hedge is imperfect |
| Quantity/timing mismatch | Hedge size never matches spot perfectly; windows drift out of alignment |
| **<mark>Margin</mark>** stress | When the market moves against you, the futures leg demands constant top-ups (spot-side floating gains cannot be monetized at once) |
| Over-hedging | Hedging beyond the spot exposure is in substance speculation |

**Who it suits**: Industrial clients with real spot exposure — growers/traders, airlines, steel mills, oil firms, foreign-trade companies. **Individual investors have no spot position, so there is no true hedge for them — what you buy is not "insurance" but naked short/long speculation.**

---

## 2. Cash-Futures Arbitrage

### 2.1 Principle

Cash-futures arbitrage exploits moments when the **spread (basis) between futures and spot** deviates from fair value:

- Futures premium too rich (basis too wide) → **buy spot, sell futures**, hold to delivery and pocket the convergence.
- Futures discount too deep → reverse (sell inventory, buy futures).

The fair futures-spot spread = carry cost (financing + storage + transport + inspection); the bigger the deviation, the bigger the arbitrage room.

### 2.2 Example: SHFE Copper Cash-Futures Arbitrage

- SHFE copper spot 80000 CNY/ton, near-month futures 81500 CNY/ton (premium of 1500 CNY).
- Carry cost estimate: financing + storage + freight ≈ 800 CNY/ton.
- Riskless return = 1500 − 800 = **700 CNY/ton** (before fees and cost of capital).
- Action: buy spot copper, warehouse it, sell futures; deliver at expiry, pocketing 700 CNY/ton.

### 2.3 Risk Points

- **Basis fails to converge**: in extreme markets the premium keeps widening; the arbitrage is forced to **<mark>roll</mark>** and costs accumulate.
- **Heavy capital occupation**: buying spot occupies full value; the cost of capital is itself part of the edge.
- **Complex delivery process**: any slip in warrants, inspection, or transport turns into a loss.
- **Limited capacity**: the window when the edge exists is short; ordinary retail traders can hardly execute.

**Who it suits**: Institutions with spot channels and capital (trading houses, industrial capital). **Individuals essentially cannot participate, but can trade basis-convergence themed spread strategies (next section).**

---

## 3. Calendar Spreads

### 3.1 Principle

A calendar spread is **buying one month and selling another month of the same product simultaneously**, earning changes in the inter-month spread (calendar spread), not the direction of price itself.

```text
Buy near month + sell far month (regular spread / near-strong-far-weak)
Sell near month + buy far month (reverse spread / near-weak-far-strong)
```

Position logic: enter when the near-far spread deviates from its historical normal range, wait for convergence.

### 3.2 Example: Soybean Meal May-September Regular Spread

- May contract 3200 CNY/ton, September contract 3350 CNY/ton, spread 150 CNY.
- The normal seasonal spread is 50 CNY → current spread is wide; trade "sell May, buy September" (betting on convergence).
- If the spread returns to 50: profit = 150 − 50 = 100 CNY/ton (× 10 tons = 1000 CNY/lot).
- If the spread widens to 200: loss of 50 CNY/ton.

### 3.3 Risk Points

- **Spreads can fail to converge for a long time**: fundamentals (seasonal supply-demand, inventory structure) can shift the spread to a "new normal".
- **One-sided** <mark>liquidity</mark> **risk**: non-dominant months trade thin — hard to close, big **<mark>slippage</mark>**.
- **Stacked margin**: two legs occupy two margins; in extreme moves a margin call can still hit.
- Futures firms offer spread-order discounts (margin charged on one side), but trigger conditions are strict — confirm first.

**Who it suits**: Steady advanced investors who understand seasonality and do not bet direction. **Far lower risk than outright positions and one of the few relatively retail-friendly strategies — but it can still lose.**

---

## 4. Inter-Commodity Spreads

### 4.1 Principle

Inter-commodity spreads exploit **imbalances in price ratios along an industrial chain or between substitutes**. Classic pairs:

| Pair | Logic | Typical positioning |
|---|---|---|
| Coke − coking coal (J-JM) | Spread between upstream input and downstream output (margin) | Long coking margin / reverse spread |
| Rebar − iron ore (RB-I) | Steel-mill margin (product − raw material) | Long rebar, short ore (long mill margin) |
| Soybean oil + palm oil (Y-P) | Oil substitutes; the spread has a fair range | Trade convergence on deviation |
| Soybean meal − rapeseed meal (M-RM) | Feed-protein substitutes | Spread convergence |
| Plastics − polypropylene (L-PP) | Price ratio of similar olefin products | Trade convergence on supply-demand mismatch |

### 4.2 Example: Long Steel-Mill Margin

- Rebar 3600 CNY/ton, iron ore 750 CNY/ton, coke 1900 CNY/ton.
- Estimated mill margin = product price − raw material cost ≈ 200 CNY/ton, below the historical mean of 400.
- Action: buy rebar futures + sell iron ore/coke futures (ratioed to output, e.g. 1 lot rb : 1 lot i : 0.5 lot j).
- If steel rises while raw materials don't (margin repair), the combo profits; if steel falls and inputs fall too, margin holds and the combo loses little.

### 4.3 Risk Points

- **Complex ratios and yield coefficients**: the conversion among coke/ore/coal differs per mill; a wrong ratio is an outright position in disguise.
- **Logic failure**: policy (production caps, cuts) directly breaks the "margin" logic — e.g. mill production caps → steel up, raw materials down, margin blows out, and reverse-spread traders get crushed.
- **Multi-leg slippage**: fills across legs amplify costs.

**Who it suits**: Investors with deep industrial-chain research. **Inter-commodity spreads are not "sure wins" — they only move risk from direction to price ratios, and ratios can wipe you out too.**

---

## 5. Trend Following

### 5.1 Principle

The core assumption of trend following: **prices have momentum** — what rises keeps rising, what falls keeps falling. The playbook is "cut losses short, let profits run": enter with the trend, add on breakouts, exit on trend reversal.

- Entry: enter in the trend's direction after a key level breaks (prior high / moving average / trendline).
- Exit: trailing **<mark>stop-loss</mark>** (e.g. chandelier exit), or structural breakdown (breaking the MA/channel).
- No top/bottom calling: take the middle of the trend only; never try to catch tops or bottoms.

### 5.2 Common Tools

| Tool | Usage |
|---|---|
| Moving averages | Long only above the MA, short only below |
| Channels / Bollinger Bands | Buy breakouts above the upper band, sell below the lower (with-trend variant) |
| Trendlines / structure | Rising highs and lows = uptrend |
| ADX | Gauge trend strength; trend systems only run when ADX is high |

### 5.3 Risk Points

- **Chop beats you repeatedly**: trend systems bleed small losses in range-bound markets ("grind"); the trendless period is the worst enemy.
- **Failed breakouts**: breakout entries get stopped out repeatedly on false breaks.
- **Huge drawdowns**: big-trend profits are often confirmed only after 30%–50% givebacks — psychologically demanding.
- **<mark>Leverage</mark> amplifies drawdowns**: at 10x, a 10% adverse move **<mark>blows up</mark>** the account — **the number-one death of trend traders is "dying on the last stop-loss before the trend finally starts".**

**Who it suits**: Traders with a complete system, strict discipline, and no urge to watch screens all day. **The enemy of a trend system is not the market, it is your own hand.**

---

## 6. Intraday Trading / Scalping

### 6.1 Principle

Intraday trading never carries positions overnight — open and close within the day, avoiding overnight gap risk:

- **Scalping**: hold seconds to minutes, capturing 1–3 ticks of micro-spreads, compounding profit through extreme frequency and **<mark>win rate</mark>**.
- **Intraday swings**: hold tens of minutes to hours, catching one intraday leg (e.g. the open-fade or the midday run).

### 6.2 Example: Scalping

- Rebar last price 3500, best bid 3499, best ask 3500.
- Post a buy at 3499 → a market sell sweeps to 3501 → instantly sell at 3501 to close.
- Profit per lot = (3501 − 3499) × 10 = **20 CNY**; after commissions of ~4–8 CNY, net a dozen or so.
- Repeat 50–100 times a day, living on a 60%+ win rate and tight loss control.

### 6.3 Risk Points

- **Commissions and slippage devour profit**: the more you trade, the higher the friction; commission rebates are practically a precondition for intraday players.
- **Liquidity traps**: when the order book vanishes for a moment, the scalper becomes the bag holder.
- **Severe mental and physical drain**: full-day screen time + high-frequency decisions; sedentary strain and mood swings are occupational hazards.
- **High hardware/network demands**: retail latency always trails quant institutions; scalping in extreme markets = donating money.
- With heavy intraday size and no stop-loss, a single slip can erase a week's profit.

**Who it suits**: Full-time, extremely disciplined, emotionally stable short-term traders. **Beginner survival rates are lowest in intraday trading — it converts "trading skill" directly into a "commission bill".**

---

## 7. Algorithmic Trading

### 7.1 Principle

Algorithmic (quantitative) trading encodes trading rules into code, letting programs handle signal generation, order placement, and risk control. Core advantages:

- **Removes emotion**: stops, **<mark>take-profits</mark>**, and adds all execute by rule — no "holding losers", no "itchy hands".
- **Speed and discipline**: millisecond response; signals execute the moment they appear.
- **Multi-product, multi-strategy**: monitor dozens of products and strategies at once, diversifying risk.
- **Backtesting**: validate strategies on historical data before going live.

### 7.2 Three Levels of Automation

| Level | Description | Barrier |
|---|---|---|
| Automated execution | Rules made by hand, executed automatically (conditional/strategy orders) | Low; retail-accessible |
| Simple strategies | MA and breakout strategies fully automated | Medium; requires coding |
| High-frequency / quant | Factor models, stat arb, market making | Extreme; the institutional battleground |

### 7.3 Risk Points

- **Overfitting**: a strategy that looks perfect in backtest fails live — parameters were "fed" too precisely on history.
- **Failure in extreme markets**: at limit boards or when liquidity dries up, stop orders cannot fill and the program "follows the rules" straight into losses.
- **System failures**: lost connectivity, power, API anomalies, bugs — any can create runaway exposure.
- **Crowded stampedes**: many same-strategy programs executing at once at key moments amplify moves (flash crashes recur).
- **Slippage and impact**: strategy capacity is limited; large capital "moves its own fill price".

**Who it suits**: Investors who can code (Python/quant frameworks) and understand backtesting methodology. **Automation removes "human weakness", not "a wrong strategy" — a wrong strategy, once automated, loses faster and more steadily.**

---

## Strategy Selection Advice

| Your situation | Suggested strategy |
|---|---|
| Real spot business / occupational need | Hedging (get back to first principles) |
| Steady, chain-savvy, well-capitalized | Calendar / inter-commodity spreads |
| Screen time available, want systemization | Trend following (start with small **<mark>position</mark>** size) |
| Full-time, strong stamina, good hardware | Intraday / scalping (prove a positive month first) |
| Can code, loves research | Algorithmic (run one year of paper trading first) |
| Beginner | **Start with "paper trading + minimum size + a single product" only** |

**The bottom line common to all strategies** (revisit Article 02):

1. Per-trade stop-loss ≤ 2% of total funds.
2. Per-product position ≤ 20% of total funds.
3. Spare money only, never full margin, never hold losers.
4. Strategy loss exceeds the preset **<mark>drawdown</mark>** line (e.g. 15%) → stop, review — do not add size to win it back.

---

## Risk Warning

::: warning ⚠️ Risk Warning
- All futures strategies (including "low-risk" arbitrage) sit on margin and **<mark>leverage</mark>**; **any strategy can lose, and arbitrage can be force-liquidated too** (extreme spreads, margin hikes, liquidity evaporation).
- No strategy guarantees profit; "backtest returns" are not live returns — always validate live with minimum size first.
- High-frequency and algorithmic trading carry system-failure and extreme-market risks, with high demands on hardware, networks, and compliance.
- The strategies here are methodology introductions, not investment advice; **before entering the market, make sure you have fully understood Article 02 "Margin and <mark>Forced Liquidation</mark>"** and can bear a total loss of principal.
:::


---

## Summary

- Hedging: hedge spot with futures, **trading excess returns for certainty** — industrial clients only.
- Cash-futures arbitrage: earn the certain money of basis convergence; the barrier is the spot leg.
- Calendar spreads: bet on calendar-spread convergence, no direction — safer than outright but still losable.
- Inter-commodity spreads: bet on chain-wide ratios; deep logic, hard execution.
- Trend following: cut losses, let profits run; the mortal enemies are trendless chop and yourself.
- Intraday/scalping: earn micro-spreads; high fees, heavy attrition, low survival.
- Algorithmic: rules replace emotion, but the strategy and the system remain risk sources.

> Futures offer no "sure-win secret", only "ways to lose slowly". **First work out whose profit you are funding (commissions, slippage, counterparties), then decide whether to enter.**

::: warning ⚖ No Sure-Win Secret, Only Ways to Lose Slowly
**Futures offer no "sure-win secret", only "ways to lose slowly".** First work out whose profit you are funding (commissions, slippage, counterparties), then decide whether to enter — if you cannot do this math, you are most likely the one being contributed.
:::
