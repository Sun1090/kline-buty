---
title: "08 · Price Alerts and Off-Screen Discipline"
description: Price alerts and off-screen discipline — the attention cost of watching charts, outsourcing the "condition→action" trigger to the system, binding alerts to trading-plan key levels, alert overload, and what to do after an alert fires
---

# 08 · Price Alerts and Off-Screen Discipline

> <mark>Price alerts</mark> are the cheapest — and most underrated — discipline tool in any charting platform: you set a price condition, and the system calls you back when it triggers. **Their purpose is not "catching the move" but outsourcing the "condition → action" trigger to the system, redeeming your attention from the screen.** Watching charts costs more than time — it erodes the very judgment you need at the decisive moment.

::: tip 💡 One-Sentence Summary
One-sentence summary: **Alerts replace watching, not deciding.** An alert only brings you back to the screen; the grounds for action always come from the trading plan.
:::

---

## 1. The Cost of Watching Charts

"Watching the screen means being responsible" is a beginner's instinct, yet what actually happens is usually the opposite:

| Cost | Mechanism |
|---|---|
| Attention drain | Constant scrolling makes the brain process meaningless fluctuations, dulling it for the signals that truly matter |
| Emotional triggers | Every refresh is a temptation: even without reaching a condition level, you itch to "do something" |
| Forced noise intake | Short-timeframe watching shows mostly random movement; constant exposure to high noise inevitably breeds an urge to act |
| De facto loss of position control | Staring at unrealized P&L makes emotion ride the numbers, tempting early profit-taking or panic stops that break the plan |

The habit of watching 1m / 5m charts all day is especially harmful: you are not "tracking the market" — you are **force-fed the highest proportion of noise**. The finer you look, the easier it is to read random movement as signal and act outside the plan. This resonates with human weakness: the loss aversion and recency effects covered in the [behavioral finance](../behavioral-finance/) chapter are amplified severalfold in the watching scenario.

::: tip 💡 Attention Is Part of Position Sizing
Decision quality depends on attention quality. Spending limited attention on the key moments of plan execution — rather than on every minute's fluctuation — is itself a form of risk control.
:::

## 2. The Right Role for Alerts: Outsourcing "Condition→Action," Not the Decision

A trading plan (see the [trading plan](trading-plan.md) chapter) decomposes a trade into judgeable conditions: "when price reaches X, do Y." What an alert does is refreshingly simple: **the system watches the condition for you and calls you back when it triggers.**

The crucial boundary:

- Alerts **replace watching**: you need not poll the market with your eyes; the system neither misses nor tires nor slips.
- Alerts **do not replace decisions**: a triggered alert ≠ automatic execution. "Price broke the alert level" means one condition is met; whether to enter, how much, and where the stop goes — all of that still comes from the plan.

One sentence draws the line: "An alert is an alarm clock, not an auto-trader." The alarm means "come back and handle this," not "buy now."

## 3. How to Set Alerts That Actually Work

### 3.1 Bind Alerts to Plan Key Levels, Not Round Numbers

The most common mistake is "hanging alerts on round numbers by feel": 30000, 50000, and other psychological levels. Such levels are neither your entry condition nor your stop basis; when one triggers you have no playbook — you have **wired noise straight into your notification bar**.

The right approach: every alert maps to a key level in the trading plan —

| Alert type | Which plan item it binds to | What to do when it fires |
|---|---|---|
| Breakout confirmation level | The entry rule's "break X with a confirmed close" | Recheck the plan: are all confirmation conditions met? Enter only if yes |
| Stop warning level | The buffer one step before the stop rule (e.g., warn at −0.7% for a −1% stop) | Rehearse the exit: check whether the plan calls for reducing or exiting — do not improvise a new stop |
| Add-position trigger | The position-management rule "add near pullback to Y" | Verify add-on preconditions (trend intact, total exposure within limits) before acting |
| Structure-level approach alert | 0.5%~1% before a major higher-timeframe support/resistance | Enter observation mode and wait for the confirmation signal |

Set this way, **every triggered alert has a playbook** — the direct benefit of sourcing alerts from the plan.

### 3.2 Prefer Conditional Alerts Over Single Prices

Most platforms support conditional alerts ("price crosses above," "drops more than N%," "recovers above the average price"). When a condition can be written, write it — an alert phrased like the plan itself reduces the "translation cost" at trigger time.

## 4. Alert Overload: Too Many Alerts Equal No Alerts

The fatal flaw of the alert mechanism is overload: too-frequent triggers → the brain files them as background noise → the one alert that matters gets missed. This is the same disease as the "confirmation bias" in [multi-timeframe analysis](../technical-analysis/multi-timeframe.md): the more information, the easier to hear only what you want to hear.

**Suggested caps**:

- **≤ 5 active alerts** per instrument; **≤ 10** across the whole portfolio.
- Every alert must answer two questions: "Which item of the plan does it map to?" and "What will I do when it fires?" If either answer is missing, delete it.
- Clean up regularly (e.g., during the weekly review — see [the trading journal and checklists](journaling-checklists.md)): alerts unrelated to the current plan, pure round-number alerts, and alerts that fired last week without any action.

::: warning 🔄 Keep Only Alerts Sourced from the Plan
The sole test of whether an alert deserves to exist: "Does it come from the current trading plan?" Alerts hung outside the plan — however convenient — open a back door for impulsive trading.
:::

## 5. After the Alert Fires: Triggered ≠ Enter

The standard post-trigger routine is a fixed three steps:

```text
1. Stop: do not order immediately. The alert only says "the price condition
   is met," not "the trade is on."
2. Check: return to the trading plan and verify every premise attached to
   this trigger — direction allowed? Volume confirmed? Total exposure within
   limits? Is today even a planned execution day?
3. Act: all conditions met → execute per the plan (including stop and size);
   any condition missing → record "triggered but skipped" with the reason,
   and close the case.
```

The "triggered but skipped" record matters enormously — it is as valuable as a winning trade: it is your evidence for distinguishing "the alert system works" from "the condition design works." If reviews show a flood of skipped triggers, your alert conditions are looser than your plan and need tightening.

The reverse trap deserves equal warning: **treating alerts as signals and entering on every trigger.** That compresses the plan's entry conditions into a single price condition, skipping every confirmation step in the instant you press the button — the alert becomes an accelerator for impulsive trades instead of a discipline tool.

## 6. Using Desktop Notifications and Sound as Tools

The delivery channel itself affects discipline:

- **Tiered delivery**: stop warnings — which demand immediate action — get sound and strong notifications; structure-approach alerts — which merely invite observation — get silent push. Strong notifications everywhere recreates overload.
- **Kill market-feed push**: charting apps' default "big move" and "trade tape" notifications are unrelated to your plan — turn them all off. They are the front door for noise.
- **A post-trigger ritual**: when a strong alert fires, the first thing you open at the screen is the trading plan page — not the chart page. That fixed order is itself discipline training.

::: tip 💡 The Tool-Chain Loop
Alerts (standing watch) + the trading plan (decision basis) + the trading journal (behavior record) form a loop: the alert brings you back, the plan tells you what to do, the journal records what you actually did.
:::

::: warning ⚠️ Risk Warning
Price alerts can be delayed or missed, and in extreme moves price can blow through both the alert level and the stop level in an instant; a triggered alert is not a trade signal, and executing without checking the plan invites losses. No alert mechanism can replace standing stop-loss orders and position management.
:::
