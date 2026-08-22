# Trading Systems

> Every earlier chapter taught you to "read the market"; this one teaches you to "manage yourself". Technical analysis answers what to buy and when to buy; a trading system answers how much to buy, when to cut the loss, what to do after a loss, and whether you will give the profits back. **Trading without a system is gambling; trading with a system is a business.**

---

## Chapter Guide

### Trading Plan

Placing orders without a plan is gambling: entering on a "feeling it will go up", holding losers to the bitter end, taking profits at the first tick — this is the daily routine of 90% of retail traders. This article lays out the **eight elements of a trading plan** (market / timeframe / entry / exit / stop-loss / position sizing / review / psychology) plus a complete template you can copy and fill in, and shows you how to translate "I feel it will go up" into conditions that are executable, verifiable, and reviewable. Finally, the expectancy formula EV = win rate × average win − loss rate × average loss shows you: **why a strategy with a 30% win rate can still make money, and a strategy with a 50% win rate can still lose it.**

### Risk Management

Decide how much you can lose before thinking about how much you can make — this is the one order of priorities in trading that admits no compromise. This article covers the three essentials of position sizing (fixed-fraction 1%-2% risk per trade, how to use the Kelly criterion and its limits, equal-risk sizing), four stop-loss methods (fixed amount / ATR / structure / time), and trailing take-profits that let profits run. The math is walked through in tables: **a 50% drawdown needs a 100% gain to break even**, and how far a 5x/10x/20x/50x leveraged position can move against you before liquidation — by the end you will understand that "controlling drawdown" is not a matter of style, it is a matter of survival.

### Trading Psychology

Why do retail traders always buy at the top and sell at the bottom? Why can't you press the button even when you know you should stop out? Why is a blow-up most likely right after three consecutive losses? Starting from the neural mechanisms (how FOMO and panic hijack your brain), this article dissects the five major cognitive biases (loss aversion / anchoring / confirmation bias / gambler's fallacy / disposition effect), each with a definition, a trading-scenario example, and countermeasures. It ends by answering the ultimate question — **why knowing doesn't mean doing** — and how to turn discipline into habit with rules, cooling-off periods, and automation.

### Equity Curve & Performance Attribution

The first three articles answer "how to do it"; this one answers "how well you did it". **The equity curve is a trader's health report**: steady uptrends, spike drawdowns, and long flat stretches each carry their own meaning and countermeasures. This article gives every key performance metric a common-sense passing line, walks through the math of drawdown recovery in tables (a 20% drawdown needs a 25% gain to break even; a 50% drawdown needs a double), and teaches you to use performance attribution to split P&L across strategy / instrument / session / direction — **find where the money was made and where it was lost** — before landing on actionable templates for daily logging and monthly reviews.

### Advanced Trade Review

A review is not a diary of what happened; it is **data-driven trade review**: a three-layer framework from single-trade review, through daily/weekly review, to the monthly system review. It turns "should have stopped out but didn't" and "itched to trade while supposed to be flat" into a countable **execution deviation rate**, uses emotion logs to locate your personal minefields, and uses "market-system fit" to judge whether losses come from strategy decay or environment mismatch. This article provides Excel/Notion/Feishu template designs and thoughts on automated review (linking to the Quant Practice chapter), plus a complete fictional weekly review report you can model after.

### Trading Journal & Checklists

A "daily three-part journal (pre-market / intraday / post-market) + weekly checklist + monthly system review" grounds the daily operation of a trading system: the journal records "what happened", the checklist ensures "everything that should be done was done". This article provides copy-ready templates, check metrics such as the execution deviation rate, and tool choices, complementing the "data-driven review" of the Advanced Trade Review article. **Core stance: record the facts first, check discipline second, pass judgment last — reverse the order and the review becomes self-consolation.**

---

## Learning Order for This Chapter

```text
① Trading plan (set the rules first: when to trade and how)
   ↓
② Risk management (then set the hard limits: how much you can lose at most, how to survive)
   ↓
③ Trading psychology (finally fix yourself: why you keep violating ① and ②)
   ↓
④ Trading journal & checklists (so ①②③ get checked and iterated daily/weekly/monthly)
```

- ① and ② can be studied in parallel, but **must come before real money**: run at least 20-30 trades on a demo or paper account first, then start with a small position.
- ③ is the ultimate difficulty: after finishing this article you will most likely still make psychological mistakes — the difference is that now you have a checklist to compare against and a journal to review.
- After finishing this chapter, combine it with the [Technical Analysis chapter](../technical-analysis/) to complete your first full trading plan, then move on to the [Pitfalls chapter](../pitfalls/) to see how others blew up.

---

## Content Conventions

- Formulas and figures follow general teaching conventions; specifics are always subject to each exchange's rules.
- Every section involving leverage and derivatives contains a "Risk Warning" box.
- Prices in the examples only illustrate the calculation and are not trading advice of any kind.
- Blacklist any indicator, signal, copy-trading service, or strategy that claims "guaranteed profit".

---

> **⚠️ Risk Warning**
>
> Everything in this chapter is for study and research only and does not constitute investment advice. Leveraged trading can wipe out your principal and even leave you in debt (negative balance). Participate only with money you can afford to lose, and fully understand margin and liquidation mechanics before trading for real (see the [Futures chapter](../futures/)).

---

## Chapter Contents

<DocCards dir="trading-system" />
