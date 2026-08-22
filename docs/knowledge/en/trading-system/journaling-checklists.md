---
title: "Trading Journal and Checklists"
description: "Trading journal and checklists — daily, weekly, and monthly logging and review templates; using checklists to enforce discipline and close the trading-system loop"
---

# Trading Journal and Checklists

> The Trading Plan article gave you the "before entry" rules; Advanced Trade Review gave you the "after exit" statistics. This article fills in the middle stretch that is easiest to skip yet does the most for stable execution: **what to write daily, what to check weekly, what to audit monthly**. The journal records "what happened"; the checklists ensure "everything that should be done was done" — together they close the loop of an iterable trading system.

---

## 1. The Division of Labor: Journal vs Checklists

| | Trading journal | Checklists |
|---|---|---|
| Answers | "What did I do" | "Did I do what I was supposed to" |
| Form | Narrative + data (templated records) | Tick-box lists (check items) |
| Frequency | Per trade / daily | Daily / weekly / monthly |
| Purpose | Leave traceable facts | Prevent forgetting and wishful thinking |

**Why checklists beat willpower**: the most expensive errors in trading are not "wrong calls" but "skipped steps" — forgetting overnight news, forgetting to place the **<mark>stop-loss</mark>**, going full-size in an emotional surge. A checklist turns "should do" into "tick the box", freeing discipline from the load of memory.

> **Core idea: the journal answers "what are the facts"; the checklist answers "is discipline present".** Record the facts first, check discipline against the list second, pass judgment last — reverse the order and the review turns into finding excuses for yourself.

---

## 2. Daily Journal Structure: Three Parts

### 2.1 Pre-Market (5-10 minutes)

Pre-market is not "guessing up or down"; it is "checking state":

```markdown
## Pre-market check (date / instruments / timeframes)
- [ ] Overnight news: any earnings / data / policy / big events (____)
- [ ] Current positions: ____ trades, direction ____, stops ____, targets ____
- [ ] Today's planned trigger levels: breakout ____ / pullback ____ / invalidation ____
- [ ] Position cap: today's maximum risk = account × ____% (fixed fraction; see Risk Management)
- [ ] Emotional self-rating: calm / anxious / euphoric (____)
- [ ] Today's no-action list (if written, stick it here): ____
```

**Key point**: pre-market is for "confirming", not "forecasting". If you slept badly or feel unstable, write it straight into "emotional state" — **in an abnormal state, execute only pre-planned signals that day; open nothing new**.

### 2.2 Intraday (a record per trade)

Complete the record within 1 minute of each execution; upgrade the template from the journal template of [Trading Plan](trading-plan.md) into a "comparison edition":

```markdown
### Trade #____
- Time: ____ / instrument: ____ / direction: ____
- Entry basis (copy the plan's original text): ____
- Entry price / stop / target: ____ / ____ / ____
- Matches the plan: [ ] yes [ ] no (if no — why: ____)
- Exit price / P&L: ____ / ____
- Exit basis: ____ (target / trailing **<mark>take-profit</mark>** / signal reversal / time stop / ____)
- Execution deviation (if any): ____
```

**Key**: intraday, record only "what was done" and "on what basis" — **no hindsight emotions like "I thought it would rise"**. Emotions belong to the post-market journal; writing them mid-session only disturbs the next trade.

### 2.3 Post-Market (5-10 minutes)

The post-market journal is the day's "mini review" — only three questions:

```markdown
## Post-market journal
1. How many trades did I execute today? ____; of which per plan ____, violations ____
2. For the violating ones, which step broke down? (no confirmation waited / no stop placed / added size / emotional impulse / other)
3. One action to change tomorrow: ____ (only one; more changes equal no change)
4. Today's most memorable market fact (not opinion): ____
```

**Key point**: keep the post-market journal to 5-10 minutes and output only "one improvement action". **One action per day is five verifiable improvements per week** — far more effective than one weekend session of "deep reflection".

---

## 3. Weekly Checklist

Spend 30-60 minutes every Sunday ticking through the list. Note: **the object of the weekly review is "the system", not "whether this week made money"**.

```markdown
## Weekly review (week __)
### Execution
- [ ] This week: ____ trades total, ____ per plan, execution deviation rate = ____% (target < 10%)
- [ ] Deviations clustered in: entry timing / stop execution / position size / early exits / revenge trading (____)
- [ ] Any "off-plan" trades this week? ____ trades, why: ____

### Results
- [ ] This week's P&L: ____; does it match the deviation rate (high deviation + profit = luck; low deviation + loss = strategy problem)
- [ ] Average risk-reward of winners / losers: ____ (target: match the strategy design)

### Environment
- [ ] This week's market-strategy fit self-rating (1-5): ____
- [ ] Any "within-strategy losing streak"? ____ (if so: normal drawdown or strategy failure?)

### Output
- [ ] 1-2 adjustments for next week: ____
- [ ] Next week's biggest risk events / data: ____
```

**Three disciplines of the weekly review**:

1. **Statistics before interpretation**: compute the deviation rate and risk-reward first, then talk "why";
2. **Separate luck from skill**: a big winning week doesn't prove you're good, a losing week doesn't prove the strategy is broken — look at the **execution deviation rate**, the metric that doesn't depend on outcomes;
3. **Adjust in small steps**: change only a small part of the parameters at a time; log "change + expected effect" and verify against it next week.

---

## 4. Monthly System Review

The monthly review is a "system-level health exam"; combine it with the three-layer review framework of [Advanced Trade Review](trade-review.md):

```markdown
## Monthly system review (month ____)
### Data
- [ ] Total trades / win rate / average risk-reward / maximum drawdown: ____
- [ ] vs last month: win rate ____, risk-reward ____, drawdown ____ (trending better or worse?)
- [ ] P&L split by instrument / direction / session (where money was made, where lost): ____

### Rules
- [ ] Share of in-plan rules actually executed this month: ____%
- [ ] Any rule "repeatedly not executed"? ____ → delete it, or change how it's executed (e.g. automated reminders)?
- [ ] Any rule "never triggered"? ____ → no opportunity from the market, or the rule itself is dead?

### Position and risk
- [ ] Did the largest single loss exceed the preset risk cap? ____
- [ ] Any "size-up / bag-hold" violations this month? ____

### Output
- [ ] Next month's rule-change list (explicitly "delete / modify / add"): ____
- [ ] Next month's verification target (a countable metric, e.g. deviation rate down to X%): ____
```

**The monthly review's output must be a "change list"**: delete dead rules, fix stale parameters, add verification items — a monthly review with no changes means the month passed for nothing.

---

## 5. Tools for Grounding the Checklists

| Tool | Suited for | Notes |
|---|---|---|
| Paper / memo app | Simplest start | 3 minutes a day; first build the "recording" habit |
| Excel / spreadsheets | Statistical work | Good for monthly aggregation and deviation-rate calculation |
| Notion / Feishu bitable | Template-driven | Prebuilt journal / weekly / monthly templates; fill from the phone |
| Trading-terminal built-in notes | Fast intraday logging | Kline Buty's position / watchlist notes work as intraday shorthand |
| Automated reminders | Anti-forgetting | A scheduled post-close ping: "did you write today's journal?" |

**Getting-started advice**: don't build the perfect spreadsheet system on day one — **first log 20 consecutive trades + 2 full weekly reviews**, then upgrade tools where it actually hurts. Tools exist to make the process smoother, not heavier.

---

## Summary

An iterable trading system = **plan (before) + journal (during) + checklist (after) + changes (iteration)**. This article's daily three-part journal handles "recording the facts"; the weekly / monthly checklists handle "checking discipline and iterating the system". Get it running first, polish the templates later — **after 100 logged trades, the data in your hands becomes a personalized textbook no book can give you**.

> In one sentence: **the journal is evidence for your future self; the checklist is a lock on your impulsive self — miss either, and review is just self-consolation.**

::: warning 🚨 Log 20 Consecutive Trades + 2 Full Weekly Reviews Before Upgrading Tools
**Log 20 consecutive trades + 2 full weekly reviews first, then upgrade tools where the pain actually is.** Tools exist to make the process smoother, not heavier — don't build the perfect spreadsheet system on day one; run first, polish later. After 100 logged trades, the data in your hands becomes a personalized textbook no book can give you.
:::

---

## Content Conventions

- Thresholds in the templates (execution deviation rate < 10%, position fractions, etc.) are general recommendations; adjust them to your own strategy and risk preference.
- Example numbers only illustrate the templates and imply no promise of returns.
- For specific trading tools, follow each tool's latest interface.

::: warning ⚠️ Risk Warning
**A journal and checklists only have value with "honest records + regular rereads" — beautifying the record is lying to your future self. Review conclusions serve to improve the system, not to blame emotions.**
:::
