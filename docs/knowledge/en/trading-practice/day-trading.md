---
title: "Day Trading in Practice"
description: "A day trading survival guide — run the numbers on fees and slippage, and master practical T+0 buy-low sell-high methods."
---

# Day Trading in Practice

> Day trading (Intraday Trading): **open and close positions within the same day**, holding no **position** overnight. T+0 venues include: domestic futures, crypto perpetuals and spot, US stocks, and intraday round-trips on an A-share existing holding (using a base position to sell high and buy low under the T+1 regime).
>
> Day trading is the style with the **lowest entry barrier and the highest attrition rate** — anyone with an account can do it, but the No. 1 reason 90% of day traders lose is not poor technique: they **never ran the numbers on fees and** <mark>slippage</mark>**.** This article runs the numbers first, then covers the methods.

---

## 1. The Survival Threshold: Settle the Fee and Slippage Math First

### 1.1 Where the costs come from

| Cost item | Description | Typical magnitude (historical common levels; defer to actual rates) |
|---|---|---|
| Commission | Charged once on entry, once on exit | Futures about 0.01%-0.05% per side; crypto maker often as low as 0.02% |
| Slippage | **<mark>Buy price</mark>** above the quote, **<mark>sell price</mark>** below the quote | 0.01%-0.1% per side; higher for instruments with poor **liquidity** |
| Market impact | Large orders push the price | The bigger the order, the costlier; usually negligible for retail |
| Cost of capital | Overnight interest / **<mark>funding rate</mark>** | Day trading holds no overnight position, so this ≈ 0 |

**Key insight: fees and slippage are charged on notional value, regardless of whether you profit.** Every 100,000-CNY trade you make pays out a fixed amount up front; how large this becomes over a year is calculated directly below.

### 1.2 Numerical walkthrough: 20 trades a day at 0.05% per side — how much capital does a year burn

Assume 100,000 CNY of capital, fully deployed per trade (100,000 CNY notional per trade), one complete round-trip (open + close) each time:

| Parameter | Value |
|---|---|
| One-way fee | 0.05% |
| Cost per round-trip (open + close) | 0.05% × 2 = **0.10%** |
| Trades per day | 20 round-trips |
| Daily cost (of notional) | 0.10% × 20 = **2.0%** |
| Trading days per year | 250 |
| Annual cost (of notional) | 2.0% × 250 = **500%** |
| Applied to 100,000 CNY capital | **500,000 CNY per year** |

::: danger 💀 The hidden killer of day trading: fees
**At 20 trades a day and 0.05% per side, annual fees equal 5 times your capital.** You would need to average 2% gross notional profit per day for 250 days a year just to break even — this is not a "try a bit harder" situation; it is mathematically almost impossible to do consistently.
:::

Now the sensitivity across parameter combinations:

| Trades per day | Total cost per side (fees + slippage) | Annual cost (of notional) | Equivalent to (on 100,000 CNY capital) |
|---|---|---|---|
| 5 | 0.10% | 250% | 250,000 CNY |
| 10 | 0.05% | 250% | 250,000 CNY |
| 20 | 0.05% | 500% | 500,000 CNY |
| 20 | 0.025% (institutional tier) | 250% | 250,000 CNY |
| 50 (scalping) | 0.05% | 1250% | 1,250,000 CNY |

> The above is a walkthrough at historically common fee levels and **does not represent the current rates of any specific broker/exchange** — defer to actual rates. But the order-of-magnitude conclusion stands: **the more frequently you trade, the deadlier the costs.**

### 1.3 Three iron rules for day trading survival

1. **Choose a low-fee venue.** Check before trading: for futures pick a discounted commission tier; for crypto place limit orders as maker (often less than half the taker fee); for US stocks note zero-commission brokers but watch payment for order flow and the **<mark>spread</mark>**.
2. **Write costs into your trading rules.** Target a **risk-reward** of at least 1.5:1 per trade, net of round-trip costs — a trade with 0.3% expected gross profit has only 0.2% left after 0.1% costs, not worth taking.
3. **Control frequency.** Day trading does not reward trading "a lot"; it rewards trading "well". Three to five high-quality trades a day beat 20 frantic high-frequency shots over the long run.

::: warning ⚠️ Day trading rewards doing it right, not doing it often
**Day trading does not reward "doing more"; it rewards "doing it right".** Three to five high-quality trades a day beat 20 frantic high-frequency shots over the long run. Target a risk-reward of at least 1.5:1 per trade, net of round-trip costs — a trade with 0.3% expected gross profit has only 0.2% left after 0.1% costs, not worth taking.
:::

---

## 2. Instrument Traits That Suit Day Trading

Not every instrument suits day trading. **Survival conditions: enough volatility (meat to eat), enough liquidity (affordable to trade), enough trading hours (you can watch it).**

| Trait | Why it matters | Passing bar (historical statistics; defer to actual conditions) |
|---|---|---|
| Volatility | Intraday moves must cover costs | Daily range ≥ 2 round-trip costs, i.e. ≥ 0.4% to start; trending instruments often reach 1%-3% |
| Liquidity | Low slippage, easy in and out | Deep order book, narrow bid-ask **spread**, instant fills |
| Trading hours | The hours you can actually watch | Your waking hours must cover the instrument's main active session |
| Volatility rhythm | Has "active windows" to focus on | Clear high-volume windows (e.g. the first hour after the open, the Europe/US overlap) |
| Familiarity | Do not trade what you do not know | Only trade 1-2 instruments whose history you have studied |

### Quick reference: day trading traits by market

| Market | Active hours (Beijing time, historical pattern) | Day trading traits |
|---|---|---|
| Domestic futures | 09:00-15:00 + night session 21:00-02:30 | Heavy volatility at open/close, price limits and fee discounts (different rates for closing today's positions) |
| Crypto | 24 hours | Europe/US hours (20:00-02:00 next day) are volatile; pre-dawn liquidity is poor with high slippage |
| US stocks | 21:30-04:00 | Big moves in the first 30 minutes and near the close; frequent gaps during earnings season |
| A-shares | 09:30-11:30 / 13:00-15:00 | T+1 restriction — only round-trips on a base holding or holding logic; ±10% price limits |

---

## 3. Patterns of the First 30 Minutes (A-Shares / Futures as Examples)

### 3.1 Statistical traits (historical statistics, not predictive; defer to actual conditions)

| Phenomenon | Historical statistical trait | Common cause |
|---|---|---|
| Gap up, then fade | Stocks/instruments gapping up over 1% have a high probability of pulling back within the first 30 minutes | Overnight bullish news front-run and cashed in, concentrated selling |
| Gap down, then rally | Gaps down over 1% but surges on volume after the open | Panic selling absorbed by institutions, short covering |
| Gap up and hold | Holds above the open gap within 15 minutes with expanding volume | Genuine strength, often the day's trend direction |
| Flat open, narrow range | Low-volume sideways drift in the first 30 minutes | Direction undecided; entries here have a **win rate** near random |

> Note: these are **probabilistic tendencies**, not ironclad rules. "Gap up, then fade" is merely "more likely", not grounds for a heavy counter-position. Use it as a reason to be cautious during the opening phase, not as a signal to short the open.

### 3.2 How to avoid chasing the open chaotically

The first 30 minutes are where retail traders bleed most. Three rules:

1. **No orders in the first 5 minutes.** The first momentum spike/dive after the auction is often unsustainable — wait for the first 5-minute candle to set.
2. **Do not chase instant pulses over 2%.** A vertical 2%+ spike at the open is either real (it will pull back and give you a chance) or a bull trap (chase in and you are the bagholder). Wait for a pullback that holds the session VWAP.
3. **Only chase gap-up-and-hold; never bottom-fish gap-up-and-fade.** The precondition for buying "gap down, then rally" is seeing volume-backed absorption (price stabilizing on the intraday chart with rising volume), not merely seeing a lower open.

---

## 4. Common Day Trading Methods (Pick One, Master It)

### 4.1 Prior high/low breakout

- **Logic**: price breaks the high/low of the last 20-30 five-minute candles, taken as trend continuation.
- **Entry**: enter on a break of the prior high (or prior low); confirm with volume (volume breakouts have a higher win rate, per historical statistics).
- **<mark>Stop-loss</mark>**: 1.5 × ATR on the other side of the breakout point (or beyond the breakout candle's high/low).
- **Best for**: instruments with clear highs/lows; all false breakouts in range markets — do not use.

### 4.2 Opening Range Breakout (ORB)

- **Logic**: the first 15-30 minutes form the "opening range" (high − low); a break of the range boundary is taken as the day's direction.
- **Steps**:
  1. No trading for the first 30 minutes; only mark the range high H and low L;
  2. Volume-backed break above H → go long; break below L → go short (historical statistics: ORB breakouts win more on trend days than range days, but on most days the range is never broken);
  3. Stop-loss on the other side of the range (H-to-L is usually wide enough; size the position accordingly);
  4. Flat before the close (e.g. the last 30 minutes) if the target is not reached — no overnight holds in day trading.
- **Caution**: if the range is too narrow (< 1 ATR), most breakouts are noise — wait for a wider range or skip the day.

### 4.3 Mean reversion to the moving average

- **Logic**: after price spikes/dives far from the moving average (e.g. beyond 2 standard deviations from the 20 MA on the 5-minute chart), it reverts to the mean.
- **Entry**: enter counter-trend when a stalling candle prints after a fast deviation (long upper wick, bearish engulfing).
- **Stop-loss**: a fixed distance beyond the deviation extreme (e.g. 0.5% or 1 ATR).
- **Best for**: narrow ranges and brief overbought/oversold stretches mid-trend; **forbidden in strong one-sided trends** (strength can keep deviating).

### 4.4 Reversal at key intraday levels

- **Logic**: reverse when an intraday key level fails (prior settlement, prior day's high/low, round numbers, session VWAP).
- **Typical setups**: price breaks the prior day's low, bounces weakly, then breaks it again → short with the trend; price hits a round number and is caught on heavy volume → go long.
- **Stop-loss**: the failed-reversal point (a short distance on the other side of the key level).
- **Discipline**: reversing requires a **structural break** (a clear key level broken with volume confirmation), not "it feels like it has fallen enough".

---

## 5. Intraday Stop-Loss Discipline (The Lifeline of Day Trading)

An intraday stop-loss is not "part of the strategy" — it is **the precondition for still having money to trade tomorrow**. Four hard rules:

| Rule | Suggested value (adjust to your risk tolerance) | Notes |
|---|---|---|
| Per-trade loss cap | ≤ 0.5%-1% of total capital | Stricter than swing: fast decisions, less room for error |
| Daily loss cap | ≤ 2%-3% of total capital | When triggered, **shut down for the day**; no revenge trading |
| Trade count cap | 3-5 per day (except high-frequency) | Stop at the cap, win or lose |
| Time stop | No profit after 2 hours → exit | Do not drag intraday trades into overnight holds, and do not let dead money occupy the position |

**The time stop is a weapon unique to day trading:** if the direction is right, the market rewards you quickly; if you are still grinding near breakeven after 2 hours, your call is probably wrong — get out and watch first.

::: danger 💀 Per-trade loss ≤ 0.5%-1%, daily loss ≤ 2%-3%, shut down when triggered
**Per-trade loss ≤ 0.5%-1% of total capital, daily loss ≤ 2%-3% of total capital — when triggered, shut down for the day; no revenge trading.** Day trading decisions are fast and room for error is small. Any averaging-down add that exceeds the daily loss cap upgrades an "intraday loss" into an "overnight **<mark>liquidation</mark>**".
:::

---

## 6. The Day Trading Review Template (10 Minutes After the Close)

The purpose of the review template: **record for every trade "why in, why out, how much won or lost, and what emotion at the time"**. All four columns are indispensable; the emotion column is the most often skipped and the most important.

```markdown
## Daily Review (Date: ____)

| Time | Instrument/Direction | Why in (trigger) | Why out (rule/emotion) | Entry | Exit | P&L | Emotion (fear/greed/calm) | Rule violated? |
|---|---|---|---|---|---|---|---|---|
| 09:45 | Rebar/Long | Prior-high breakout + volume | No profit in 2 hours, time stop | 4100 | 4085 | -15 pts | Anxious | No |
| 13:30 | BTC/Short | Broke opening range | Stop hit at range top | 66500 | 66700 | -200 | Reluctant | No |
| 14:10 | Apple/Long | MA reversion + long lower wick | Target 1.5R hit | 9.20 | 9.32 | +1.2% | Calm | No |
```

Then aggregate once a week:

- This week's trade count, win rate, average P&L, **total P&L vs total fees** (costs must be listed separately);
- How many rule-violating trades? What emotions accompanied them?
- Which methods made money and which lost → cut the losing methods, even if they only lost twice.

> Sample-size reminder: **statistics on fewer than 30 trades are meaningless.** Do not kill a method based on 5 trades, and do not size up based on 5 winners.

---

## 7. Common Ways Day Traders Die

| Way to die | Typical script | Antidote |
|---|---|---|
| Death by costs | 20 high-frequency trades a day, 5× capital in annual fees | Run the numbers first (see Part 1), cut frequency and fees |
| Chasing the open | Chasing a 2% spike at the open, buying the top | No orders in the first 5 minutes; wait for the pullback |
| Averaging down | Adding to losers to lower the average, digging deeper | Exit the moment the per-trade stop triggers; **averaging down is forbidden intraday** |
| Counter-trend bottom-fishing | "It has fallen enough" after a 3% drop | Only structural signals (key level + volume), never feelings |
| Small wins, big losses | Take +0.2% quickly, hold losers to -2% | Enter only at risk-reward ≥ 1.5:1; cap losses with stops |
| Dragged into overnight | Should have closed but held overnight | Time stop + forced flat before the close |
| Revenge mindset | Doubling size after a -3% day to win it back | Daily loss cap triggers → shut down |
| Emotional serial trading | Random firing after 3 straight losses | After 3 straight losses, force a 30-minute break; consider stopping for the day |
| Ignoring trading hours | Trading illiquid instruments at dawn, slippage eats the profit | Trade only your instrument's active hours |
| No review | Trading on feel daily, never knowing what went wrong | 10 minutes after the close, log per the Part 6 template |

---

## 8. A Day Trader's Daily Routine (Action Checklist)

```text
08:50  Review overnight overseas markets and news; mark today's key levels (prior settlement/prior day's high/low/round numbers)
09:00  Open: no orders for the first 5 minutes; mark the opening range (ORB prep)
09:30  Trade only the top-priority method (e.g. ORB breakout / prior high-low); before every entry, run the four questions:
       Basis for direction? Stop level? Risk-reward ≥ 1.5? Size ≤ 1% risk? — if unanswered, skip
11:30  Morning close: quickly log morning positions and mindset
13:00  Afternoon session: same routine; fewer new entries late in the day (insufficient time-stop room near the close)
15:00  Close: forcibly flatten all intraday positions (except A-share base-position round-trips)
15:10  Review per the Part 6 template and write the journal
```

---

::: warning ⚠️ Risk Warning
Day trading has the highest fee and slippage drag and the strictest execution-discipline requirements of any style. All statistical traits above (opening patterns, breakout win rates, fee levels) are **historical statistics, not predictive; defer to actual market conditions and each platform's real-time rules**. If you remain net-negative after costs for several consecutive weeks, stop live trading and return to a demo account to rebuild. Participate only with money you can afford to lose, and never use **<mark>leverage</mark>** to amplify intraday losses.
:::
