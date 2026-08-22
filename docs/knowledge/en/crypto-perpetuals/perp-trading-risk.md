---
title: "Perpetual Trading in Practice & Risk Control"
description: "Practical risk control for crypto perpetuals — how to choose leverage, position sizing, take-profit and stop-loss placement, spotting liquidation walls, and how to exit after consecutive blow-ups"
---

# Perpetual Trading in Practice & Risk Control

> [01-Perpetual Swaps](perpetuals.md) explained "what the contract is"; this article explains "how to survive":
> how to pick **<mark>leverage</mark>**, how big a position to open, where to put the **<mark>stop-loss</mark>**, where the liquidation walls are, and how to exit after consecutive **<mark>liquidations</mark>**.
> Everything here is practical: every conclusion comes with a worked number, a checklist, or a template. All leverage tiers, rates, and liquidation data follow the latest rules of exchanges and data platforms.

> ⚠️ **Risk Warning: nothing in this article is trading advice.**
> The first step of perpetual trading is not "finding a way to make money" but "admitting there are ten thousand ways to lose it": fighting the trend, oversized positions, bag-holding, careless stops, wicks, funding, ADL...
> The checklists and templates below can only reduce mistakes, not eliminate risk. **If you have already blown up 3+ times in a row, finish Section 7 before placing the next order.**

---

## 1. Preparation: How to Choose Leverage

### 1.1 Leverage Is Not a "Multiple", It Is a "Distance to Liquidation"

**<mark>Leverage</mark>** basics (10x leverage dies on a 10% move) are covered in [Core Trading Concepts](../getting-started/core-concepts.md). Recapping the conclusion of [01-Perpetual Swaps](perpetuals.md): **an adverse move of roughly 1/leverage brings you to the edge of liquidation** (after maintenance **<mark>margin</mark>**, fees, and funding, the actual **<mark>forced liquidation</mark>** triggers earlier).

Leverage × adverse move = the fraction of margin lost:

| Adverse move | 2x | 5x | 10x | 20x | 50x |
|---|---|---|---|---|---|
| 2% against | −4% | −10% | −20% | −40% | Liquidation |
| 5% against | −10% | −25% | −50% | Liquidation | Liquidation |
| 10% against | −20% | −50% | Liquidation | Liquidation | Liquidation |

> The "Liquidation" cells are rough 1/leverage estimates; actual forced liquidation triggers earlier due to maintenance margin, fees, and funding (defer to the estimated liquidation price shown on the exchange).

Three conclusions:

1. **2x–5x is the "survivable" zone**: there is still room to maneuver through ±10% BTC days, and the odds of riding out wicks are highest;
2. **10x is the per-trade ceiling for most veterans**: liquidation at a 10% adverse move means stop-loss room of 3%~5% with about a full cushion left;
3. **20x and above only suits "very tight stop + very small size" quick trades**: widen the stop a little and the position gets liquidated before the stop triggers — at that point the stop is decoration.

### 1.2 Why "Low Leverage + Big Position" Loses More Easily Than "High Leverage + Small Position"

Intuitively "low leverage = low risk", but that is only half true. **Risk depends not on the leverage number but on the notional position (leverage × margin) relative to the account, and on whether the stop distance matches market volatility.**

Worked example: account 10,000 U, per-trade risk budget 2% (200 U).

| Plan | Leverage | Margin | Notional | Stop distance | Stop loss | Problem |
|---|---|---|---|---|---|---|
| A: low leverage, big position | 5x | 5,000 U | 25,000 U | 0.8% | 200 U | A 0.8% stop is guaranteed to be swept by BTC's daily range |
| A': wider stop | 5x | 5,000 U | 25,000 U | 2% | 500 U | One trade loses 5%, 2.5x over budget |
| B: high leverage, small position | 10x | 500 U | 5,000 U | 4% | 200 U | Stop ≈ BTC's daily range; liquidation price ~9%, reasonable |

- Plan A can only cap risk by squeezing the stop to 0.8% — **a tight stop = high sweep rate**; three sweeps in a day is −6% on the account;
- Plan B's notional is only half the account, so the stop can sit at 4% with the liquidation price (~9%) still far beyond it — the sweep probability is actually lower;
- Add **<mark>slippage</mark>**: Plan A's stop order is 25,000 U notional, so 1% slippage in a wick costs an extra 250 U; Plan B's stop order is only 5,000 U, far less hurt by the same wick.

> Conclusion: **"low leverage" is not a get-out-of-jail card — "low leverage + betting the whole capacity it frees up" is the most common way to die.**
> Risk control only ever looks at two things: notional position / account equity, and whether the stop distance matches volatility. Get those right and the leverage number itself is irrelevant.

---

## 2. Position Management in Practice

### 2.1 Applying the 1%~2% Per-Trade Risk Rule to Perpetuals

The stock/futures rule "per-trade loss ≤ 1%~2% of the account" ports directly to perpetuals, with a single formula:

```text
Position (notional) = Per-trade risk amount ÷ Stop distance
Required margin = Notional position ÷ Leverage
```

**Worked example: account 1,000 U, stop 5%, leverage 10x**

| Item | Calculation | Result |
|---|---|---|
| Per-trade risk (1%) | 1,000 × 1% | 10 U |
| Notional position | 10 ÷ 5% | 200 U |
| Required margin | 200 ÷ 10 | 20 U (2% of account) |
| Liquidation distance | ~10% theoretical at 10x, ~9% after maintenance margin | Stop 5% sits inside it, with about a full cushion |

If the same account opens 1,000 U notional (margin 100 U, 10% of the account): a 5% stop loses 50 U = 5% of the account. Four consecutive stops take the account from 1,000 U to 814 U — **an 18.6% drawdown: the compounding damage of "lose a little each time, die in aggregate"**.

Two practical corollaries:

1. **Position size is a function of stop distance, not of "feeling"**: the tighter the stop, the bigger the allowed position, but tight stops get swept more; the wider the stop, the smaller the position must be. When the two conflict, protect the stop room first;
2. **Most people's sizing problem is really a "stop too tight" problem**: rather than shrinking the stop to accommodate a big position, shrink the position to accommodate a sane stop.

### 2.2 Choosing Cross vs Isolated in Practice

[01-Perpetual Swaps](perpetuals.md) covered the mechanics: isolated uses only the position's own margin and liquidation loses only that position; cross uses the full balance, pushing the liquidation price farther but risking the whole account.

| Scenario | Recommended mode | Why |
|---|---|---|
| Beginner / funds < 10k U / strict per-trade risk control | **Isolated** | The blast is contained in one position and cannot drag down the account |
| Large idle USDT balance acting as buffer | Cross | The balance automatically props up the liquidation price — free risk buffer |
| Hedged long/short (spot + contract, or two-way contracts) | Cross | Profits on one side replenish margin on the other, avoiding one-sided liquidation — but wrong direction kills both |
| Multiple same-direction high-leverage positions at once | **Isolated** | In cross mode, one blow-up can detonate the other profitable positions |
| Opening new positions while in drawdown | **Isolated** | Cross drags the new position into the old one's pit |
| Borrowed money | **Neither allowed** | Fix the source of funds before talking about trading |

> Practical advice: even in cross mode, size each trade's risk with an "isolated mindset". Cross is a tool to "push the liquidation price farther", not an excuse to bag-hold — **bag-holders die in either mode; cross just makes the death more thorough.**

---

## 3. Take-Profit and Stop-Loss in Practice

### 3.1 How to Set the Stop: Three Methods

| Method | Rule | Strength | Weakness | Suits |
|---|---|---|---|---|
| ATR stop | Entry ∓ 1.5~2 × ATR(14) | Adapts to volatility; bigger swings = wider stop | Distance gets far in big moves, forcing smaller size | Swing, trend following |
| Structure stop | Below the key prior low / above the prior high, plus 0.5%~1% buffer | Grounded location; if swept, the reason is clear | Finding structure takes chart experience | Intraday, swing |
| Fixed-percentage stop | Entry ∓ 2%~5% | Simple, mechanical, executable | Disconnected from volatility; may be too near or too far | Beginners, systematic trading |

Combined advice: **anchor on structure, validate the distance with ATR, cap with a fixed percentage**. When the three methods disagree, take the "farthest stop that still fits the per-trade risk budget", then back out the position (formula in 2.1).

### 3.2 The Relationship Between Stop Distance and Margin

The stop must sit **inside** the liquidation price, or the logic inverts: the position gets liquidated before the stop triggers, making the stop pointless. Since 1/leverage ≈ liquidation distance:

```text
Fix the stop distance first → back out the leverage cap (leave one full cushion) → finally compute the position size
```

| Stop distance | Theoretical leverage cap (1 ÷ stop distance) | Practical cap (leave ~2x cushion) |
|---|---|---|
| 3% | 33x | 15x |
| 5% | 20x | 10x |
| 10% | 10x | 5x |
| 20% | 5x | 2x |

> Check formula: **stop distance × actual leverage < 1**, ideally < 0.5. For example 10x with a 5% stop → 0.5, barely passing; 20x with an 8% stop → 1.6, the position always dies first.

### 3.3 The Reality of "Stops Get Swept by Wicks" and the Response

Reality: crypto stop orders are frequently swept by a wick after which price returns — "the direction was right after all". Two causes:

1. **Stop orders are market orders**: once triggered they fill at the going market price; when a wick slices through the stop level, the actual fill is far worse than the stop price (slippage);
2. **Stop levels are highly predictable**: exchange APIs, order-book patterns, and public liquidation data let programs spot them; dense stop clusters are liquidity "gold mines".

Responses:

| Response | How |
|---|---|
| Buffer the location | Put the stop 0.5%~1% below the prior low, never "exactly at" it |
| Avoid round big numbers | Stops just under 30,000 / 60,000 / 100,000 are the most crowded |
| Avoid liquidation walls | See Section 4; stay away from clustered liquidation orders |
| Re-enter after a sweep | If the trend is intact, re-enter on the original signal; don't chase, don't revenge-add |
| De-leverage before big events | Cut size before CPI, rate decisions, ETF rulings, token unlocks so the liquidation price sits far from market — **don't remove the stop, only reduce exposure** |

> ⚠️ **Risk Warning: a swept stop is not the stop's fault.** The stop's only job is "capping the per-trade loss", not "never getting hit".
> Removing the stop for fear of sweeps ("bag-holding") is the most classic blow-up path: one deep pullback without a stop eats all the profit saved by the previous 20 stops.

---

## 4. Liquidations and Liquidation Walls

### 4.1 How to Read Liquidation Data

The mainstream data platform is Coinglass (aggregating Binance, OKX, Bybit, and the whole market); exchange pages and market apps also ship "liquidation rankings / heatmaps" (data per the platform's latest statistics).

| Data dimension | How to use it |
|---|---|
| By exchange / by coin / by direction | Judge which side — longs or shorts — carries more leverage in a coin and is easier to sweep |
| Aggregated by 1h / 4h / 24h | See the "tidal" rhythm of liquidations; avoid opening positions at liquidation peaks |
| Single liquidation leaderboard | Single liquidations of millions to tens of millions of USDT come from whales; dense zones sit near those price levels |
| Liquidation heatmap | Darker color = more pending liquidation orders clustered near that price, i.e. the "liquidation wall" |

> Note: liquidation data is **statistics after forced liquidations have filled** — lagging, not a real-time signal; it answers "where the wall is", not "whether the wall will be pushed".

### 4.2 "Both-Sides Blow-Up" Markets

The mechanism chain:

```text
One side's high-leverage positions cluster (a liquidation wall) → price touches the wall → cascading forced liquidations (market orders)
→ The liquidation orders push price through the wall → the opposite side's positions also trigger → longs and shorts blow up in a chain
→ Derivatives prices deviate violently from spot → the mark price mechanism holds the line, but the spot index itself is also swinging violently
```

Classic case: **May 19, 2021**. BTC dropped from the $40k area to wick near $30k intraday (lower on some exchanges); per Coinglass and other platforms, total crypto contract liquidations that day ran to the billions of USD, with longs and shorts cascading — "both-sides blow-up" became a textbook day for the perpetual world.

A "double blow-up" is not an exchange malfunction but the **mathematical inevitability of clustered high leverage + chained liquidation fills**: with enough leveraged positions on both sides, sweeping one side necessarily hits the other. The lesson of 5·19: those without stops, without buffers, and oversized die on both sides in a double blow-up.

### 4.3 How Big Money "Hunts" Retail Stops

Hunting works because retail behavior is highly homogeneous: stops all sit "just below the prior low", "at round numbers", "right below structure levels", and these spots can be observed in advance via order-book patterns, cancel monitoring, and liquidation heatmaps.

The usual script:

1. Whales/algorithms lock onto the stops and liquidation orders clustered below a level;
2. Large **market orders** or consecutive sells smash through the level, triggering stop cascades and liquidation walls;
3. They fill in the deep spread created by slippage and forced liquidation (absorbing the swept liquidity);
4. Price reverts, and retail discovers "yet another wick".

Survival principles for the retail side:

- **Distance your stop from the crowd**: 0.5%~1% below the prior low; 1% below round numbers;
- **Trim proactively before key levels**: when price approaches your identified liquidation wall, trimming is far cheaper than betting "the wall holds";
- **No big positions in thin-liquidity hours**: weekends, late nights, before big events — the same capital moves price much farther;
- **Never pick the "prettiest" spot** — the prettiest level is also where most orders rest.

---

## 5. The Right Way to Trade Perpetuals

### 5.1 Trend Following First; Counter-Trend Bottom/Top Picking Is the No. 1 Killer

The logic of bag-holding spot is "as long as the coin doesn't go to **<mark>zero</mark>**, there is still hope" (though vaporware goes to zero anyway); the logic of bag-holding contracts is "three knives: liquidation + funding + ADL" — **you cannot afford it**.

- The correct profit model for perpetuals = small stops with the trend × big profits; the edge comes from the risk-reward ratio, not the win rate;
- "It already fell 50%, it must bounce" is suicidal logic at 20x: a 50% drop would have liquidated a 20x position four times over;
- Counter-trend trades are not forbidden, but they demand: half size, tighter stops, and objective evidence of "the trend may reverse" (structure break + volume confirmation) — not "I feel like it".

### 5.2 A Daily Trade-Count Cap

Recommendation: **0~3 trades per day** (beginners ≤ 1).

The math: the fixed cost of one round trip = taker fee ~0.05% × 2 + slippage + funding ≈ 0.1%~0.15% per trade. Ten trades a day = 1%+ fixed cost; 20 trading days = 20%+ — **high-frequency traders are essentially working for the exchange**, and the more trades, the higher the share of emotional decisions.

| Frequency | Trait | Verdict |
|---|---|---|
| 0~1 trades/day | Only planned signals | Healthy |
| 2~3 trades/day | Systematic, disciplined | Acceptable |
| 5+ trades/day | Itchy fingers, revenge trading | Warning sign |
| 10+ trades/day | A fee-burning machine | Stop immediately |

### 5.3 The Weekend and Holiday Liquidity Trap

- Institutions rest on weekends and market depth thins: the same stop order suffers bigger slippage, wicks are more frequent, fake breakouts multiply;
- Crypto runs 24/7 and **you do not need to trade every hour** — execute planned orders in the most liquid sessions (major trading hours, when institutions are active);
- Weekend practice: cut leverage to 5x or below, or stay flat; open no new positions from Friday night to Monday morning.

### 5.4 Managing Your State After Consecutive Losses

- 3 losing trades in a row: force leverage down one notch (10x → 5x);
- Down 5% in a day: stop for the day;
- Down 15% in a week: stop for the week; review only, no new positions;
- Account down 30%: treat the principal as halved — **treat losses as a real shrink in account size, not as "debt the market owes you"**.

---

## 6. Practical Checklists

### 6.1 The 8 Questions Before Opening

If any single answer fails, stand down:

| # | Question | If it fails |
|---|---|---|
| 1 | **Direction**: is this trade with the trend or against it? | Counter-trend → don't open |
| 2 | **Timeframe**: which timeframe am I entering on, which am I watching? | Can't articulate → don't open |
| 3 | **Stop**: where is the stop? How far, in %? | Not set → don't open |
| 4 | **<mark>Take-profit</mark>**: is the risk-reward ≥ 2:1? | < 2:1 → don't open |
| 5 | **Size**: is per-trade risk ≤ 2%? | Can't compute → don't open |
| 6 | **Leverage**: is stop distance × leverage < 0.5? | Mismatch → cut leverage |
| 7 | **Liquidation distance**: how far is the liquidation price from market? A wall nearby? | Too close / wall → trim |
| 8 | **News**: any CPI, rate decision, ETF ruling, token unlock in the next 24h? | Big event → trim or don't open |

> 80% of blow-up orders can be filtered out by these 8 questions before entry. After opening, add one self-check: **"If this trade hits its stop right now, do I accept it?"** If not, both the size and the leverage are wrong.

### 6.2 The Blow-Up Review Template

| Field | Fill in |
|---|---|
| Date / time | |
| Coin / direction | |
| Entry price / liquidation price | |
| Leverage / margin | |
| Entry rationale | |
| Was it counter-trend at the time | |
| Was a stop set / why didn't it trigger | |
| Was there a liquidation wall near the liquidation price | |
| News backdrop / liquidity session at the time | |
| Direct cause of the blow-up | Counter-trend / oversized / bag-holding / careless stop / wick / funding / slippage |
| Root cause (one sentence) | |
| The rule to change for next time (one item) | |

Three review questions:

1. Which of the "8 questions before opening" did this trade fail?
2. Was the loss **within-plan** or **outside-plan**? Within-plan losses are tuition; outside-plan losses (removing stops, exceeding size, adding to counter-trend losers) are violations;
3. Which system rule will I change for this trade? — Review is not self-consolation; it is producing one **enforceable rule change**.

---

## 7. Self-Diagnosis: Are You a "Contract Gambler"?

### 7.1 Danger-Sign Checklist (3+ hits = you are in pathological trading territory)

- [ ] Opening a new position to "win it back" within an hour of a blow-up;
- [ ] Doubling down to average losses (Martingale-style "the next one brings it all back");
- [ ] Borrowing money, cashing out assets, or diverting living expenses to fund the account;
- [ ] Bragging about wins, hiding losses, concealing real P&L from family;
- [ ] Manually cancelling a set stop while bag-holding;
- [ ] Using "just one last time" to justify opening a position;
- [ ] Keeping the same leverage — or raising it — after a 50%+ account drawdown;
- [ ] Watching charts 4+ hours a day, with market rhythm hijacking your life.

### 7.2 How to Exit After Consecutive Blow-Ups

| Step | Action | Duration / standard |
|---|---|---|
| 1. Stop immediately | Close all positions, lock the account (withdraw / change passwords and hand to family), quit all market apps | No logins for at least 72 hours |
| 2. Admit and record | Write every blow-up into the review template in full, **no deleting, no sugar-coating** | One complete review |
| 3. Cooling-off period | Do only three things: review every blow-up, re-read [01-Perpetual Swaps](perpetuals.md) and this article, practice on the simulator | 30 days |
| 4. Spot the "win-it-back" fixation | "Winning it back" is the most expensive trading motive: revenge trading = gambling with leverage. You are clean when you stop thinking about recovery and only ask "does the next trade fit the system" | Continuous self-audit |
| 5. Re-entry threshold | 20 consecutive simulator trades executed per plan with acceptable risk-reward before restarting with real money, small size | ≤ 2x leverage, ≤ 5% of account |
| 6. Funding red line | Perpetual capital cap = money whose total loss won't affect your life; if you can't meet this bar, never deposit | Permanent |

::: warning ⚠️ Risk Warning
Perpetual trading is one of the few "winner-takes-all, loser-goes-to-zero" games: no circuit breakers, no price limits, 24/7, with leverage, funding, and ADL strangling together.
Every checklist and template in this article can only lower the probability of blow-ups, never eliminate the risk itself.
**If you catch yourself justifying a new position with the words "win it back" or "just one last time", stop immediately, close the leveraged account, or have someone lock the funds for you.**
:::
