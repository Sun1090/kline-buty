---
title: "02 · Swing and Trend in Practice"
description: "Swing and trend trading in practice — from trend confirmation and entry/exit to position management and the most common ways to die."
---

# 02 · Swing and Trend in Practice

> Swing trading (Swing Trading): hold for days to weeks, **capture a 5%-30% move and move on**. It doesn't test your speed and cost control the way day trading does, nor your conviction the way long-term investing does — it tests your ability to **judge the market state**: is this a trending market? How far has the trend gone? Should you get on board or get out?
>
> This article follows the three steps "before entry → during the position → after exit": first confirm the trend three ways, then compare two entry methods, then solve "holding on" and "exiting well", and finally cover the most common ways trend traders die, plus how to tell "this is a range market — don't trade trends".

---

## 1. The Essence of Swing Trading

### 1.1 What swing trading gets paid for

| Timeframe | Holding period | Typical target | Main enemy |
|---|---|---|---|
| Intraday | Minutes to hours | 1%-3% | Fees, **<mark>slippage</mark>** |
| Swing | Days to weeks | **5%-30%** | Can't hold, chopped up by ranges |
| Long term | Months to years | 30%+ | Conviction, **liquidity** |

**The core mindset of swing trading: don't predict tops — eat the middle section.** You don't need to buy the exact low or sell the exact high — buy at the pullback/breakout point after trend confirmation, sell before the trend breaks, capture the middle 5%-30%, and over the long run that is a very good business.

### 1.2 Swing vs trend (two stances, one method)

- **Swing trading**: trade "segments" within a trend — enter after trend confirmation, bank a chunk of profit before the trend finishes, then re-enter on the pullback.
- **Trend trading**: stay in until the trend breaks; use a trailing **<mark>stop-loss</mark>** to let profits run, aiming to capture the whole big move.
- In execution both share this method set (trend confirmation, breakout/pullback entry, trailing stop); the difference is only the **scale of the exit trigger**: swings exit on small structures, trends exit on large structures.

---

## 2. Defining and Confirming a Trend (Two of Three Must Agree)

### 2.1 Dow theory: highs/lows structure

**Uptrend = higher highs + higher lows (HH + HL); downtrend = lower lows + lower highs (LL + LH).**

- Timeframes: daily chart confirms direction; 4-hour/1-hour charts find entries.
- **Confirmation rule**: if price breaks below the prior significant low (HL), treat the uptrend as broken; vice versa.
- Note: **a pullback can break minor structure lows but not the key prior low** — this is precisely the anchor of "stay in while the trend holds".

### 2.2 Moving average alignment

| State | MA pattern (daily) | Meaning |
|---|---|---|
| Bullish alignment | Short MAs above long MAs, all fanning upward | Uptrend |
| Bearish alignment | Long MAs above short MAs, all sloping down | Downtrend |
| Tangled/converged | MAs crossing repeatedly, flattening | **Range market — no trend trading allowed** |

- Common pairings: MA20 / MA60 (or EMA20 / EMA200).
- Supporting rule: price above MA20 with MA20 turning up → only long, never short; price below MA20 with MA60 flattening → caution.

### 2.3 ADX as a supporting check

- **ADX > 25 (common rule of thumb)**: trend strength is sufficient, suitable for trend methods (historical statistics; defer to actual conditions).
- **ADX < 20**: no trend — skip trends and run range strategies instead (see [03 · Range Markets and Grid Trading](range-grid-trading.md)).
- Direction comes from the DI+/DI− positions, **but ADX only tells you "how strong the trend is", not "it's about to reverse"** — a high ADX rolling over is not a reversal signal; it only means the trend is weakening.

> Confirmation discipline: **enter only when at least two methods corroborate each other.** Highs/lows structure pointing up + bullish MA alignment are required before considering a long; if only one holds, keep waiting.

---

## 3. Entry Methods: Breakout vs Pullback

### 3.1 Comparing the two entries

| Dimension | Breakout entry | Pullback entry |
|---|---|---|
| Logic | Enter with the trend after price breaks a key level (prior high/range/trendline) | Wait for price to retest the key level after breaking out (prior high becomes support), enter if it holds |
| **Win rate** (historical statistics) | Relatively low (many false breakouts, roughly 40%-50%) | Relatively high (support validated, roughly 55%-65%) |
| **Risk-reward** | High (stop close, target far) | Slightly lower (entry price worse, stop farther) |
| Biggest risk | Stopped out by false breakouts | The trend never looks back, the pullback never comes, you miss it entirely |
| Suited to | Those who can cut losses fast and chase odds | The patient who accept missing moves |

**The core trade-off: breakouts have a lower win rate but higher payoff, pullbacks a higher win rate but lower payoff — their long-run expectations can be similar.** Your selection criterion is which you hate more: "being stopped out by false breakouts" or "missing the move" — you will suffer one of them.

### 3.2 Breakout entry (example rules)

1. Daily highs/lows structure points up (HH+HL), moving averages bullishly aligned;
2. Price breaks the 4-hour prior high on volume (or the high of the last 20 four-hour candlesticks);
3. Stop-loss: below the breakout candlestick's low, or 1 ATR below the prior high;
4. Target: take half off where risk-reward ≥ 1.5:1, trail the rest with a trailing stop.

### 3.3 Pullback entry (example rules)

1. A valid breakout must come first (4-hour candlestick closes and holds above the prior high);
2. Wait for the retest of the prior high/breakout level/moving average (MA20) to hold, with a stabilizing candlestick (long lower wick, bullish engulfing, declining-volume stall);
3. Stop-loss: below the pullback low;
4. Target: same as breakout entry — take half at 1.5R first.

### 3.4 Five questions before entry (answer every trade)

1. Is the market trending or ranging? (MA alignment + ADX)
2. Have I confirmed the trend direction? (at least two methods)
3. Where exactly are entry, stop-loss, and target? (write them down before entering)
4. Is the risk-reward sufficient? (only trade at ≥ 1.5:1)
5. What fraction of capital does this trade risk? (≤ 1%-2%, see [07 · Trading Systems](../trading-system/risk-management.md))

---

## 4. Position Management: Three Tools for Holding On

### 4.1 Trailing stop

- **Rule**: the stop only moves up, never back down. Each new higher low (HL) moves the stop slightly below that low; when short, the stop trails each lower high downward.
- **Tool**: use ATR as an aid — stop distance = latest HL low − 0.5~1 × ATR, balancing noise against protection.
- **Discipline**: don't pick an arbitrary fixed percentage for the trailing stop; anchor it to structure levels so normal pullbacks don't shake you out.

### 4.2 Scaled take-profit

| Batch | Location | Action |
|---|---|---|
| First batch | 1.5R-2R (risk-reward reached) | Close 1/3-1/2, lock in profit, the urge to "get back to breakeven" disappears |
| Second batch | Target level / new high | Close another 1/3 |
| Remainder | Exit via trailing stop | Let profits run and catch the tail |

Benefit: you both realize the certainty profit of "capturing a segment" and keep the tailwind payoff of "stay in while the trend holds".

### 4.3 The discipline of staying in while the trend holds

- As long as **key structure (HL/LL or moving averages) is intact**, don't sell pullbacks and don't watch every tick — the more often you watch, the itchier your hands get.
- Mental framing: giveback is the cost of swinging. Falling from +15% floating profit to +8% is not "losing 7%" — it's "the move isn't finished and I'm still up 8%". **The judgment standard is structure, not the floating-profit number.**

---

## 5. Exits: Three Exit Signals

| Method | Trigger | Strength | Weakness |
|---|---|---|---|
| Structure-level exit | Price falls back under the prior high / breaks the latest HL | Respects the market, no top-guessing | Gives back part of the profit |
| Moving average exit | Close below MA20 / MA60 | Mechanical rule, easy to execute | Repeatedly shaken out in ranges |
| Time-based exit | Still unprofitable after a preset number of days (e.g. 10 trading days) | Prevents capital being tied up | May miss late-arriving moves |

- Exiting is a **systematic act**, not a "feels about right" emotional one. The exit reason must share the same origin as the entry reason: exit because the entry basis broke down, not because the profit number reached some size.
- After exiting a swing, if the trend still stands (structure intact), waiting for the next pullback to re-enter is allowed — **exiting is not going bearish; it just ends this swing**.

::: tip 💡 The exit reason and the entry reason must share the same origin
**The exit reason and the entry reason must share the same origin: exit because the entry basis broke down, not because the profit number got big enough.** Exiting is a systematic act, not a "feels about right" emotional one — treating exits as feelings hands position decisions to emotion, and emotion is the most expensive cost in swing trading.
:::

---

## 6. How to Pick Swing Instruments

| Criterion | Standard (historical statistics; defer to actual conditions) | Why |
|---|---|---|
| Moderate **volatility** | Daily amplitude 1%-3%, neither too large nor too small | Too large and the stop is unbearable; too small and there's no 5%+ to capture |
| Strong trendiness | Multiple clear one-sided moves historically | Trend methods need room to work |
| Good liquidity | Narrow **<mark>spread</mark>**, deep order book | Entries and exits don't move the price |
| Clear fundamental driver | An explicit logic (industry cycle, supply-demand, policy) | Fundamentally supported trends last longer |
| Daily timeframe | Don't swing-trade on the 5-minute chart | Too small a timeframe and it's just day trading |

- Test method: flip through the instrument's daily chart over the past 1-2 years and **count how many "complete trend segments" occurred**. If you can count 8-10 or more, it qualifies as a swing instrument; if it has chopped sideways forever, drop it.
- Examples of commonly qualifying instruments (concept illustration only): strongly trending commodity futures (iron ore, crude oil), large-cap major cryptos, swing structures in US equity indices. **Your actual picks should be based on your own research and historical behavior.**

---

## 7. How Trend Traders Die, and "Is This a Range Market?"

### 7.1 Three classic deaths

| Death | Script | Antidote |
|---|---|---|
| Repeatedly chopped in ranges | Chasing breakouts inside a sideways range, stopped out 6 times back and forth, patience destroyed | Judge the market state before entry (see 7.2); no trend trades in ranges |
| Chasing highs | Entering on a breakout after the move already ran 20%, buying the exact top | Only take "the first breakout/pullback after trend confirmation"; stay away from chasing after consecutive surges |
| Taking profit too early | Out entirely at +8%, the move runs another 40% | Scaled take-profits + trailing stops; let the tail fly |

### 7.2 How to tell whether it's a range market (three rulers)

| Ruler | Range-market trait | Notes |
|---|---|---|
| Tangled MAs | MA20 and MA60 cross repeatedly, nearly flat | Both bullish/bearish alignments fail |
| ADX | Below 20-25 | Insufficient trend strength |
| Bollinger squeeze | Band width visibly narrowing | Volatility compressing, brewing either a breakout or more sideways drift |

**Decision process: if two of the three rulers point to range → treat it as a range market by default** — pause all trend strategies, or only do light-position range scalping inside the bounds, waiting for ADX to turn up again and MAs to fan out again. Sideways drift before a breakout is not a reason to enter; **confirmation after the sideways phase ends is**.

> Common mistake: at range-to-trend transitions, the breakout is confirmed "after the fact". What you think is the end of consolidation and an incoming breakout is often just another stretch of consolidation. **Discipline: wait for a closing-price breakout confirmation + volume + rising ADX before talking about a trend.**

::: warning ⚠️ Confirmation after the range ends is what justifies entry
**Wait for a closing-price breakout confirmation + volume + rising ADX before talking about a trend.** What you think is the end of consolidation is often just another stretch of consolidation. If two of the three rulers point to range → treat it as a range market by default: pause all trend strategies, or only do light-position range scalping inside the bounds, waiting for ADX to turn up again and MAs to fan out.
:::

---

## 8. A Swing Trader's Routine (Action Checklist)

```text
(Review day) 30 minutes every Sunday evening:
   ① Flip through the daily charts of held instruments: state of structure, MAs, ADX?
   ② Update key levels: prior highs/lows, recent HL/LL, MA20/MA60 positions
   ③ Write next week's plan: which entry trigger to wait for? Where does the stop go? Where is the target?
(Trading days) 15 minutes per day:
   09:00 Check whether any holding hit its stop/trailing stop/scaled take-profit
   14:30 Check for entry signals (breakout/pullback); place orders only after passing the five questions
   2 minutes after the close: log position changes and which key levels price touched
(After exit) after every close:
   Log the exit reason and result; weekly aggregation of win rate/risk-reward/expectation
```

---

## 9. Style Choice: Swing vs Day vs Grid

Before acting, figure out which style fits you — **a style-personality mismatch is the biggest reason traders fail to execute their plan**:

| Dimension | Day | Swing | Grid |
|---|---|---|---|
| Time commitment | Watching all day | 15-30 minutes per day | Almost no watching once configured |
| Fee sensitivity | Extremely high (dozens of trades daily) | Low (one trade per few weeks) | Medium (high frequency but mechanical) |
| Judgment needed | Chart feel + execution | Market-state judgment | Range judgment (one-off) |
| Biggest enemy | Fees and impulsiveness | Can't hold / chopped by ranges | One-sided markets |
| Suited to | Full-timers, fast reactions, strong discipline | Office workers, the patient | No time to watch, can tolerate drawdowns |
| Beginner friendliness | Lowest | Medium | Medium (the trap is one-sided markets) |

**Advice: decide how much time you can commit first, then choose the style.** Someone with only 1 hour a day forcing day trading is handing position decisions to emotion; someone who can watch but can't hold may find a grid a better tool than manual range scalping.

::: tip 💡 A style-personality mismatch is the biggest reason execution fails
**Decide how much time you can commit first, then choose the style.** A style-personality mismatch is the biggest reason traders fail to execute — someone with only 1 hour a day forcing day trading is handing position decisions to emotion; someone who can watch but can't hold may find a grid a better tool than manual range scalping.
:::

---

## 10. Quick Reference: Common Swing Trading Fallacies

| Fallacy | Reality |
|---|---|
| Trend = up | Trends have direction (up/down); shorting a downtrend is equally valid — structure confirmation is what matters |
| Chase every breakout | Breakouts require volume + close confirmation; chasing highs is one of the three classic deaths |
| Closer stop is better | Stops too tight get taken out by normal pullbacks; distance should follow ATR/structure, tighter isn't safer |
| Floating-profit giveback = loss | While structure holds, giveback is a holding cost; only a broken structure says it's time to go |
| Switching timeframes mid-trade | Daily sets direction, 4-hour finds entry — don't let 5-minute noise scare you off the ride |
| Every trade must win | 3-5 straight losses is normal variance; judge win rate on at least 30 trades |
| One method rules everything | Trend methods work only in trending markets; switch to range strategies in ranges (see [03](range-grid-trading.md)) |
| Learning entries but not exits | Exits determine actual P&L; a strategy without exit rules is no strategy at all |

---

::: warning ⚠️ Risk Warning
Judging trend versus range is probabilistic, not certain — real breakouts can occur inside ranges, and trends can reverse abruptly. All win rates, risk-reward figures, and ADX thresholds here are **historical statistics, not predictions of the future; defer to actual market conditions**. Swing trades usually carry larger per-trade stops than intraday, so **<mark>position size</mark>** must be derived backwards from "stop-loss amount ≤ 1%-2% of total capital" — never sized on "this time it won't lose". For **<mark>leveraged</mark>** instruments, fully understand **<mark>margin</mark>** and **<mark>liquidation</mark>** mechanics first (see [03 · Futures](../futures/)).
:::
