---
title: "06 · Technical Analysis: Critique and Validation"
description: "Critique and validation of technical analysis — the momentum effect, support/resistance anchoring, backtesting methodology, and an academic audit of whether a signal is truly effective"
---

# 06 · Technical Analysis: Critique and Validation

> The previous articles taught you how to "use" technical analysis; this one pours cold water on it: does technical analysis actually work? What does academia say? Why do some people make money and others lose on the same pattern? And — **when is a signal "genuinely effective" rather than "looks effective"?**

::: tip 💡 Master Principle
**Remember one master principle first: technical analysis's standing in academia is "some real effects exist, but far from enough to support most folk usage".** This article does not deny the usefulness of technical analysis, but demands a <mark>verifiable audit</mark> of every claimed "power".
:::

---

## 1. Supporting Evidence: The Parts of Technical Analysis That Are "Real"

> Critics often dismiss technical analysis wholesale, but decades of finance research have actually found a few effects "repeatedly confirmed" — and they happen to be the theoretical footing for certain technical-analysis usages.

### 1.1 The Momentum Effect

- **Finding**: Jegadeesh & Titman (1993) and a large follow-up literature confirmed: **stocks that outperformed over the past 3–12 months tend to keep outperforming over the next 3–12 months**; and vice versa. This is one of the most robustly replicated anomalies in finance.
- **Link to technical analysis**: the **<mark>momentum effect</mark>** is the most important scientific basis for "trend following" (bullish MA alignment, breakout buying, trend patterns) — **trends genuinely have inertia; going with the trend is not statistically stupid**.
- **Boundary**: momentum reverses over short horizons (days) and very long horizons (years) (short-term and long-term reversal effects), and momentum strategies suffer deep drawdowns during momentum crashes (sharp market turns) — "following the trend" is not unconditional profit.

### 1.2 Anchoring and Self-Fulfillment of Support/Resistance

- **<mark>Anchoring effect</mark>**: behavioral finance confirms that humans naturally anchor to price levels like "round numbers, prior highs/lows, historical averages", and traders use them as decision references — giving support/resistance a **real behavioral foundation**;
- **<mark>Self-fulfillment</mark>**: when enough people believe "20 is support", they place bids around 20, objectively creating the support — **part of why support/resistance "works" is that believers turn it into fact with real money**;
- **Research corroboration**: Osler (2000) studied the distribution of **<mark>take-profit</mark>**/**<mark>stop-loss</mark>** orders in forex and found orders do cluster near "round numbers and prior highs/lows on the chart" — support/resistance does have real order-flow footing, but that also means it gets run through systematically (see Section 3).

### 1.3 Established Findings on Volume Anomalies

- **Expansion accompanies large moves**: academic research broadly supports volume-price common sense such as "volume correlates positively with absolute returns" and "expanding breakouts are more real than contracting ones";
- **Volume-price divergence carries information**: price making new highs on shrinking volume is read as "insufficient participation", with statistically higher odds of subsequent underperformance;
- **Limitation**: volume research is "descriptive" — it shows "volatility is greater when volume expands", but once you turn "expansion" into a tradeable entry signal, the after-cost edge is often negligible.

---

## 2. Critical Evidence: Why Technical Analysis Is "Not That Magical"

### 2.1 Random Walk and the Weak-Form Efficient Market Hypothesis

- **<mark>Random walk</mark>**: price changes cannot be predicted from historical prices (next direction ≈ a coin flip) — the **fundamental challenge** to technical analysis; if historical patterns cannot predict the future, technical analysis carries no information;
- **<mark>Weak-form EMH</mark>**: proposed by Eugene Fama — if a market is weak-form efficient, then **all historical price and volume information is already reflected in the current price**, and any strategy based only on historical price/volume cannot earn excess returns;
- **Realistic conclusion**: EMH is not "completely right" — markets contain many anomalies (momentum, low volatility, etc.), but whether those anomalies **survive transaction costs and real capital capacity** is another matter — research leans toward "efficient but imperfect".

### 2.2 The Difficulty of Beating a Benchmark with Technical Strategies

| Strategy | Typical academic backtest result | Conclusion |
|---|---|---|
| Dual MA (golden/death cross) | Long-run returns roughly equal to or worse than buy-and-hold, with high costs | The "effectiveness" comes from bull-market exposure, not timing |
| MA timing (e.g., MA200 filter) | Positive contribution in some markets/periods, but drawdowns and costs eat most of the edge | Fragile, parameter-sensitive |
| Classic patterns (head and shoulders, double top) | Some statistical significance (Brock et al. 1992 supported it), but later studies show severe out-of-sample decay | Strong period-of-publication effect, hard to replicate |
| Oscillators (RSI/KDJ overbought/oversold) | Decent in ranges, repeatedly slapped in trends | Regime-dependent, and the regime itself is hard to predict |

::: tip 💡 The Academic Consensus in One Sentence
**The academic consensus in one sentence: <mark>technical-analysis strategies in backtests are "occasionally effective, generally fragile, cost-sensitive, and rarely beat buy-and-hold consistently"</mark>.**
:::

### 2.3 Landmark Studies (The Tug of War)

| Study | Finding | Meaning for technical analysis |
|---|---|---|
| Fama (1970), weak-form EMH | Historical price information yields no excess returns | The "theoretical basis" of technical analysis shaken |
| Brock, Lakonishok & LeBaron (1992) | MA rules showed statistically significant predictive power on the Dow | Technical analysis gained "academic legitimacy"; cited endlessly |
| Later out-of-sample tests (Sullivan et al. 1999; Hsu & Kuan 2005) | After data snooping and out-of-sample testing, the edge decays sharply | Early "effective" results shown to be partly cherry-picked |
| Jegadeesh & Titman (1993), momentum | Intermediate-term momentum is real and robustly replicated | Gave "trend following" a solid behavioral foundation |
| Osler (2000), order distribution | Stop-loss/take-profit orders cluster at round numbers and pattern levels on charts | Support/resistance has a real order-flow foundation |
| Lo (2004), Adaptive Markets Hypothesis | Market efficiency is dynamic: strategies cycle effective → crowded → dead | Explains why signals "sometimes work, sometimes don't" |

**The overall picture from these studies**: technical analysis is not "pure superstition" (momentum, support/resistance, and volume-price all have real behavioral/microstructure foundations), but it is nowhere near the folk-marketed "holy grail" — **its true effects are "weak, fragile, and dynamically varying with crowding"**.

### 2.4 Survivorship Bias and Publication Bias

- **<mark>Publication bias</mark>**: academia publishes only the "winners" — **"the wins get published; the losses get written by nobody"**. A researcher can test 100 rules; the 5 that happened to win become a paper, the other 95 go into the drawer (the "file drawer problem"). Readers see a filtered, optimistic subset;
- **<mark>Survivorship bias</mark>**: backtests use only stocks/instruments alive today; delisted and **<mark>zeroed-out</mark>** ones are excluded — so the "historical success rates" of technical analysis (especially on small caps and junk stocks) are systematically overstated;
- **<mark>Data snooping</mark>**: retest parameters repeatedly on the same history and you will always find "perfect parameters" — perfect only for that history (overfit), with zero predictive power for the future. **For every "80% win-rate strategy" you see, first ask: was it tested, or was it selected?**

```text
How an "amazing backtest curve" is born:
100 raw rules → backtest → discard 95 → publish the 5 that won
                                    ↓
              Readers conclude "technical analysis beats the market on average"
              The true distribution may be "the luckiest 5%"
```

---

## 3. The "Self-Fulfillment" Problem: More Users, More Effective or More Broken?

### 3.1 The Two Faces of Self-Fulfillment

- **Positive self-fulfillment**: when moving averages, support/resistance, and classic patterns are watched by huge numbers of traders, "bids clustering at support" emerges as behavior and the signal gets "more accurate" short term — which is why widely known signals (the 60-day MA, round numbers) show up more clearly in retail-dominated markets (e.g., A-shares);
- **<mark>Negative self-fulfillment (crowded trades)</mark>**: when a signal is used by too many, a "front-running effect" appears: everyone buys at the same level, price instantly jumps past it, and latecomers get worse fills; worse still is **exploitation by operators** — deliberately faking moves just above the support everyone waits on, or sweeping stops just below it before pumping ("stop hunting"), turning the "effective signal" into a trap that harvests retail traders.

### 3.2 Typical Signatures of Crowded Trades

| Signature | Description |
|---|---|
| Overly popular signal | Golden crosses everyone knows, trendlines everyone draws — front-running and stop-hunting both intensify |
| Overly tidy levels | When stops pile up near a support, the odds of the market "hunting stops specifically" rise markedly |
| Overly synchronized timing | Around earnings/delivery dates/time windows, consensus expectations create "sell the news" reversals |

::: tip 💡 Conclusion
**Conclusion: <mark>self-fulfillment makes a signal "more effective short term, more crowded long term"</mark>; the two alternate, turning signal effectiveness itself into a curve of decay and reformation — you can never assume a signal stays effective forever.**
:::

---

## 4. How to Scientifically Validate a Technical Indicator (Actionable Steps)

> No academic background needed — with a market terminal and a spreadsheet you can give any indicator a "scientific health check". **The goal is not to prove it 100% effective, but to measure its true win rate, payoff ratio, and drawdown, and judge whether it is worth using.**

### 4.1 The Seven-Step Validation Method

```text
① Write down the complete rule definition (reproducible by a program or anyone)
② In-sample backtest (2015–2021, parameter A)
③ Out-of-sample backtest (2022–present, same parameter A)
④ Parameter sensitivity test (parameter A ±20%, ±50%)
⑤ Rerun with transaction costs and **<mark>slippage</mark>** included
⑥ Benchmark against "buy-and-hold" and "random signals"
⑦ Conclusion: still effective out of sample? robust to parameter changes?
```

### 4.2 The Key Question at Each Step

| Step | Question to answer | Common pitfall |
|---|---|---|
| Define the rule | What exactly is a "golden cross"? (close or intraday price? confirmed after how many bars?) | Vague rules → backtest not reproducible |
| In-sample | How are returns under this parameter? | Testing only one bull run inflates results |
| **Out-of-sample** | On history never used for tuning, do results hold? | **In-sample-only effectiveness = overfit; discard** |
| **Parameter sensitivity** | With 20 changed to 10 or 40, does it still profit? | Only parameter 20 profiting = fitted to noise |
| **After costs** | Does it still profit after 0.1%–0.2% fees + **slippage** per trade? | High-frequency small-signal strategies get eaten alive by costs |
| **Benchmark comparison** | Better than "buy-and-hold" and "random entries"? | Beating the benchmark counts; beating zero does not |
| Overall judgment | Out-of-sample return + parameter robustness + positive after costs — all three must pass | Fail any one → treat as "ineffective" |

### 4.3 Three Veto Conditions

1. **Out-of-sample failure** — the strategy works only on the history used for tuning;
2. **Parameter sensitivity** — a strategy that flips from profit to loss on ±10% parameter shifts is no strategy;
3. **Negative after costs** — high gross returns that turn to losses after costs and slippage: the most common reality of retail strategies.

### 4.4 A Complete Validation Example (Dual-MA Golden Cross)

Take "buy when MA20 crosses above MA60, sell when it crosses below" through the seven steps:

| Step | Execution | Typical result and reading |
|---|---|---|
| Definition | Golden/death cross confirmed on close, executed at next open | Reproducible rule; passes |
| In-sample | CSI 300 index, 2015–2021 | 9% annualized vs 6% buy-and-hold — looks good |
| Out-of-sample | 2022–2025, same rule, same parameters | 4% annualized vs 5% buy-and-hold — **clear decay** |
| Parameter sensitivity | MA pairs changed to 10/40, 30/90, 50/150 | Only 20/60 profits, others much worse — **overfit signature** |
| After costs | 0.2% per turn (commission + slippage), ~15 turns/year | Another 1.5 points off annualized; out-of-sample edge gone |
| Benchmark | vs random timing (coin-flip entries/exits) | No significant difference |
| Conclusion | Out-of-sample failure + parameter sensitivity + no after-cost edge | **Verdict: ineffective; discard** |

**The point of this example**: the folk claim that "golden-cross strategies are profitable" almost never survives this process. Not because the process is too harsh, but because **the real costs and real noise of trading markets simply cannot accommodate most "beautiful-looking" signals**.

> As an aside: if you can't write backtests, use the dumbest effective method — **manual journaling**: from today on, log every signal's trigger time, price, and reason in a spreadsheet; after a month, check the "5-day/10-day returns after each trigger". After a few hundred samples you will know the signal's "true win rate" far better than by feel.

---

## 5. The Reasonable Position of Technical Analysis

### 5.1 An "Explanation Tool", Not a "Prediction Tool"

- **What it can do**: describe the market's current regime (trend/range/exhaustion), what the bull-bear structure looks like, which price levels have real money attention — background information that **lowers decision difficulty**;
- **What it cannot do**: tell you whether price rises or falls tomorrow, exact buy/sell points, or price targets. Any technical analysis claiming to do these exceeds its capability boundary;
- **The right posture**: treat technical analysis as a "GPS map" (where am I, what terrain lies ahead), not an "oracle" (what will happen tomorrow).

### 5.2 As an Entry-Timing Filter for a Trading System

Technical analysis's real role in professional trading is usually a "filter", not the "engine":

```text
Complete trading system = Direction (fundamentals/macro trend judgment)
                      + Trigger (technical entry signal) ← only decides "when"
                      + Risk control (position sizing, stops, payoff ratio)
                      + Execution (discipline and consistency)
```

| Role | Technical analysis's duty | Duty it should NOT carry |
|---|---|---|
| What to trade | Not its job (fundamentals/macro set direction) | Don't pick instruments by "pretty patterns" |
| When to enter | Breakout/retest/exhaustion signals give the trigger | No guarantee of profit after the trigger |
| When to exit | Stop levels, trend-break signals | Don't hold and hope on "theoretical price targets" |
| How big a **position** | Not its job (set by ATR and risk budget) | Don't size up because "the signal is strong" |

::: tip 💡 Positioning in One Sentence
**Positioning in one sentence: technical analysis's job is to "<mark>find a good entry timing in the right direction</mark>", and it always defers to position management and stop-losses.**
:::

---

## 6. Why Many People Lose Money with Technical Analysis

### 6.1 Mistaking Correlation for Causation

- Seeing "price often rises after a golden cross", they conclude "the golden cross causes the rise" — in fact the golden cross is just the trend's **echo** (a lagging indicator); when trends rise, golden crosses naturally abound; taking the echo for the cause gets you into counter-trend trades at market turns;
- Likewise, "this pattern worked last time" does not imply "it will work this time" — tiny samples + memory bias (remembering only the wins) manufacture false confidence.

### 6.2 Ignoring Position Sizing and Execution

- **Payoff ratio and position size are the variables that shape the equity curve**: a 55%-win, 1:1 payoff system loses long-term to a 40%-win, 2:1 payoff system — technical analysis only touches the win-rate term;
- The typical retail loss path: the signal is fine, but **position too heavy (−10% per loss) + stops not enforced (cutting only at −30%) + winners dumped too early (+3% and out)** — together these three turn a "positive-expectancy signal" into a "negative-expectancy account";
- Technical analysis tells you nothing about "how much to bet", and that is precisely the part that decides survival.

### 6.3 Treating Indicators as Holy Grails

- **The "grail mentality"**: believing a "90% win-rate indicator" means financial freedom — so they keep switching indicators and optimizing parameters, sinking ever deeper into the overfitting loop; **behind every seemingly perfect strategy lies a historical curve that has already stopped working**;
- **Signal abuse**: run 5 indicators and one always supports your idea — more indicators mean more "selective belief"; in the end you trade not a system but your own emotions;
- **The only antidote**: apply the Section 4 validation method to every strategy you use, and accept that "a good technical system is a thin edge + strict execution". Thin edge × long-term discipline = stability; an "invincible indicator" = guaranteed loss.

---

::: warning ⚠️ Risk Warning
Technical analysis is a **probabilistic tool, not a certainty tool**: the real effects supported by research (trend effects, support/resistance anchoring) are often heavily diluted once transaction costs, slippage, and parameter overfitting are counted; most "beating-the-market" backtested strategies are contaminated by publication bias, survivorship bias, and data snooping, and decay out of sample; crowded trades on homogeneous signals can even harvest their own users. **Any technical signal can only stay effective long-term when combined with position management, stop discipline, and consistent execution** — treating technical analysis as a holy grail, sizing by signal strength, or ignoring costs are all classic paths to losses. This article is for educational purposes only and does not constitute investment advice.
:::
