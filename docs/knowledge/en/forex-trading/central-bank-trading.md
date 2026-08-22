---
title: "06 · Central Bank Policy and Event Trading"
description: "Forex is at heart the relative strength of two currencies, and interest rates are the primary driver of exchange rates — so 'what central banks do' decides the medium-term direction more than any technical indicator. Every Fed rate decision, every BOJ verbal intervention, every digit of the NFP report…"
---

# 06 · Central Bank Policy and Event Trading

> Forex is at heart **the relative strength of two currencies**, and interest rates are the primary driver of exchange rates — so "what central banks do" shapes the medium-term direction more than any technical indicator. Every Fed rate decision, every BOJ verbal intervention, every digit in an NFP report can move EUR/USD dozens of pips within a minute.
>
> This chapter builds the complete event-trading framework: how to read rate decisions and forward guidance, what's hidden in the dot plot, how to trade data events like NFP/CPI, and the historical script of central bank intervention (using the yen as the case study) — ending with **risk control and a calendar workflow for event trading**. **Remember the core principle: event trading earns from the gap versus expectations, not from the data itself.**

::: danger 💀 Iron Rule: Event Trading Earns from "Surprises", Not from "the Data Itself"
**Event trading earns from the gap versus expectations, not from the data itself.** If the Fed cuts 25bp when markets priced 50bp, the dollar strengthens instead — because the expectation wasn't met. So the core skill isn't "predicting the data" but "knowing in advance what the market expects" — that expectation comes from the "forecast" column of an economic calendar, and checking forecasts before the event is step one.
:::

---

## 1. Why Events Move Exchange Rates

The simplified pricing chain for exchange rates:

```text
Rate expectations → Rate differential → Capital flows → Exchange rate
```

- Markets don't trade the **current rate**; they trade the **expected future rate**. A 25bp Fed cut against a 50bp expectation strengthens the dollar — because the expectation wasn't met.
- Events move prices because of the **surprise**: the gap between the actual figure and consensus. Whether the data is good or bad matters less than **how far it deviates from expectations**.
- The core skill: **know in advance "what the market expects"**. That expectation comes from the calendar's forecast column (medians of Reuters/Bloomberg surveys); browsing forecasts before an event is the first action of event trading.

---

## 2. Rate Decisions and Forward Guidance

### Decision-Day "Triple Hit"

Take the Fed's FOMC as an example: on decision days (8 per year), price action usually comes in three phases:

| Time (Beijing time) | Phase | Market Behavior |
|---|---|---|
| 02:00 (02:00 EDT / 03:00 EST) | Rate decision + statement | First violent swing; direction depends on statement wording |
| 02:30 | Chair's press conference | Second wave; markets parse every sentence for "hawkish/dovish" tone |
| 30–60 min after decision | Expectation convergence | Direction becomes clearer; chase risk rises |

### Statement-Wording "Translation Table"

Wording changes in central bank statements are extremely subtle, and markets compare word by word. Common phrases and their meaning:

| Wording | Meaning | FX Impact |
|---|---|---|
| "Patient" | No hike/cut in the near term | Neutral-dovish |
| "Data-dependent" | Will decide based on data; no commitment | Neutral |
| "Attentive to upside inflation risks" | Hints at possible hikes | Hawkish → currency strengthens |
| "Inflation pressures have eased" | Paving the way for cuts | Dovish → currency weakens |
| "Committee views the policy stance as appropriate" | Status quo | Neutral |

> Key technique: **compare wording changes against the previous statement**, not in isolation. Markets have long priced "no change"; real movement comes from the **differences**.

### Forward Guidance

- Central banks use forward guidance to manage expectations: explicitly saying "no hikes for some time" removes hike expectations from pricing and weakens the currency.
- Trading point: **once guidance is given, short-term rate expectations are "anchored"** — trading against it demands extreme caution. Fighting central bank guidance is one of the most common sources of losses in event trading.

---

## 3. The Dot Plot: The Fed's "Expectation Map"

The dot plot is an anonymous collection of FOMC participants' projections for **future rates**, released quarterly with the decision — one of the biggest variables on FOMC day.

### How to Read It

1. **Look at the median**: the median = the "official expected rate path" behind market pricing. Median moves up (more officials expect higher rates) → hawkish.
2. **Look at the distribution**: the wider the spread of dots, the deeper the internal disagreement, the more uncertain the path — volatility rises.
3. **Look at the gap versus market pricing**: dot plot projections vs expectations implied by fed funds futures. A large gap → post-event convergence toward the dots.

### Classic Dot-Plot Scripts

- **Dots more hawkish than expected** (median up): dollar spikes; non-USD currencies, gold, and US equities come under pressure.
- **Dots more dovish than expected**: dollar drops sharply.
- **Dots in line with expectations**: price action fades quickly and the statement/press conference become secondary — **don't chase; wait for convergence**.

---

## 4. Data Events: The Surprise Logic of NFP/CPI/PMI

### US Nonfarm Payrolls (first Friday monthly, 20:30 Beijing / 8:30 ET)

| Component | What to Watch |
|---|---|
| **Headline NFP** | The core number; only a miss/beat of 50k+ vs expectations triggers big moves |
| **Unemployment rate** | Beware divergence (e.g., strong payrolls but rising unemployment) |
| **Average hourly earnings** | Inflation signal: hotter wages → hike expectations rise → dollar strengthens |
| **Prior revisions** | A big downward revision is more "dovish" than an in-line print |

**Two paths for trading NFP**:

- **Path A (aggressive)**: place two-sided breakout orders before release (20–30 pips each side) and let the market choose direction — cheap but easily stopped out first.
- **Path B (steady, recommended for beginners)**: wait 15–30 minutes after release, **let the first impulse end and price retest key levels before entering**. The first NFP wave is often a "false breakout + retest" structure.

::: warning ⚠️ Counterintuitive: The First NFP Wave Is Often a "False Breakout + Retest"
**The first NFP wave is often a "false breakout + retest" structure.** That's why Path B (steady) for beginners: wait 15–30 minutes after release, let the first impulse finish, enter on the retest of a key level — don't chase the first wave, because it frequently reverses. The pattern in event moves: the first wave is emotion; the second wave is direction.
:::

### CPI and Inflation Data

- CPI is the second-biggest data point after NFP, shaping expectations for the Fed's path. **Core CPI (ex food & energy) matters more than headline**.
- Numeric example: CPI expected at 3.0% YoY, actual 3.3%. A 0.3pp surprise is enough to reprice the hiking path — a 50–100 pip daily move in EUR/USD is not unusual.
- Trading point: **before CPI, markets often "front-run" the number**, pricing it 1–2 days early. If the actual print matches the pre-positioned direction, expect a "buy-the-rumor-sell-the-news" reversal.

### PMI and Second-Tier Data

- PMI (manufacturing/services) is the earliest monthly forward-looking indicator; only surprises beyond ~3 points carry tradable value.
- Second-tier data (jobless claims, retail sales, consumer confidence) is mostly **noise**: unless it deviates wildly (±2 standard deviations), it's not worth betting on.

---

## 5. Central Bank Intervention: The Yen Playbook

Intervention is the most "violent" form of event trading — the central bank directly buys or sells its currency, creating impulse moves.

### Historical Patterns of BOJ Intervention

| Time | Direction | Context | Result |
|---|---|---|---|
| September 2022 | Bought yen (sold dollars) | USD/JPY approaching 146 | Hundreds of pips down in a day, then new highs followed |
| October 2022 | Bought yen again | USD/JPY broke 150 | Sharp drop from 151.9 toward 144 |
| April–July 2024 | Repeated verbal + actual intervention | Approaching 160 | Each time a sharp 300–500 pip drop, then rebound |

**Patterns**:

1. **Intervention usually happens near key round numbers** (145, 150, 155, 160) — round numbers are both psychological levels and the "trigger" for intervention.
2. **Intervention creates impulses, not trends**: unless fundamentals (the rate differential) turn with it, price tends to **drop sharply, then rebound back near pre-intervention levels**.
3. **Verbal intervention precedes actual intervention**: frequent official talk of "closely monitoring the exchange rate" foreshadows action — reduce exposure early.

### Strategies for Trading Intervention

- **Don't chase the first wave**: the intervention impulse completes most of its move within 10–30 minutes; chasing risks buying the start of the rebound.
- **Trade the "reversion" after the impulse**: if the differential hasn't turned, a post-intervention plunge (e.g., USD/JPY from 160 to 155) can be a counter-trend long opportunity — but keep the **position size small**, since repeated interventions are possible.
- **Stops must sit beyond where intervention gets "nastier"**: during repeated interventions impulses stack, and stops placed too close get swept repeatedly.

---

## 6. Risk Control for Event Trading

Event-day volatility is 3–10× normal; risk control overrides everything:

### 1. Before the Event

- [ ] Check the economic calendar and confirm exact times of this week's "three-star" events (rate decisions, NFP, CPI)
- [ ] Note market forecasts (the calendar's forecast column)
- [ ] 30 minutes before the event, **reduce or close positions** — **<mark>spreads</mark>** and **<mark>slippage</mark>** can widen 5–10× at the moment of release
- [ ] Check whether stops could be gapped/skipped through (event moves often trade right past stop levels)

### 2. Position Discipline After the Event

| Situation | Action |
|---|---|
| Right direction with large floating profit | Trail the stop to protect profit; don't get greedy for the last leg |
| Wrong direction | **Stop out immediately** — never hold through an event move. Holding and hoping hurts normally; on event day it means a blow-up |
| Direction unclear | Stand aside; post-event convergence is better traded after confirmation |

### 3. The Event-Trading "Three Don'ts"

- **No heavy pre-data directional bets**: win rate looks like 50%, but spreads + slippage + emotional stops make expectancy negative.
- **No chasing within 5 minutes of a decision**: the first impulse frequently reverses.
- **No trades against forward guidance**: fighting the central bank means fighting global capital flows.

::: danger 💀 Iron Rule: Fighting the Central Bank Means Fighting Global Capital Flows
**Fighting the central bank means fighting global capital flows.** Central banks manage expectations with forward guidance; once given, short-term rate expectations are "anchored" — trade against them with extreme care. The three don'ts: no heavy pre-data bets, no chasing within 5 minutes of decisions, no trades opposing forward guidance. Fighting the central bank is among the most common sources of losses in event trading.
:::

---

## 7. Economic Calendar Workflow

A sustainable event-trading workflow:

```text
Every Sunday evening, 30 minutes:
  ① Pull up this week's economic calendar; mark events rated 3 stars or more
  ② Record "market forecasts" for each major event
  ③ Check whether your open positions are exposed during any event window

On event day:
  ④ 30 minutes before: cut/close positions; confirm stop placement
  ⑤ On release: wait 15–30 minutes for the first impulse to converge
  ⑥ Enter only when three conditions align: surprise + key level + higher-timeframe direction
  ⑦ Set stop immediately upon entry (1.5×ATR or outside the key level)

Post-event review:
  ⑧ Log: forecast / actual / your decision / outcome / emotional state
```

### Popular Economic Calendars (teaching references; verify yourself)

| Source | Characteristics |
|---|---|
| **Forex Factory** | The most widely used calendar among global forex traders; impact grading (red/orange/yellow) |
| **Investing.com** | Comprehensive data, clear forecasts, multi-market coverage |
| **Jin10 / Investing China** | Chinese-language interfaces with full event grading and forecasts |

---

::: warning ⚠️ Risk Warning
- Event trading is a **high-volatility, high-slippage, high-emotion** environment; beginners should go through at least 3–5 full event days on a demo account before trading live.
- Central bank policy paths, interventions, and data forecasts all change — **every historical pattern here is a probability, never a certainty**. The 2022 yen interventions ("drop then rebound") won't necessarily repeat next time.
- Calendar forecasts are merely consensus; **actual figures can deviate sharply**. When wrong on direction, stopping out is discipline #1.
- All times, levels, and historical cases in this chapter are teaching references — **defer to the latest markets, calendars, and central bank policies**.
:::
