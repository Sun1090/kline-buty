---
title: "05 · Economic Calendar User Guide: Event Classification, Weekly Scheduling, and Event Trading"
description: "Data is not a flood; it is a train on a schedule — and the economic calendar is the timetable. Knowing which 'event checkpoints' your holdings must pass this week gives your position sizing and stop-losses a target. This article covers the three-tier event classification, the 10-minute Sunday-evening scheduling method, position checks before m…"
---

# 05 · Economic Calendar User Guide: Event Classification, Weekly Scheduling, and Event Trading

> Data is not a flood; it is a train on a schedule — **<mark>the economic calendar</mark> is that train's timetable**. Knowing which "event checkpoints" your instruments must pass this week makes **position sizing** and **stop-losses** targeted. This article covers the three-tier event classification, the 10-minute Sunday-evening scheduling method, the pre-event position checkup, and the trade-off between "ambushing before events vs following after them".

---

## 1. What Is an Economic Calendar

An economic calendar is the schedule of global **economic data, central bank decisions, earnings reports, auctions, and political events**. Common free/widely used sources:

| Tool | Traits |
|---|---|
| Investing.com | Broad coverage, free, marks market consensus expectations |
| Jin10 / FX678 | Chinese-language flashes, live event coverage with "actual vs forecast" comparisons |
| Bloomberg / Reuters | Institutional grade, most authoritative forecasts, paid |
| Trading Economics | Great data visualization and historical comparison |

::: info 📖 Of the Calendar's Three Columns, "Forecast" Is Key
Every calendar entry carries three columns — previous / forecast / actual. **The consensus forecast is key**, because markets price only the gap between "actual vs forecast" (see [Macro Data Reading](macro-data.md)).
:::

**Don't forget the calendar's "look-back" function**:

- Pulling the last 3-6 months of "actual vs forecast" lets you verify **the pricing pattern of the <mark>expectation gap</mark>** (e.g., which beats move the dollar most? which are desensitized indicators that "won't budge no matter how bad the print"?);
- Calendar history is free material for "event reviews": **log each NFP/CPI release's 30-minute post-release move alongside the expectation-gap value**; after 10+ entries you'll build your own "event reaction intuition table";
- <mark>Desensitization</mark>: when a data point repeatedly fails to move markets (e.g., prints keep matching forecasts), the market's attention has moved on — downgrade it in your classification table.

---

## 2. The Three-Tier Event Classification

Not every event is worth staying up for:

| Tier | Examples | Impact | Strategy |
|---|---|---|---|
| **Tier 1** | Fed rate decisions, NFP, CPI, FOMC dot plot | Whole market: stocks/bonds/FX/gold/oil all move together | Handle major positions in advance; go flat if necessary |
| **Tier 2** | PMI, retail sales, jobless claims, PCE inflation gauge, OPEC meetings, mega-cap earnings (Apple/Tesla) | Sector/asset-class level | Defend related positions; avoid heavy exposure into the event |
| **Tier 3** | Secondary data (durable goods orders, industrial output, consumer confidence) | Mostly noise, occasional small swings | Trade normally, nothing special |

**Classification principles**:

- Tier 1 = **large amplitude and breadth of movement** (most assets move simultaneously);
- Tier 2 = **affects specific sectors or assets** (e.g., EIA inventories for oil prices, mega-cap earnings for tech stocks);
- Tier 3 = even a big surprise is usually absorbed within hours, **not a trading event**.
- Go through the calendar weekly and flag in red first the **Tier 1 events plus Tier 2 events relevant to your holdings**.

---

## 3. The Weekly Scheduling Method

**10 minutes every Sunday evening**, as a fixed habit:

```text
① Open the economic calendar and review all Tier 1 events this week (Fed speeches count)
② Circle Tier 2 events relevant to your holdings (inventories for your instruments, sector leaders' earnings)
③ For each circled event write down: are you exposed? can you absorb event-day volatility?
④ Make contingency plans: reduce / hedge / go flat / hold normally
⑤ Record the week's rhythm in a table
```

**Weekly template**:

| Day | Event | Tier | Relation to holdings | Plan |
|---|---|---|---|---|
| Tuesday | US CPI | Tier 1 | Holding Nasdaq, gold | Cut 30% before Monday close, set stops |
| Wednesday | EIA crude inventories | Tier 2 | Holding crude | Hold normally, don't chase |
| Thursday | FOMC decision | Tier 1 | Fully exposed | Cut to half before the decision; wait for the presser to set direction |
| Friday | NFP | Tier 1 | Gold | Flat overnight; reassess Monday |

> Common knowledge: **the value of a plan is "not having to decide when the event happens"** — at event time both emotion and execution are at their worst. Writing down beforehand "if it rises/falls Y% within X minutes after release, then do Z" is far more reliable than improvising live.

::: tip The Real Value of a Plan
**The value of a plan is "not having to decide when the event happens".** At event time emotion and execution are at their worst; writing down beforehand "if it rises/falls Y% within X minutes after release, then do Z" is far more reliable than live judgment — a plan is the isolation layer between you and your emotions.
:::

---

## 4. The Pre-Event "Position Checkup"

Position self-check checklist before major (Tier 1) events:

```text
□ 1. Leverage: is leverage within the event window below normal levels? (suggest ≤ 1/2 usual)
□ 2. Stops: does every position have a stop-loss? Can the stop price survive a gap? (gaps jump past stop prices)
□ 3. Exposure: over-concentrated in one direction (all long/all short)?
□ 4. Liquidity: is liquidity sufficient for your instruments during the event window? (niche instruments gap harder)
□ 5. Mindset: "don't predict, prepare" — do your plans cover the against-consensus scenario?
```

**Core principle: "Don't predict, prepare"**:

::: tip The Core Principle of Event Trading
**"Don't predict, prepare."** Event trading is essentially managing uncertainty, not guessing direction — don't predict the NFP number; instead prepare two paths ("what if it beats / what if it misses") and move the decision ahead of the event.
:::

- Don't predict the NFP number; prepare two paths — "what if NFP beats / what if it misses";
- Event trading is essentially managing uncertainty, **not guessing direction**;
- In a "super week" of consecutive Tier 1 events, cut overall **<mark>leverage</mark>** by 50% — the volatility premium will compensate you, but only if you're still alive.

---

## 5. Release-Time Quick Reference

### US-China Time Zone Conversion (Beijing time)

| Data | US Eastern time | Beijing (DST, Mar–Nov) | Beijing (winter, Nov–Mar) |
|---|---|---|---|
| NFP, CPI, PPI, retail sales etc. | 08:30 | 20:30 | 21:30 |
| EIA crude inventories | Wednesday 10:30 | 22:30 | 23:30 |
| FOMC rate decision | 14:00 | 02:00 AM | 03:00 AM |
| Fed Chair press conference | 14:30 | 02:30 AM | 03:30 AM |
| US earnings (after hours) | After 16:00 | After 04:00 AM | After 05:00 AM |
| China official PMI | 09:30 | 09:30 (local time, no DST) | 09:30 |

> Notes:
> - US daylight saving time runs roughly from the second Sunday of March to the first Sunday of November (subject to the latest official arrangement each year).
> - China has no DST; Beijing time is constant. **Conversion rule: winter time is one hour later than DST**.
> - EIA inventories slip if they hit US holidays; NFP may move earlier/later around holidays — **defer to the latest calendar each week**.

### Major Central Bank Decision Times Quick Reference (Beijing time, winter time)

| Central bank | Meeting frequency | Decision time (winter time) | Minutes timing |
|---|---|---|---|
| Federal Reserve | 8 per year | 03:00 AM (quarterly meetings with dot plot are the focus) | 3 weeks after decision, 03:00 AM |
| ECB | About monthly (some regional governors' meetings) | 21:15; President's presser 21:45 | ~2 weeks after decision |
| BOJ | 8 per year | About 11:00-12:00 (around noon local time, released same day) | Weeks after decision |
| BOE | 8 per year | 20:00 | ~2 weeks after decision |
| PBOC (LPR) | 20th of each month | 09:00 (Beijing time) | No minutes; see operation announcements |

::: warning ⚠️ Central Bank Decisions Fall Late at Night Beijing Time
**Central bank decisions mostly land late at night or evening Beijing time**, so A-share/Asia-session investors often face gaps upon "waking up". Response: don't hold overnight + watch the first 15 minutes of morning trading before deciding — better value than pulling an all-nighter watching screens.
:::

---

## 6. Event Trading in Practice

### Ambush Before Events vs Follow After

| Dimension | Ambush before the event | Follow after the event |
|---|---|---|
| Approach | Build positions early in the expected direction | Enter with the trend after the release clarifies direction |
| Risk | If the expectation fails, you ride the full adverse move | First wave already gone; chasing highs eats the <mark>drawdown</mark> |
| Reward | Right call captures the whole swing | Higher certainty but reduced room |
| Suits | Veterans with clear expectation-gap judgments | Most ordinary traders |
| Numeric example | Bet on CPI missing forecasts, go long gold: if right, +2% within 30 minutes of release; if it beats, −2%+ against you | Confirm direction 30 minutes after release, then enter: miss the first wave but have clean stop levels |

**Practical rules**:

- Event trades **must carry stop-losses**, widened for "gap possibility" (the first candle after an event often jumps straight past the stop);
- **No orders in the first 15 minutes after release**: this window is rife with **<mark>slippage</mark>** and fake moves; wait for the first wave to finish before evaluating;
- Single event-trade position ≤ normal size; event trades naturally have lower win odds (triple uncertainty: direction + magnitude + timing).

### Advanced Checks for Event Trading

| Check | Content |
|---|---|
| **Liquidity** | Within 15 minutes after an event, **spreads** can widen 3-10x; **limit orders may not fill** |
| Second wave | Tier 1 events often have a "second wave" (press conference/European session relay); don't exhaust ammunition in wave one |
| Data linkage | One data point often triggers a chain (CPI shifts rate expectations → shifts attention to next week's PCE); **make position plans for chained events all at once** |
| Failure exit | Preset a rule like "exit everything if direction isn't clear X minutes after the event" to prevent overstaying |

---

## 7. Opportunities in the "Data Vacuum"

A **<mark>data vacuum</mark>** = a window with **no Tier 1 events in the next 3-5 days**:

| Trait | Meaning |
|---|---|
| Volatility recedes | Daily ranges narrow; trends more easily dominated by technicals |
| Low event risk | Trend positions can be held with confidence; stops less likely gapped through |
| Small-trend trading window | Sector rotation, individual names, FX ranges become the main line |

**Vacuum-period strategies**:

- Use methods from [Technical Analysis](../technical-analysis/) for trend-following and range trading;
- Suits holding overnight and medium-term positioning (low event risk);
- Caution: **beware institutions "positioning early" near the end of a vacuum** — 24-48 hours before a Tier 1 event, markets often churn in low-volume, directionless oscillation; cut positions to plan levels ahead of time.

---

## 8. Turning the Calendar into Part of Your System

The calendar isn't just "for reading"; it can be a trigger in your trading system:

| Strategy type | Calendar-based use |
|---|---|
| Event-driven strategy | Activate only in NFP/CPI/rate-decision windows; flat otherwise |
| Calendar **arbitrage**/volatility strategy | Hold straddles/strangles into events (volatility realizes afterward); selling volatility pre-event requires caution |
| Data-vacuum strategy | Run trend strategies only in windows without Tier 1 events |
| Earnings-season strategy | During earnings season, trade only instruments with clear expectation gaps (see [Earnings Call Reading](earnings-calls.md)) |

**Three layers of calendarization**:

1. **Know**: which events this week, what they affect;
2. **Plan**: position sizes and stops set before every event;
3. **Execute**: event windows map one-to-one to strategies — never itch to trade when you should be flat, never hesitate when you should activate.

::: tip 💡 Calendarization = Scheduled Trades, Planned Positions
Turning your "trading rhythm" itself into rules is the key step from retail investor "chasing headlines" to "following the calendar" — **calendarization = trades on a schedule, positions with plans**.
:::

---

## Risk Warning

::: warning ⚠️ Risk Warning
The forecast values (consensus) marked on economic calendars are statistical survey values and may deviate significantly from actual results; release times and indicator definitions may change anytime (holiday shifts, source revisions) — **always defer to the latest official arrangements**. Tier 1 releases can produce violent gaps, dried-up liquidity, and amplified slippage; a wrong-way pre-event ambush can cause losses far beyond expectation; a "data vacuum" is not risk-free — markets can still whipsaw on sudden news (geopolitics, company events). The time-conversion tables here are teaching approximations; **defer to the latest timezone arrangements and latest market conditions**. This article is not investment advice.
:::
