---
title: "07 · From Paper Trading to Live: The Path to Real Money"
description: "The path from paper trading to live trading — what simulation can and cannot teach, what to practice and the three traps, graduation criteria, switching to live with minimum size, and the first-30-days slow-down rules"
---

# 07 · From Paper Trading to Live: The Path to Real Money

> A demo account is driving school; the live market is the open road. Driving school teaches procedure and rules, but no driving school can simulate your heartbeat when the oncoming truck drifts into your lane. This article makes three things clear: what to practice on a demo account so the practice is not wasted, when you have graduated, and how to switch to live trading without paying your tuition in a single lump sum.

---

## 1. The Value and the Limits of Paper Trading

### 1.1 What a Demo Account Gives You

<mark>Paper trading</mark> is a practice field where you trade virtual capital against real market data. Its value is not "verifying whether a strategy makes money"; it is three things:

| Value | What it means |
|---|---|
| Mastering the mechanics | Orders, cancellations, stop orders, take-profit orders, position sizing — building muscle memory |
| Closing the loop | Running the full cycle of [trading plan](trading-plan.md) → execution → journaling → [review](journaling-checklists.md) until it flows |
| Zero-cost mistakes | Fat-finger orders, forgotten stop-losses, trades placed in the wrong direction — make these beginner errors on the demo account so you never pay real money to learn them |

### 1.2 What a Demo Account Cannot Give You

Two things can never be simulated:

1. **Real emotion.** Losing 20% of virtual capital earns a shrug; losing 20% of real money means reopening the account at 3 a.m. Every execution distortion driven by fear, greed, and revenge simply does not exist on a demo account.
2. **Real fills.** A demo assumes your order fills in full at the price you see. Live trading has **<mark>slippage</mark>**: in extreme conditions your stop may fill at an absurd price, and in small instruments there may be no counterparty at all.

> **Conclusion: the demo account trains "procedural correctness", not "profitability".** For a paper-trading record that shows 50% a year, halving it live would count as a good outcome.

---

## 2. What to Practice on a Demo Account

### 2.1 Practice "Executing a Complete Trading Plan", Not "Forecasting"

Every simulated trade must come with an in-plan record: entry rationale, stop price, target, position size, and the outcome. If any piece is missing, the trade does not count — treat it as practice thrown away. The evaluation criterion is not "did it profit" but "was this trade executed 100% according to plan".

### 2.2 Practice the Journaling Habit

From day one on the demo account, use the exact journal format you will use live (templates in [Trading Journal and Checklists](journaling-checklists.md)). Habits transfer: journal casually in the demo and you will trade casually live.

### 2.3 Run One Fixed Strategy Through N Trades

The most common way to waste a demo account is "random clicking": breakout today, dip-buying tomorrow, tips the day after — three months later all you have is screenshots. The correct approach:

- **Fix one strategy** (the kind whose rules are written down);
- **Complete a preset number of trades** (say 30) before you are allowed to evaluate or change anything;
- Every "inspiration" during the period goes into a notebook, not into an order.

> Statistics are only meaningful when the sample is homogeneous. Thirty records of the same strategy are statistics; thirty contradictory operations are just a diary.

---

## 3. Three Demo-Account Traps

### Trap 1: Mistaking Fake Liquidity for Real Fills

On the demo account you dart in and out of small-cap coins and obscure stocks. Live, the same order may cost you 1%-3% in slippage or never fill at all. **For anything thinly traded on the demo, discount your live expectations on purpose.**

### Trap 2: No Emotional Pressure Means Inflated Discipline

Everyone is a discipline master on a demo account: stops are placed without hesitation, losers are cut cleanly. That is not discipline — it is that the loss doesn't hurt. **Your demo discipline cannot be used as an assessment of your real execution.** True execution data can only come from live trading, even at the smallest size.

### Trap 3: Strategy Hopping Accumulates Experience, Not Statistics

Switch strategies every two weeks and you will "experience" 50 strategies in two years with a dozen samples each — what you gain is breadth of experience, not the statistics of whether any single strategy works. The most important deliverable of the demo stage is a record with **sufficient sample size and consistent methodology**, not variety.

---

## 4. Graduation Criteria: When You May Go Live

All three must hold:

| Criterion | Requirement | Why |
|---|---|---|
| Sufficient sample | **≥ 30 trades of the same strategy** on the demo | Below 30 trades, win rate and payoff ratio are mostly noise |
| Explainable results | Positive overall <mark>expectancy</mark>, or if negative, clearly written improvement items | The point is not "making money" but "knowing why you win or lose" |
| Complete records | Every trade has an in-plan entry, stop, position size, and review record | An unrecorded demo session equals no demo session |

::: tip The One-Question Final Exam
Ask yourself: "What was the stop price on my last trade, why was it there, and what is my next move if it gets hit?" — if the answer requires digging through your records, you have not graduated.
:::

---

## 5. Switching to Live: How to Start

### 5.1 Start With the Minimum Position

Size your first live trades by the standard "losing all of it would not affect my mood or my life", not by "it should produce meaningful profit". The reasons:

- The goal of month one is **letting emotion into the game** — observing how you react to real losses, not making money;
- Only when the position is small enough to be painless do you have the headroom to compare "live me" with "demo me" and find the difference.

### 5.2 Expect Month One to Be Worse Than the Demo

This is the normal pattern, not a regression. The gap comes from three places:

| Source of the gap | Demo | First live month |
|---|---|---|
| Fills | Full fill at the quoted price | Slippage, partial fills, orders that never fill |
| Emotion | None | Hesitation to enter, trembling hands at stops |
| Frequency | Trade whenever you like | You deliberately slow down, so trade count naturally drops |

**Accept the gap and define month one as a "paid observation period"**: the object of observation is your execution deviation, not the account balance. How to measure execution deviation is covered in [Advanced Trade Review](trade-review.md).

### 5.3 Risk Rules Do Not Change

From the very first live trade, enforce exactly the same [risk management](risk-management.md) as on the demo: risk per trade ≤ 1%-2% of capital, stop before entry, and stop trading on any rule violation. **The only permitted difference is position size — never rule tightness.**

---

## 6. The First 30 Live Days: Slow-Down Rules

For your first month, three iron rules:

```text
① No leverage: no matter how smooth the demo was, run spot / unleveraged for 30 days.
② No new strategies: use only the one that completed 30 trades; every other idea goes into the notebook.
③ Planned trades only: no pre-written plan, no trade.
   —— Lower frequency is a feature, not a flaw; it means the filter is working.
```

At the end of the 30 days, run a dedicated review: compare execution deviation, fill quality, and emotion logs between the still-running demo and the live account. The item with the widest gap is the next thing to train.

> Only after these 30 days should you discuss adding leverage, strategies, or size. Those who reverse the order mostly find their own photos in the [Pitfall Survival chapter](../pitfalls/).

---

::: danger 💀 Never Set Live Return Expectations From Demo Results
The purpose of a demo record is to validate process, not to forecast returns. Budgeting your living expenses off a demo annualized return almost guarantees oversized positions and a broken mindset — the top two ways beginners exit this game.
:::

::: warning ⚠️ Risk Warning
Live trading can lose all capital invested; demo performance does not represent live results, and past records do not guarantee future returns. This article is for study and research only and does not constitute investment advice; trade only with money you can afford to lose, and refer to the latest rules of your platform.
:::
