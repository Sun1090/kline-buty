---
title: "Advanced Trade Review"
description: "Advanced trade review — upgrading from a diary to data-driven review across five layers: single trade, periodic, system, emotion, and market environment"
---

# Advanced Trade Review

> The Trading Plan article provided a basic journal template and the three-layer review framework; this article builds two things on top of it. **First, it upgrades "review" from "keeping a diary" to "data-driven trade review"** — so every record feeds the statistics. **Second, it fully answers "what to review"** — the five layers of single trade, periodic, system, emotion, and market environment: which method for each, and what conclusions each produces.

---

## 1. The Goal of Review: Not Excuses — System Fixes

First, two kinds of review:

| | Ineffective review (making excuses) | Effective review (fixing the system) |
|---|---|---|
| After a loss | "The market was crazy" "Whales shook us out" "It almost worked" | Back to the journal: which rule wasn't executed? Which rule itself doesn't hold? |
| After a win | "I'm a natural" "I said it would rise" | Back to attribution: was this profit a strategy edge or market luck? |
| Output | Emotional venting; repeat identically next month | An "action list": what to change, what to stop, what to verify |
| Object | Single-trade outcomes | System parameters + execution process |

**The only goal of review: make the next decision better than the last one.** Three test questions — did the review output actions? Were the actions executed? Was the effect verified afterward? A review without actions is self-consolation.

> **Core idea: you are not reviewing "did this week make money", you are reviewing "did this week's system work normally".** The part of the outcome decided by luck cannot be reviewed; the part of the process decided by you is the object of review.

---

## 2. The Three-Layer Review Framework

### 2.1 Framework Overview

| Layer | Frequency | Time | Question answered | Output |
|---|---|---|---|---|
| ① Single-trade review | Within 24h of each close | 5-10 minutes | Why this entry, why this exit, did the basis hold | Per-trade journal + compliance verdict |
| ② Daily / weekly review | Daily 5 min / weekly 30 min | Short | P&L distribution, execution deviation rate, emotional events | Deviation stats + stop-trigger check |
| ③ System review | Monthly, 1 hour | Long | Live vs backtest deviation; has the strategy decayed | Monthly report + parameter adjustment list |

### 2.2 ① Single-Trade Review: Why In, Why Out

Building on the plan article's journal template, add three "comparison columns":

```markdown
## Trade record #____ (review edition)
- Entry basis: triggered rule #____ of the plan (copy the original text: ____)
- Exit basis: ____ (target / trailing take-profit / signal reversal / time stop / ____)
- Review verdict:
  [ ] Entry basis was valid at the time (judged on information visible then, not hindsight price action)
  [ ] Exit executed per rule
  [ ] Did the rule's basis prove reliable afterward (did its win rate / risk-reward deliver)
- What this trade taught the system: ____ (change a rule / change a parameter / keep as is)
```

**Key: judge on "the information at the time", not "the outcome afterward".** A trade executed per plan that lost is a "compliant loss", worth +1 sample to the system; a violating trade that won is a "violating win", worth −5 samples — it teaches the system bad habits.

### 2.3 ② Daily / Weekly Review: P&L Distribution, Deviation Rate, Emotional Events

**Daily 5-minute checklist:**

```text
□ Did I complete a journal entry for every trade today?
□ Any violations? (if yes → log it in today's "emotional event record")
□ Did I touch a circuit-breaker line? (3 straight losses / −3% on the day)
□ Today's execution deviation rate = violating trades ÷ total trades (target 0)
```

**Weekly 30-minute stats table:**

| Metric | This week | Last week | Notes |
|---|---|---|---|
| Number of trades | | | |
| Win rate / risk-reward | | | |
| Expectancy EV (risk units) | | | average win ÷ average loss × win rate − loss rate |
| Execution deviation rate | | | violating trades ÷ total trades; target < 10% |
| Violation type distribution | | | which violation is most frequent |
| Emotional event count | | | how many emotional trades this week, at what cost |
| Weekly net P&L | | | compare against last week |

### 2.4 ③ System Review: Monthly Backtest-Consistency Check

**Core question: where does live performance deviate from historical backtest performance?**

| Comparison | Historical backtest | Live | Deviation | Deviation attribution |
|---|---|---|---|---|
| Win rate | 42% | 38% | −4% | Execution **<mark>slippage</mark>**? Or rules rewritten in the moment? |
| Average win | 2.1R | 1.6R | −0.5R | Were **<mark>take-profits</mark>** manually cut short? |
| Average loss | 1.0R | 1.3R | +0.3R | Were **<mark>stop-losses</mark>** moved or delayed? |
| Monthly return distribution | Steady positive | Lumpy | Large | Is position size unstable? |

**Decision flow:**

```text
Live vs backtest deviation
 ├─ Compliance high (>90%) but still deviating → strategy decay / regime change → consider adjusting parameters or pausing
 ├─ Compliance low (<70%) → execution problem → fix discipline first, don't touch the strategy
 └─ Sample too small (<30 trades) → not enough data; keep accumulating, draw no conclusions
```

> **Key: don't rush to change parameters while live performance is poor.** First ask "is the system broken, or is the human broken" — the more often you tweak parameters, the less chance the system has to accumulate a statistical edge (the flip side of overfitting: over-editing = rebuilding a brand-new system every time).

---

## 3. Quantifying "Execution Deviation"

### 3.1 What Deviation Is

**Execution deviation**: the gap between live actions and planned actions. Invisible and intangible, but countable. Turn deviation into a number and it goes from a "character flaw" to a "statistic".

### 3.2 Deviation Log (fill weekly)

| Deviation type | Count | Consequence each time (P&L impact) | Trigger context |
|---|---|---|---|
| Should have stopped, didn't | X | Lost ____ extra | E.g. overnight stop order never filled; woke up to a breakdown |
| Itched to open while supposed to be flat | Y | Lost/made ____ | E.g. itchy after a winning streak |
| Early take-profit (cut the profit) | | | E.g. couldn't resist at 1:1 when the plan said 1:2 |
| Moved stop/target in the moment | | | E.g. dragged the stop from 1% to 3% |
| Position over limit | | | E.g. planned 1% risk, actual 2.5% |
| Should have entered, didn't (missed) | | | E.g. signal appeared but hesitated |
| Chased the move (off-plan entry) | | | E.g. jumped in on a big green candle |
| Emotional counter-trade (revenge / get-it-back) | | | E.g. doubled up immediately after losses |

### 3.3 Deviation-Rate Metrics

```text
Execution deviation rate = violating trades ÷ total trades of the month × 100%
Execution perfection rate = 1 − execution deviation rate

Targets: deviation rate < 10%; ≥ 2 "perfect trading weeks" per month
```

**Let the numbers talk — an example**: a trader's January had 40 trades, of which "should have stopped, didn't" occurred 4 times, each costing on average 2 extra risk units (= 2% of capital) — **this single deviation type burned 4 × 2% = 8% of capital in one month**. If the system's edge is only 3% a month on average, this review proves one thing: **the system is making money; the human is giving it back.**

> **The deviation rate is the thermometer of execution.** Don't grade yourself with "I think I mostly followed the rules"; use numbers: only after 8 straight weeks with deviation < 10% does your execution count as "habit" rather than "effort".

---

## 4. Emotion Review Methods

### 4.1 Emotion Log (30 seconds per trade)

Add three fields to the journal template — record **facts**, not judgments:

```markdown
- Pre-trade emotion: □ calm □ excited □ anxious □ irritable □ confident □ tired □ bored
- Sleep: ____ hours    |    Excess alcohol / caffeine today: □ no □ yes
- Order impulsivity (1-5): ____ (5 = itching so badly I must click)
```

### 4.2 Emotion-Outcome Correlation Self-Check (monthly cross-table)

| Pre-trade emotion | Trades | Win rate | Average P&L (R) | Violation rate |
|---|---|---|---|---|
| Calm | 22 | 45% | +0.6R | 0% |
| Excited / FOMO | 6 | 33% | −0.8R | 33% |
| Anxious / irritable | 4 | 25% | −1.2R | 50% |
| Tired | 5 | 20% | −1.5R | 60% |

**Self-check method:**

1. The worse the emotion group, the higher the violation rate and lower the win rate → the statistics confirm "emotion decides execution quality".
2. Locate **your personal high-risk triggers**: late nights? right after losing streaks? too much coffee? a fresh argument? — write them into the plan's prohibition list.
3. Pair each high-risk trigger with a hard action: stop after a losing streak, no trading on tired days, watch-only after midnight.

> **The emotion log's purpose is not to "eliminate emotion"; it is to "map your personal minefield".** Everyone's minefield differs — finding it with data beats toughing it out with willpower.

---

## 5. Market-Environment Review: How Well the Market Fits the System

### 5.1 The Concept: No System Works Forever

Every system has its home turf: a trend strategy's home is trending markets; a range strategy's home is sideways markets. **When a system performs badly, sometimes the system isn't broken — it has simply left its home field.**

### 5.2 Monthly Market-Environment Log

| Item | This month's actual conditions |
|---|---|
| Market type | □ one-way trend (which way: ____) □ wide range □ tight sideways □ sharp reversal |
| Volatility level | This month's average ATR / historical average: ____ |
| My main instruments' price action | Up / down / range, magnitude ____% |
| Major-event impact | How many Fed / CPI / ETF-type events, with what effect |
| My system's performance | As expected / worse than expected (deviation ____%) |

### 5.3 Fit Assessment

```text
System P&L this month vs environment:
├─ Environment = system's home field, yet the system lost → execution problem or strategy decay (check the deviation rate)
├─ Environment ≠ home field, system lost slightly → normal wear; don't change the strategy
├─ Environment ≠ home field, system lost big → pause; wait for the home field to return
└─ Environment = home field, system won big → validated; continue next month and record the samples
```

**Example**: a trend-following system (backtested home field: one-way markets). In May the market went sideways for a month and a half; live result −2%. Against the fit table: environment ≠ home field, small loss → the conclusion is "normal system wear; keep the position rules; no adding, no heavy bets, no inventing new strategies". **The worst reaction: two losing months of chop → convert the trend strategy into a range strategy → the market trends next month → beaten on both sides.**

> **Give your system a "home-field concept" and you can translate "I lost this month" into "the system didn't go to work this month" — still losing money, but no longer fuming; the mindset changes at once.**

---

## 6. Review Tools

### 6.1 Excel / Google Sheets Template Design

Three sheets form the minimum closed loop:

```text
Sheet 1 "Trade log": date / instrument / direction / entry / exit / P&L in R / emotion / violation flag
Sheet 2 "Weekly stats": pivot from Sheet1: count / win rate / risk-reward / EV / deviation rate / emotion cross
Sheet 3 "Monthly review": metric overview + attribution split + environment verdict + next month's action list
```

Design points:

| Design point | Requirement |
|---|---|
| One row per trade | Don't write paragraphs per trade, or nothing can be tallied |
| P&L in R (risk units) | Use "multiples of risk" instead of absolute amounts for cross-month comparison |
| Violations as numeric flags | Violation = 1, compliant = 0; a plain SUM gives the deviation rate |
| Auto charts | The weekly sheet plots the equity curve and a deviation-rate bar chart |

### 6.2 Notion / Feishu Document Setup

- **Database views**: replace Excel with a Notion database / Feishu bitable — one record per trade, auto-grouped weekly / monthly, fillable from the phone anytime (the "log within 24h of closing" requirement only works if the phone can do it).
- **Review templates**: a fixed 30 minutes every Sunday night, open the "weekly review" template, fill it, archive it.
- **Monthly report**: reuse the monthly review report template from article 04, linked to the weekly review pages.
- **Pros**: recording and review share one source, traceable, collaborative; **cons**: manual tagging invites laziness — do a "data cleanup" quarterly.

### 6.3 Automated Review (advanced; links to the Quant Practice chapter)

Once manual statistics start eating your energy, hand them to scripts:

```text
Export fills from the exchange API → script cleans / tags (grouped by strategy, instrument, session)
→ auto-generate: equity curve, monthly stats, deviation rate, attribution table → saved as the monthly report
```

- Precondition: **run the manual statistics pipeline for 2-3 months first** and confirm the metric definitions are right before automating — automation only accelerates the statistics; it does not replace the act of reviewing.
- For implementation, backtest-consistency checks, parameter management, and overfitting defenses, see the [Quant Practice chapter](../quant-practice/).
- **Note**: automation solves "statistics" and "aggregation", but the judgment "what to change next month" always stays human.

---

## 7. Review Example: A Fictional Trader's Weekly Report

> Below is the weekly review of the fictional trader "Xiao Zhong" (2026-08-10 to 08-16, 14 trades for the week), walking the full review process. **All numbers are examples and represent no real performance.**

```markdown
# Xiao Zhong · Weekly Review Report (2026-08-10 ~ 08-16)

## 1. This week's numbers
| Metric | Value | vs last week | Verdict |
|---|---|---|---|
| Trades | 14 | 9 (+5) | Too many; check for itchy clicks |
| Win rate | 43% (6/14) | 44% | Normal |
| Risk-reward | 2.1 | 1.8 | Above normal |
| Expectancy EV | +0.3R/trade | +0.1R | Normal |
| Execution deviation rate | 21% (3 violations) | 11% | Worsened; this week's focus |
| Weekly net P&L | +2.1R (≈ +2.1%) | +0.9R | Profitable, but on violations |

## 2. Equity curve
- Monday to Wednesday steady climb (+1.4R); Thursday drawdown 0.9R (one big loss); Friday repaired to +2.1R.
- Deepest drawdown this week 1.2R; no circuit breaker touched.

## 3. Single-trade review (3 representative trades)
1. **#214 Compliant loss (−1R)**: breakout entry, stopped out. Executed per rule ✓; the entry basis still holds in hindsight; system sample +1.
2. **#218 Violating win (+2.2R)**: plan said 1:2 target; clicked out at 1:1.2, price then ran another 3%. Verdict: violation (early take-profit); made an extra 2.2R but taught the system bad habits — logged in the deviation stats.
3. **#221 Compliant big loss (−2R)**: stop planned but not placed (in a meeting); filled with slippage after the breakdown. Verdict: should have stopped, didn't (order delay); deviation type 1.

## 4. Execution deviation stats
| Deviation type | Count | P&L impact | Context |
|---|---|---|---|
| Should have stopped, didn't | 1 | −0.6R extra | In a meeting, stop order not placed |
| Early take-profit | 1 | Cut 1.8R of profit | Itchy at 1:1.2 |
| Itchy entry (while flat) | 1 | −0.4R | Couldn't sit out 4 flat hours on Wednesday |
| Total | 3 | −0.4R direct + 2.8R hidden cost | Deviation rate 21% |

## 5. Emotion review
| Pre-trade emotion | Trades | Violations | Notes |
|---|---|---|---|
| Calm | 9 | 1 | Violation from order procrastination, not emotion |
| Excited (after winning streak) | 3 | 1 | Itchy entry came after a streak |
| Tired (late night) | 2 | 1 | Early take-profit came on a tired day |
- Self-check conclusion: **late nights + post-streak are my two minefields**, consistent with last month's stats.

## 6. Market environment
- BTC rose then chopped this week; volatility ATR 20% below average; mostly range-bound.
- My trend system's home field is one-way movement → this week's profit came mainly from two big trend trades; flat during the chop.
- Verdict: moderate environment-system fit, as expected; no strategy change.

## 7. Three actions for next week (this week's review output)
1. Order discipline: **the stop order must be submitted together with the entry**; check open-order status before meetings (plugs the #221 hole).
2. Emotion rules: **no new positions on late-night days**; stop opening for the day after 3 straight wins (plugs itchy entries and early take-profits).
3. Verification item: keep tracking the deviation rate, target < 10% next week; if "early take-profit" recurs, switch take-profits back to exchange-native conditional orders.
```

**The lesson of the example: the week was profitable, but a 21% deviation rate means the money came from stacking luck on violations; the system's true output was only +0.3R/trade across 14 trades.** Left unfixed, the next losing week hands this week's profit back with interest — **the output of review is not "this week's summary", it is "next week's actions".**

---

::: warning ⚠️ Risk Warning
Review methods cannot guarantee profit; they only make errors visible and edges replicable. Deviation rate, emotion cross-tables, environment fit, and similar metrics are teaching conventions — adjust thresholds (such as deviation rate < 10%) to your own system instead of applying them mechanically. The trader and numbers in the example are fictional, for demonstrating the process only, and represent no real performance or return expectation. Trade only with money you can afford to lose; **<mark>leverage</mark>** trading can wipe out your principal and even produce a **<mark>negative balance</mark>**.
:::
