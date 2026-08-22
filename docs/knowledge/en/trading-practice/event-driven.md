---
title: "Event-Driven Trading"
description: "A practical guide to event-driven trading — position around known events like earnings and NFP, buy the expectation, sell the fact."
---

# Event-Driven Trading

> Event-driven trading (Event-Driven Trading): positioning around **high-impact events at known times** (earnings, NFP, CPI, central bank decisions, elections, geopolitical conflicts). Its biggest difference from other styles: **you don't need to predict direction — you prepare before the event happens and execute your plan after** — "buy the expectation, sell the fact" is the core of this logic.
>
> But it is also the window where retail traders lose money fastest: the gap at the moment of a data release can erase a month of profit in one second. This article covers how to prepare, how to participate, how to control **position size**, and the most common ways to die.

---

## 1. Event Taxonomy: Which Events Are Worth Trading

| Event type | Typical examples | Instruments affected | Predictability |
|---|---|---|---|
| Earnings season | A-share earnings previews/reports, US quarterly reports | Individual stocks, related sectors | Timing certain, outcome uncertain |
| Macro data | NFP, CPI, GDP, PMI, unemployment | Equity indices, FX, gold, Treasuries | Timing certain, market expectations exist |
| Central bank decisions | Fed/ECB/BoJ rate meetings | Global risk assets, FX rates | Timing certain, path expected |
| Supply-side events | OPEC+ meetings, cut/boost decisions | Crude oil | Timing roughly certain |
| Political events | Elections, referendums, policy releases | The country's assets | Timing certain |
| Geopolitical conflicts | War, sanctions, supply cutoffs | Safe havens (gold), energy, shipping | Timing uncertain, most sudden |
| Crypto project events | Token upgrades, mainnet launches, large airdrops | The specific tokens | Timing roughly certain |

**Classification (determines your response):**

| Type | Definition | How to handle |
|---|---|---|
| Certain time + uncertain outcome | Earnings, CPI, rate meetings | Position in advance via an event calendar, trade the expectation gap |
| Uncertain time + huge impact | Geopolitical conflicts, black swans | Cannot pre-position; rely on position control and "never ride naked" |
| Certain good/bad news | Forced delisting, unambiguous policy | Usually already priced in — beware sell-the-news |

---

## 2. Preparing in Advance: Event Calendar and the Expectation Gap

### 2.1 The event calendar

Build your own event calendar 1-2 weeks ahead (sources: economic calendar sites/apps, exchange announcements, company investor-relations pages):

```markdown
## This Week's Event Calendar (example)
| Date | Time (Beijing) | Event | Affected instruments | Market expectation | My plan |
|---|---|---|---|---|---|
| Monday | 21:30 | US Nonfarm Payrolls | Gold/USD/equities | +200k jobs | Trim before data, watch reaction after release |
| Wednesday | 02:00 | Fed rate decision | Risk assets | 80% chance of +25bp hike | No adds, wait for dot plot |
| Friday | 09:30 | Company X earnings | That stock | EPS expected 1.00 | No gambling before earnings, follow trend after |
```

### 2.2 Expectation and expectation gap: why "buy the expectation, sell the fact" works

**Price reflects "expectation", not "fact".** When good news is fully expected by the market, it has already been bought; at the release moment, unless the result beats expectations, price has no reason to keep rising — profit-takers cash out instead. That is "buy the expectation, sell the fact".

**Numeric example (gold vs NFP):**

```text
Event: US Nonfarm Payrolls, market expects +200k jobs
Before: consensus sees strong employment → USD index and Treasury yields rise early,
        gold falls from 1980 to 1930 (gold-negative expectation, already priced)
Release: actual +180k, below the 200k expectation
Reaction: expectation gap = actual − expected = −20k (USD negative)
        gold spikes from 1930 to 1960 (buying the fact: below expectations = gold positive)
```

**Three outcomes of the expectation gap (historical statistics, not predictions; defer to actuals):**

| Case | Result vs expectation | Typical move |
|---|---|---|
| In line with expectation | Gap ≈ 0 | Reversal or drift after release — the news was priced |
| Beats/misses materially | Clearly better/worse than expected | A run along the surprise direction (but the first leg often fakes) |
| Double whammy | Data bad itself + worse than expected | Large one-sided move (e.g. CPI beat + prior revised up) |

::: tip 💡 The core concept of event trading
The market trades **the gap versus expectations**, not whether the number itself is "good". A "good" print that merely matches expectations carries no new information.
:::

### 2.3 Where to find expectations (executable checklist)

| Event type | Expectation source | Notes |
|---|---|---|
| Macro data | Economic calendars' "consensus estimate" column, Bloomberg/Reuters surveys | Institutional forecast medians exist weeks ahead; track revisions too |
| Fed rates | CME FedWatch tool (implied probabilities from rate futures) | Hike/cut probabilities are a direct reading of the expectation gap |
| Central bank path | Dot plot (FOMC), officials' speeches | Wording (hawkish/dovish) often matters more than the decision |
| Earnings | Analyst consensus (EPS/revenue median) | Compute the gap as "actual vs consensus" |
| Oil/OPEC+ | Reuters surveys, producer officials' trial balloons | Cut-size expectations revise dynamically with the news |

**Usage discipline:**

1. **Track "expectation revisions", not just the final figure.** If consensus revises from 250k down to 180k a week before release, an eventual 200k may be "below the original estimate" but "above the latest expectation" — completely opposite directions;
2. **The more unanimous the expectation, the more dangerous.** With the whole market aligned (e.g. 100% hike odds), any deviation produces a big move;
3. Decide on the difference between "my view vs market expectation", **not on "good or bad data"** — your personal opinion is worthless against market pricing.

---

## 3. Earnings Trading

### 3.1 A-share earnings previews / US quarterly reports

| Scenario | Description | Typical play |
|---|---|---|
| A-share earnings preview | Fixed schedule; results quality knowable weeks early | Preview games usually complete before the announcement; **gap-up-then-fade on preview day is common** (sell-the-news) |
| US quarterly reports | Released pre/post-market; first trading day often gaps 5%-15% (historical statistics; defer to actuals) | Gambling before vs chasing after earnings — see below |

### 3.2 Gambling direction before vs chasing trend after: win-rate common sense

| Approach | Win-rate common sense (historical statistics) | P&L profile | Main risk |
|---|---|---|---|
| Gamble direction before earnings | Near coin flip (~50%) | Big gap profits when right | Equally big gap losses when wrong; **implied volatility** expensive (options carry high Vega) |
| Chase trend after earnings | Slightly higher (55%-60%, historical statistics) | Clear information, follow through | The gap has eaten most of the profit, **risk-reward** worsens |
| Fade after earnings (bet sell-the-news) | Depends on "whether expectations were stretched" | More effective the fuller the expectation | Judging "fullness" is hard; easy to catch falling knives |

**Practical advice:**

1. **Don't gamble direction before earnings.** Coin-flip odds + rich implied volatility makes long-run negative expectation near-certain (especially buying options: post-earnings IV crush can lose money even when direction is right — historical statistics; defer to actuals).
2. **After earnings, only trade "pullbacks after breakout" or volume-confirmed trends — never chase the first jump.** Wait for direction to clarify 15-30 minutes after the open and for confirmation signals.
3. **Cap per-trade size (see Part 5); gaps can jump straight over your <mark>stop-loss</mark> level** — use "stop-loss level + gap contingency" as double protection.

---

## 4. Macro Events: Volatility Patterns Around Releases

### 4.1 The 30 minutes before release: the calm before the storm

| Trait | Behavior | Response |
|---|---|---|
| Volume shrinks | Big players watching, volume well below normal | Don't open new positions in this window |
| Narrow oscillation | Price bounces in a tiny range | Existing positions face "two-sided stop hunts" |
| Stops swept | Institutions hunt stops during thin **liquidity** | Move stops away / trim before release |

### 4.2 The release moment (first 1-5 minutes): the first wave often fakes

- Price lunges one way instantly, then **often gives back sharply or reverses within minutes** — the first wave is liquidity vacuum plus programmatic front-running; its direction isn't necessarily sustainable (historical statistics; defer to actuals).
- Response: **don't chase the first wave.** Observe 5-15 minutes after release, wait for the second wave's direction (in most cases only the second wave reflects the real expectation gap).

### 4.3 The 30 minutes after release: direction clarification window

| Period | Typical pattern (historical statistics) | Trading window |
|---|---|---|
| 0-5 min after | Instant gap + first lunge | Chasing forbidden |
| 5-15 min after | Giveback/reverse probe, then re-selecting direction | Watch and confirm |
| 15-60 min after | Trend unfolds along the true direction | Can enter with the trend; widen stops by ATR |

::: warning ⚠️ The first wave at release often fakes — don't chase it
**The first wave right at data release is often a fake-out.** Price lunges one way instantly, then often gives back sharply or reverses within minutes — the first wave is liquidity vacuum plus programmatic front-running, and its direction isn't necessarily sustainable. Watch 5-15 minutes after release and wait for the second wave's direction before acting.
:::

**Volatility traits of major events (historical statistics, not predictions; defer to actuals):**

| Event | Typically affected instruments | Volatility profile |
|---|---|---|
| NFP | Gold, USD, equity indices | Extreme instant volatility; "spike then fade" common |
| CPI | Treasuries, USD, equities, crypto | Surprise = broad risk-off, effects lasting days |
| Fed decision | Everything | Two phases: decision instant + press conference (wording matters more than the rate) |
| OPEC+ meeting | Crude oil | Cut/boost magnitude versus expectations sets direction |

---

## 5. Position Discipline for Event Trading: The Half-Position Rule

**Event moves are 2-3× normal volatility (historical statistics, not predictions; defer to actuals) — the same position doubles its risk in event markets.** The answer is one rule: **the half-position rule**.

| Case | Normal position | Event-market position |
|---|---|---|
| Per-trade risk | ≤ 1% of capital | **≤ 0.5%** |
| Daily risk | ≤ 2%-3% of capital | **≤ 1%-1.5%** |
| Leverage | Normal | **Halved or none** |
| Positions held into data | Hold normally | **Trim or hedge before data (reduce directional exposure)** |

**Additional discipline:**

1. **Stops must be placed in advance** — there is no time to act manually at the gap instant; resting orders are the only execution guarantee;
2. **No new positions in the 30 minutes before release** (leave that knife fight to quant firms and **market makers**);
3. **One event, one direction — no "clever cross-instrument hedging"** — event reactions routinely exceed your model;
4. Two losing events in a row → stop and review. Event samples are small; consecutive losses mean your expectation model is wrong, not that luck is bad.

::: danger 💀 The half-position rule
**Event moves are 2-3× normal volatility — the same position doubles its risk.** One answer: the half-position rule — per-trade risk from ≤ 1% of capital down to ≤ 0.5%, daily risk from ≤ 2%-3% down to ≤ 1%-1.5%, and **<mark>leverage</mark>** halved or dropped. Place stops in advance; open nothing new in the 30 minutes before release.
:::

---

## 6. Ways Event Traders Die: Checklist

| Death | Script | Antidote |
|---|---|---|
| Front-running | Heavy bet 30 minutes pre-data, swept out by the fake first wave | No adds/new positions before data; wait 15 minutes after release |
| Chasing the first wave | Jumping into the gap at release, catching the exact reversal point | Wait for second-wave confirmation; enter 5-15 minutes later |
| Data double whammy | Beat expectations + prior revised up, losses amplified | Half-position rule — even a double whammy finds "no position to kill" |
| Sell-the-news distribution | News merely matches expectations, gap-up fades and traps you | Remember: in line = no new information; don't chase highs on release day |
| Gambling pre-earnings | Buying options/heavy before earnings; IV crush + wrong direction = double loss | Don't gamble pre-earnings (Part 3); follow confirmed signals after |
| No event calendar | Forgot CPI is tonight; gap blows through your stop | Build a weekly event calendar; check positions and stops before events |
| Riding naked into geopolitics | Fully invested, unhedged; one sudden move resets everything | Keep a cash buffer always; black swans can't be predicted but margin can be reserved |
| Over-modeling events | Believing "hikes must fall, cuts must rally" | Markets trade the expectation gap: a fully-priced hike rising instead is common |

---

## 7. Full Event-Trading Workflow (Action Checklist)

```text
[1 week before] Build/update the event calendar; note affected instruments and market expectations
[1-3 days before] Fix your plan:
   ① What is the expectation? (calendar consensus value + recent revision direction)
   ② For each scenario — beat/in-line/miss — what exactly will I do?
   ③ Position: compute amounts under the half-position rule
[1 hour before] Check:
   □ Stops placed for existing holdings? Away from pre-data sweep zones?
   □ Any new-entry plan scheduled "15+ minutes after release"?
[Release instant] Do nothing; observe the first wave
[15-60 min after] Execute per plan:
   Confirm second-wave direction → enter with trend at half position → widen stop by ATR
[After] Review: directional call, entry timing, position vs plan
```

## 8. Quick Reference: Common Event-Trading Fallacies

| Fallacy | Reality |
|---|---|
| Bad data = must fall | Direction depends on "data vs expectation", layered with liquidity behavior at release; no guaranteed move |
| Positioning early beats chasing late | Early positions must survive pre-data volatility and stop sweeps; late entries give up some **spread** but get clearer signals |
| Hikes fall, cuts rally | A priced-in hike can flip to "bad news exhausted = good"; what's traded is the gap, not the event itself |
| Everyone makes money in earnings season | Earnings volatility is zero-sum against institutions and algorithms; retail's edge is discipline, not information |
| Event trading requires insider info | Public sources (calendars, consensus, probability tools) suffice; tips are mostly noise |
| One big event defines the year | Never double down after a single-event loss (stop after two straight); event trading is not a core strategy |
| Rush in as soon as data drops | First-wave fake-outs are the norm; wait 5-15 minutes and confirm the second wave |

---

::: warning ⚠️ Risk Warning
Event markets are the most violent and least controllable by gaps of all regimes; history is full of traders who called direction correctly yet were badly hurt by oversized positions or missing stops. All win rates, volatility magnitudes, and timing windows here are **historical statistics, not predictions; defer to actual market conditions**; treat event data and consensus values as subject to official release channels and market consensus. Participate only with money you can afford to lose — leveraged trades in event markets can wipe principal in an instant or produce a **<mark>negative balance</mark>**.
:::
