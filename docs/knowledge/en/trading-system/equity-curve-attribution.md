---
title: "04 · Equity Curve and Performance Attribution"
description: "Equity curve and performance attribution — how to read the equity curve, maximum drawdown, Sharpe ratio, and deciding whether profits come from a good system or a good market"
---

# 04 · Equity Curve and Performance Attribution

> The first three articles of this chapter covered "how to write a plan, how to control risk, how to manage your mind"; this one is the **acceptance test**: whether your system works is not decided by a handful of winning trades but by one thing — **the equity curve**. It also answers the sharper question: when the curve rises, is it because the system is good, or because the market is good? Where exactly does the money come from? That is performance attribution.

---

## 1. What the Equity Curve Is: A Trader's "Health Report"

### 1.1 Definition of the Equity Curve

**Equity curve**: the account equity (principal + floating P&L) plotted as one line over time. Record a point after every trade closes and after every daily close; the points joined together form your account's "electrocardiogram".

| Recording method | Basis | Use |
|---|---|---|
| Per-trade equity | One record after each close | Cross-check against the trade journal |
| Daily equity | One record at each daily close | Assess daily risk exposure |
| Weekly / monthly equity | One record per week / month end | See the long-term trend, filter noise |

**Why call it a "health report"**: a health report doesn't look at a single blood-pressure reading; it looks at trends and abnormal ranges. Same for the equity curve —

1. **Single-trade P&L is noise; the curve is the signal.** Winning 3 in a row doesn't mean the system is good, losing 5 in a row doesn't mean it is bad; only the shape and slope of a curve built from enough samples carry information.
2. **The curve is honest.** You can tell yourself "I'm actually profitable, the market has just been bad lately", but the curve doesn't lie — it reflects the net result of money in and money out.
3. **The curve exposes execution problems.** A stretch of abnormally steep decline usually maps to violations or revenge trading in that period (verify against the journal).
4. **The curve is the system's "blood pressure + blood sugar + blood lipids" combined report.** Slope shows earning power, drawdown shows risk control, volatility shows style stability.

> **Core idea: you are not trading a handful of market moves; you are trading "this curve".** Before every order, ask: does this trade help the curve's long-term shape, or does it just add one more random jitter?

### 1.2 Plotting Tools

- Beginners: manual entry in Excel / Google Sheets — one "equity" column plus a line chart is fully sufficient (template in Part 7).
- Advanced: a script pulling historical P&L from the exchange API to update automatically (see the [Quant Practice chapter](../quant-practice/)).
- Key requirement: **record continuously, don't cherry-pick.** Keeping only the profitable months and deleting the losing ones distorts the health report.

---

## 2. The Three Health Shapes of an Equity Curve

### 2.1 Shape Overview

| Shape | Characteristics | Meaning | Response |
|---|---|---|---|
| Steady uptrend | Stable positive slope, shallow and brief drawdowns | System fits the market environment; execution stable | Maintain; execute per plan; adjust only when backtests confirm the environment changed |
| Spike drawdowns | Long-term rise, but occasional 30%-50% craters | Strong earning power, but risk control has holes | Cut size, tighten **<mark>stop-losses</mark>**, add "daily / weekly loss circuit-breaker" rules |
| Long flat stretch | 3-6 months of slope ≈ 0, up and down | The system has no edge, or no longer fits the environment | Attribute: strategy decay → change the strategy; execution problems → fix discipline first |

### 2.2 Breakdown

**① Steady uptrend — the ideal, and rare.** Traits: shallow drawdowns (<10%), quick recoveries, stable slope. Note: such curves usually come with "a mediocre win rate but an excellent risk-reward ratio" — frequent small stop-losses + occasional big wins mean the curve climbs slowly most of the time.

**② Spike drawdowns — the most common problem account.** Typical script: three months of small gains → one heavy-position month → all profit given back. The causes of the spikes are almost always the same few:

| Spike cause | Mechanism | Fix |
|---|---|---|
| Single heavy position | One trade decides a month | Hard cap: risk per trade ≤ 2% |
| Sizing up after a losing streak | Revenge trading | Hard rule: stop after 3 straight losses |
| Trailing **<mark>take-profit</mark>** failure | A winner gives back everything | Trailing levels, once moved up, never move back |
| Instrument concentration | A single-instrument black swan | Per-instrument risk cap |

**③ Long flat stretch — the biggest confidence drain.** Flat ≠ losing, but 3+ months of flat usually means one of two things: **the strategy has no edge in the current environment** (a trend strategy in a prolonged range market), or **your execution is steadily bleeding away EV** (violations grinding positive expectancy down to zero). The test is the compliance rate: flat with compliance > 90% → a strategy problem, change the strategy; compliance < 70% → fix the human first, don't rush to change the strategy.

> **In one sentence: the curve's shape is the system's diagnosis, and both spikes and flats need "triage before treatment" — first decide whether it is a strategy disease or an execution disease, then act.** (The triage method is in Part 5, performance attribution.)

---

## 3. Key Performance Metrics: Review and Deepening

### 3.1 Metric Quick Reference

| Metric | Formula / definition | Passing line (common sense) | Excellent line |
|---|---|---|---|
| Annualized return | (End / start)^(1/years) − 1 | 15% | 30%+ |
| Maximum drawdown | Largest peak-to-trough decline of the curve | ≤ 20% | ≤ 10% |
| Sharpe ratio | (Annualized return − risk-free rate) ÷ annualized volatility | 1.0 | 1.5+ |
| Calmar ratio | Annualized return ÷ maximum drawdown | 1.0 | 2.0+ |
| Risk-reward ratio | Average win ÷ average loss | 1.5 | 2.0+ |
| Win rate | Winning trades ÷ total trades | 40% (low win rate + high risk-reward also works) | No standard |

> These numbers are **common-sense reference lines, not promises**. Anyone promising you "50% annualized, 5% drawdown, Sharpe 3" belongs on your blacklist — that is a photoshopped curve.

### 3.2 How to Read Contradictions Between Metrics

There is no "perfect across the board" metric combination; the combination itself describes a style:

**Scenario A: high Sharpe, low return.** Say 12% annualized, 6% drawdown, Sharpe 1.8. Reading: very steady but earns too little — most likely a **range / grid-type strategy**, high win rate, small per-trade results. Suited to the stability-minded, but note: high-Sharpe systems often have small capacity and fail the moment the regime changes (one-way trend).

**Scenario B: high return, high drawdown.** Say 40% annualized, 30% drawdown, Calmar 1.3. Reading: it earns, but the ride is agonizing — most likely a **trend-following strategy**, long flat stretches + occasional eruptions. Suited to those who can bear the psychological pressure, but stress-test with the drawdown number: **a 30% drawdown means 100k becomes 70k — could you keep executing the plan in that state?**

**How to choose:**

| Your situation | Prioritize | Why |
|---|---|---|
| The capital is living money / needed short-term | Maximum drawdown | Principal safety > return |
| Capital idle for 3-5 years, compounding | Annualized return × Calmar | Long-term growth under drawdown control |
| Professional / fund-style operation | Sharpe × Calmar × capacity | Institutions need "explainable, replicable" |
| Pure retail, small capital | Annualized return | Small capital first solves "is it enough to live on", then stability |

> **Core idea: metrics are style filters, not report cards.** When forced to choose between high Sharpe and high return, pick "the one that lets you sleep" — only the sleeping endure.

---

## 4. The Psychology and Math of Drawdown: The Recovery Timetable

### 4.1 The Math of Drawdown and Recovery

After a drawdown of n%, a gain of x% is needed to break even: **x = n / (1 − n)**. That is why "controlling drawdown" is not a style question but a math question:

| Drawdown | Gain needed to recover | How it feels |
|---|---|---|
| 10% | +11.1% | Barely noticed, acceptable |
| 20% | +25% | Starts to hurt |
| 30% | +42.9% | Agonizing |
| 40% | +66.7% | Close to breaking |
| 50% | +100% | Needs a double; most have quit |
| 70% | +233% | Nearly a death sentence |
| 90% | +900% | Dead in the clinical sense |

### 4.2 Recovery Timetable (at 3%, 5%, 8% Monthly)

| Drawdown | +3% per month | +5% per month | +8% per month |
|---|---|---|---|
| 20% | ~7.6 months | ~4.6 months | ~3 months |
| 30% | ~12.1 months | ~7.3 months | ~4.7 months |
| 50% | ~23.5 months | ~14.2 months | ~9 months |

**Three brutal corollaries of this table:**

1. **After a 50% drawdown, even steadily earning 5% a month takes 14 months to break even.** For that year-plus you are barely better off than someone starting from zero — drawdown destroys not just money but time.
2. **"Keep drawdown within 20%" matters because it is the floor for "recoverable within a year".** Beyond 30%, the combined psychological and time cost makes most people systematically give up.
3. **Drawdown damage is not linear.** 20%→30% looks like just 10 points more, but recovery time nearly doubles. **Before every size-up, think how far you stand from "a wasted year".**

> **The psychological point: the scariest part of a drawdown is not the money; it is how it keeps corroding your execution during the "recovery period".** That is why the Trading Psychology article stresses: keep positions small enough that "losing doesn't hurt" — mathematically the drawdown stays controllable, and psychologically you can survive the repair.

---

## 5. Introduction to Performance Attribution: Where the Money Was Made and Lost

### 5.1 Why Attribution Matters

The equity curve answers "did you make money"; attribution answers "**on what basis**". Traders who skip attribution credit themselves in wins and blame the market in losses — never learning what their edge is, and thus never able to amplify it or plug the leaks.

### 5.2 Dimensions of Decomposition

| Dimension | How to split | Attribution questions |
|---|---|---|
| Strategy | Group by strategy / signal | Which strategy contributed 80% of profit? Which one drags? |
| Instrument | Group by instrument | Is it BTC money or ETH money? Do I still earn without it? |
| Session | Group by month / weekday / hour | Do I depend on a few big months, or earn steadily every month? |
| Direction | Long / short groups | Can my system only go long? |
| Behavior | Group by compliant / violating | Did violations win or lose? Is violation profit poison or the norm? |

### 5.3 Example P&L Attribution (Monthly Attribution Table)

Below is a fictional account's monthly attribution (42 trades, net +8,460 USDT):

| Dimension | Group | Trades | Net P&L | Conclusion |
|---|---|---|---|---|
| Strategy | Trend breakout | 18 | +9,500 | Main profit engine; keep |
| Strategy | Pullback dip-buy | 24 | −1,040 | Losing; pause next month and review entry conditions |
| Instrument | BTC | 26 | +7,100 | Home turf |
| Instrument | ETH | 10 | +1,900 | Profitable but riding BTC's correlation |
| Instrument | SOL | 6 | −540 | Not my game; cut it |
| Session | US session | 24 | +8,200 | Edge session; focus here |
| Session | Asia session | 18 | +260 | Barely breakeven; trade less |
| Direction | Long | 30 | +8,900 | The system is only good at longs |
| Direction | Short | 12 | −440 | No edge shorting; cut down |
| Behavior | Compliant trades | 36 | +10,300 | The system itself makes money |
| Behavior | Violating trades | 6 | −1,840 | 6 violations cost 1,840 — purely negative contribution |

**Three lessons from this table:**

1. **The money was made by "strategy A + instrument X + session Y + long direction"**; the other combinations roughly break even or lose — **the next step is to contract the battle line and trade only the winning combination.**
2. **The 6 violating trades contributed −1,840**: without them the month would have been +10,300. **The cost of violations is real and countable — not a moral lecture.**
3. **Every conclusion points to an "action"**: pause the dip-buy strategy, cut SOL, reduce Asia-session trades and shorts, investigate the violations one by one — attribution's output must be an actionable list.

### 5.4 Common Attribution Mistakes

| Mistake | Truth |
|---|---|
| Only looking at monthly net value | Good net value may ride one lucky trade; must decompose to the behavior layer |
| One attribution is enough | Redo it quarterly; when the environment changes, the conclusions change |
| Only tallying the winning dimensions | The losing dimensions are the entry point for action — equally important |
| Mistaking luck for skill | One big win vs many small wins: a month propped up by a single 50k trade is not sustainable |

---

## 6. Setting Equity Curve Targets for a "Robust System"

> Common-sense targets, not promises, let alone guarantees. **Define "good enough" first, and you will know what the curve should look like.**

### 6.1 Reference Specs for a "Robust Curve"

| Dimension | Reference target | Notes |
|---|---|---|
| Annualized return | 15%-30% | A sensible excess over the risk-free rate; lower suggests no clear edge |
| Maximum drawdown | ≤ 20% | See Part 4: 20% is the psychological / mathematical floor for "recover within a year" |
| Calmar ratio | ≥ 1 | Return ÷ drawdown ≥ 1; earning outpaces losing |
| Share of negative months | 30%-50% | One-way trend systems have strings of flat months; that is normal |
| Risk per trade | ≤ 2% | Risk-management rules shape the curve |

### 6.2 Why 15%-30% / 20%

- **Annualized above 30% with drawdown under 20%** is a tiny top-tier combination in real markets; ordinary traders who target it are presetting failure.
- **Annualized below 15%** doesn't pay for the time and psychological cost of active trading — an index fund beats it.
- **The 20% drawdown floor** comes from Part 4's recovery table: 20% needs +25% back, about 4.6 months at 5%/month — that is a "bearable repair cycle".

> **The point of a target is not "hitting it"; it is giving the curve a frame of reference.** Check monthly: is the drawdown closing in on 20%? Is the annualized slope enough? If the direction is wrong, change course that same month.

---

## 7. Equity Curve Management in Practice

### 7.1 Daily Logging Template (10 minutes)

```markdown
# Equity curve log (2026-08-16)
- Account equity: ____ USDT (____% vs yesterday)
- Month to date: ____% (same period last month: ____%)
- Maximum drawdown this month: ____% (cap 20%; breaching triggers the circuit breaker)
- Trades closed today / P&L: ____ trades / ____ USDT
- Floating P&L of open positions: ____ USDT (not realized; logged separately)
- Violations today: □ none □ yes (____)
- One line: ____ (e.g. "executed strictly today, nothing unusual")
```

### 7.2 Monthly Review Report Template (1 hour)

```markdown
# Monthly review report (month ____)

## 1. Numbers overview
| Metric | This month | Last month | Target |
|---|---|---|---|
| Return | | | 15%-30% annualized, monthly equivalent |
| Maximum drawdown | | | ≤ 20% |
| Win rate / risk-reward | | | — |
| Number of trades | | | ≥ 30 samples for statistical meaning |
| Violations | | | 0 |

## 2. Equity curve shape
- This month's shape (steady uptrend / spike drawdown / flat): ____
- Chart: paste / describe the key turning points: ____

## 3. Performance attribution (see the table in Part 5)
- Main profit source this month: ____
- Main loss source this month: ____
- Next month's action list: ①____ ②____ ③____

## 4. Drawdown and risk review
- Deepest drawdown this month: which day, and why: ____
- Days to recover: ____

## 5. Execution and psychology review
- Violation list and the emotion at the time: ____
- Emotion-outcome cross-table (see Trading Psychology, 6.3): ____
```

### 7.3 When to Stop (execute on trigger, no negotiation)

| Trigger | Action | Basis |
|---|---|---|
| ≥ 3 consecutive losses | Stop for the day; rest ≥ 24 hours | Emotional-takeover risk (see the psychology article) |
| Daily loss ≥ 3% | No new positions for the day | Daily circuit breaker |
| Weekly loss ≥ 8% | Stop for the week; next week downgrade to 0.5% risk per trade | Weekly circuit breaker |
| Account drawdown ≥ 20% | Stop 1 week; full review: strategy? execution? market? | See Part 4's recovery table |
| Drawdown ≥ 30% | Forced half-size or flat, observe 1 month | Mathematically in the long-repair zone |
| Persistent insomnia / extremely low mood | Stop outright; resume when recovered | Psychology is a precondition of execution |
| 3 flat months with compliance > 90% | Pause the strategy; backtest whether it has decayed | Strategy–environment mismatch |

> **Stopping is not surrender; it is the highest-level move in equity curve management.** Every stop-loss and every stop serves the long-term shape of the curve.

::: danger 💀 A 50% Drawdown Requires Doubling Your Money to Break Even
**After a 50% drawdown, even steadily earning 5% a month takes 14 months to break even.** For that year-plus you are barely better off than someone starting from zero — drawdown destroys not just money but time. 20% is the floor for "recover within a year"; beyond 30%, the combined psychological and time cost makes most people systematically give up.
:::

---

::: warning ⚠️ Risk Warning
All passing lines and return targets in this article (such as 15%-30% annualized, ≤ 20% drawdown) are general teaching references and **do not represent any promise of returns** — any "signal group" or "strategy package" promising returns is a scam. The recovery table is pure mathematical derivation; actual recovery depends on market conditions, trade frequency, and execution quality, and may take far longer than derived. Equity curve management cannot eliminate losses; it only makes them visible, controllable, and attributable. Trade only with money you can afford to lose; **<mark>leverage</mark>** trading can wipe out your principal and even produce a **<mark>negative balance</mark>**.
:::
