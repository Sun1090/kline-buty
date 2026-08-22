---
title: "04 · Spot Trading Strategies"
description: "Six spot trading strategies — DCA, grid, value investing, swing, arbitrage, and new listings/airdrops; each with its fit, core logic, and risk points so you can find your seat"
---

# 04 · Spot Trading Strategies

> Spot has no **<mark>leverage</mark>** and no **<mark>forced liquidation</mark>** — it is the battlefield best suited for ordinary people to participate in long term.
> This article breaks down 6 classic spot strategies: DCA, grid, value investing, swing, **<mark>arbitrage</mark>**, and market-specific plays.
> Each strategy comes with "who it fits / core logic / risk points" so you can find your own seat.

---

## 1. Dollar-Cost Averaging (DCA)

### Who It Fits

- Salaried workers with a steady cash flow (salary/rent income).
- People who do not want to study the market and admit "I cannot call the direction".
- A goal of beating inflation and forced saving, not chasing excess returns.

### Core Logic

Buy a fixed amount of the same asset on a fixed schedule (e.g. 500 CNY every Thursday), regardless of price. You buy more when prices are low and less when prices are high, automatically averaging down your cost over time.

- **The math**: suppose the price falls from 1 to 0.5 and returns to 1 — DCA's **average cost across the whole period is below the arithmetic average price**, because more units are bought at lower prices.
- **The psychology**: it replaces "timing anxiety" with "mechanical execution", eliminating chasing and panic selling.
- **Discipline**: never stop whether price rises or falls; the deeper it falls, the more you buy (adding on dips).

### DCA Execution Table (example: 500 CNY weekly)

| Week | Price (CNY) | Units bought | Cumulative units | Cumulative invested | Average cost |
|---|---|---|---|---|---|
| 1 | 1.00 | 500 | 500 | 500 | 1.000 |
| 2 | 0.80 | 625 | 1125 | 1000 | 0.889 |
| 3 | 0.50 | 1000 | 2125 | 1500 | 0.706 |
| 4 | 0.90 | 556 | 2681 | 2000 | 0.746 |
| 5 | 1.30 | 385 | 3066 | 2500 | 0.815 |

> By week 5, when the price returns to 1.3, the position is up about 59%. A one-time buy at 1.0 would show only 30% at the same moment. **The falling phase is precisely DCA's friend.**

### Execution Essentials

1. Fix the DCA day: the first trading day after payday, to keep human nature out of it.
2. Schedule is flexible: weekly vs monthly makes little difference; the key is persisting long enough (at least 2-3 years).
3. Asset choice: broad indices / major coins (BTC, ETH) — assets that "trend up long term and won't go to **<mark>zero</mark>**".
4. Set a **<mark>take-profit</mark>** target (e.g. take profit in tranches at 50% unrealized gain), then start a fresh DCA round with the proceeds.
5. Set up automatic DCA on the platform to avoid emotional manual operation.

### Risk Points

- **Choosing the wrong asset is the biggest risk**: DCA-ing a single stock/altcoin that gets delisted/goes to zero means the longer you DCA, the deeper the loss.
- **Cash-flow break**: unemployment or a large expense forces a mid-way sell, and everything is wasted.
- **Missing take-profit**: buy-only-never-sell gives back all unrealized gains in a big bull cycle — a terrible experience.
- **Psychological test**: after a year of falling prices with a 40% unrealized loss, most people quit — and the quitting point is usually the bottom.

> ⚠️ Risk Warning: DCA does not guarantee profit; it only "smooths the cost". "Buy more as it falls" presupposes that the asset survives long term and trends up long term. For assets that can go to zero (single stocks, altcoins, sunset-industry ETFs), DCA = slow-motion losses.

::: danger 💀 DCA-ing a to-zero asset = slow-motion losses
**DCA does not guarantee profit; it only "smooths the cost".** For assets that can go to zero (single stocks, altcoins, sunset-industry ETFs), DCA = slow-motion losses — the more it falls, the more you buy, and the deeper you go.
:::

---

## 2. Grid Trading

### Who It Fits

- Retail traders with some programming or configuration ability who can follow the rules.
- Best when the underlying is in a **range** (not a one-sided trend).
- People with some capacity for monitoring/bot maintenance.

### Core Logic

Inside a set price range, split capital into N tranches: buy one tranche each time price drops a grid step, sell one tranche each time it rises a grid step, harvesting the spread of each oscillation.

```text
Price range: 100-200 CNY, grid step 10 CNY
Capital: 10,000 CNY, split into 10 grids

Price 200 → buy 1,000 CNY at each drop to 190 → another 1,000 at 180 ...
Price recovers to 190 → sell 1,000 CNY (earn one grid step) → sell again at 200 ...
```

As long as the price oscillates back and forth inside the range, the grid keeps producing profit — **you are earning <mark>volatility</mark>, not direction**.

### Parameter Settings

| Parameter | Description | Recommendation |
|---|---|---|
| Price range | Grid floor and ceiling | Historical high/low + a 20% buffer |
| Grid count | Grid density | Range ÷ count = step size; 5-20 grids is common |
| Per-grid capital | Buy amount per grid | Total capital ÷ grid count; always keep cash in reserve |
| Arithmetic/geometric | Steps by absolute price or by percentage | Geometric at highs, arithmetic at lows, to defend against extreme prices |
| Trigger mode | Resting limit orders or tracking triggers | Prefer resting limits for execution certainty |

### Suitable Market Conditions

| Market | Grid performance | Advice |
|---|---|---|
| Long sideways range | Best; continuously harvests oscillation | Run the grid normally |
| Mild one-sided uptrend | Some **<mark>position</mark>** sells too early, but still earns | Raise the range ceiling |
| Mild one-sided downtrend | Buys more and more; unrealized loss grows | Lower the range floor |
| Crash-and-spike | Range blown through; resting orders fail | Must set a **<mark>stop-loss</mark>** outside the range |

### Risk Points

- **A one-sided move blows through the range**: fully trapped when the floor breaks, empty-handed when the ceiling breaks — the grid fears direction most, inherently contradicting its own logic.
- **Inefficient capital use**: most capital sits idle "waiting to trigger"; in a bull market the **<mark>rate of return</mark>** badly trails full-position holding.
- **Fee erosion**: every grid buy-and-sell round pays fees; dense grids let fees eat the profit.
- **Extreme moves**: crypto wicks (an instant crash then rebound) can fill **<mark>limit orders</mark>** at terrible prices.

> ⚠️ Risk Warning: a grid is not "brainless passive income". Its profit ceiling is locked inside the range, while losses are uncapped once the floor breaks. Always set: stop immediately outside the range, total capital never exceeding what you can afford to lose, and pick instruments with moderate volatility and low fees.

---

## 3. Value Investing / Buy & Hold

### Who It Fits

- People who believe in "investing, not speculating" and hold in years.
- Those with fundamental research ability (can read financials/whitepapers/industry logic).
- Emotionally stable people who can sit through a 50% **<mark>drawdown</mark>** unshaken.

### Core Logic

Buy long-term sound assets at a reasonable price and profit from **the asset's own growth** (corporate earnings, industry penetration, productivity gains) rather than short-term **<mark>spread</mark>**.

- **Asset selection**: businesses/industries whose business model and long-term cash flow you can understand; in crypto, look at protocol usage, developer activity, and network effects.
- **Valuation**: at purchase, ask "is this price expensive", referencing PE, PB, price-to-book, network value ratio (NVT), etc.
- **Holding**: after buying, do not forecast short-term moves; hold as long as the thesis is intact; sell when the thesis breaks (fundamentals deteriorate).

### Classic Behavior Contrast

| Behavior | Value investor | Speculator |
|---|---|---|
| Buy basis | Fundamentals + valuation | News, sentiment, candlesticks |
| Holding period | Years | Days, hours |
| Down 30% | Sees a discount; considers adding | Panic-sells |
| Up 30% | Re-examines whether valuation is stretched | Chases and adds |
| Information source | Financials, industry data | Group chats, calls |

### Position and Allocation Advice

- No single position above 20% of total capital; any single industry capped at 40% combined.
- Keep 10-20% cash so you have bullets in a big drop.
- Review fundamentals periodically (quarterly/annually) instead of staring at charts.

### Risk Points

- **Wrong fundamentals**: the industry logic changes (Nokia, bike-sharing) and "long-term holding" becomes "long-term trapping".
- **Valuation kill**: even a good company bought too expensive may go nowhere for years or halve.
- **Black swans**: accounting fraud, regulatory strikes, technological disruption — fundamentals collapse overnight.
- **Human nature test**: most people cannot hold — want to sell at +30%, want to cut at -30%, and end up hit from both sides.

> ⚠️ Risk Warning: value investing is not "buy and ignore". What you hold is not a ticker but the company/project itself, and its fundamentals change. Real value investors make a serious "sell or keep holding" decision every year — they do not lie flat. Moreover, the crypto market lacks reliable financials and audits, "value" is harder to verify, and the misjudgment rate is far higher than in equities.

---

## 4. Swing Trading

### Who It Fits

- People with 1-2 hours of chart-watching time per day.
- Those who know basic technical analysis (support/resistance, moving averages, candlestick patterns — see [06-Technical Analysis](../technical-analysis/)).
- People who admit they are not day traders but are not satisfied with pure holding.

### Core Logic

Capture 3-30 day mid/short-term price swings in the spot market: **buy near support, sell near resistance/target**, taking a leg of the upswing.

- **Go with the trend**: only go long in uptrends; stay in cash during downtrends (spot cannot short).
- **Stop and target discipline**: before each trade, fix the entry, stop-loss, and take-profit prices — all three are mandatory.
- **<mark>Risk-reward</mark>**: enter only when expected profit ≥ 2x expected loss (e.g. stop at 5%, target at least 10%).
- **Signal combination**: bullish MA alignment + a pullback that holds support + volume confirmation.

### Sample Trade Plan

```text
Instrument: a major coin, now at 100
Entry: pullback to 95-97 with a bullish close → buy
Stop-loss: break below 92 → loss about 5%
Take-profit: first target 108 (sell 1/3), second target 115 (clear out) → average gain about 12%
Risk-reward ≈ 2.4 : 1
```

### Risk Points

- **Win-rate trap**: a 40% win rate with 3:1 risk-reward still makes money; conversely a 70% win rate can lose money. **Do not chase being right on every trade; chase positive overall expectancy.**
- **Chop attrition**: repeated stop-outs in a trendless market, shaken off right before one big rally.
- **Time cost**: opportunity cost while holding plus the drain of not being able to focus on work.
- **Subjectivity**: no mechanical signals, entering on "feel" — the number one cause of swing failure.

> ⚠️ Risk Warning: swing trading is the highest-risk category among spot strategies, because it is essentially **short-term speculation with spot tools**. Overweight positions + unexecuted stops = one trap erasing ten profitable trades. Swing capital must be strictly limited to money whose total loss would not affect your life.

---

## 5. Spot Arbitrage

### 1. Cross-Exchange Spread Arbitrage (same coin, different price)

**Core logic**: the same asset trades at different prices on different platforms (e.g. coin A at 100 on Binance, 100.5 on OKX); buy on the cheaper platform, sell on the pricier one, and keep the spread.

| Item | Description |
|---|---|
| Profit | Spread − fees on both sides − withdrawal/transfer costs |
| Barrier | Funds + coins on both platforms |
| Risks | Spread snapping shut, withdrawal network congestion (Gas spikes), platform freezes |

### 2. Cash-and-Carry Arbitrage (spot + futures **<mark>hedge</mark>**)

**Core logic**: buy spot while selling an equal amount of futures/perpetuals, locking the **<mark>basis</mark>** (the gap between spot and contract prices). When the contract expires or **<mark>funding rate</mark>** payments settle, the spread converging means profit.

- **Key variable**: the perpetual's funding rate. When the funding rate is negative (market broadly bearish, shorts pay), the spot-long + contract-short combo earns both the basis and the funding.
- **Return profile**: single-digit to low-teens percent annualized, far less risky than one-sided trading.
- **Barrier**: requires understanding contract mechanics and funding rates — see [05-Crypto Perpetuals](../crypto-perpetuals/).

### 3. New-Listing Arbitrage (see market plays in the next section)

### Risk Points

- **Spread never converges**: arbitrage is not risk-free — on a platform with poor **<mark>liquidity</mark>** the spread can persist while you cannot exit.
- **Costs devour it**: fees, withdrawal fees, and FX gaps miscalculated turn profit into loss.
- **Stacked platform risk**: capital split across two platforms means doubled risk.
- **Basis risk in funding-rate arbitrage**: when spot falls and contracts rise, the hedged account can show unrealized losses on both legs (though overall exposure is small).

> ⚠️ Risk Warning: arbitrage is often packaged as "risk-free return"; in reality it is full of hidden costs and operational risk. Any project touting "30%+ annualized risk-free arbitrage" is almost certainly a Ponzi. Real arbitrage typically yields 3%-15% annualized; question anything beyond that.

---

## 6. Market-Specific Plays (New Listings, Airdrops, etc.)

### 1. New Listings (IPO/IEO Subscriptions)

- **A-share IPO subscription**: if allotted, buy at the issue price; a first-day premium is the norm — essentially "probability + luck" arbitrage. Requires held stock market value for allocation slots (starting from 10,000 CNY market value on each of Shanghai/Shenzhen).
- **HK/US IPO subscription**: cash/margin subscription; higher allotment rates but higher break price risk — blind subscription can lose money in a bear market.
- **Crypto launches (IDO/IEO)**: projects raise at first launch on an exchange or DEX; early prices are often hyped, but nine out of ten projects end at zero.

### 2. Airdrops

- Projects distribute free tokens for promotion; claiming usually requires "completing on-chain tasks" (trading, staking, bridging).
- **The play**: research sectors early (L2, modular, social protocols), batch through tasks, and wait for the official token generation event.
- **Returns**: single accounts have historically earned thousands to hundreds of thousands of dollars, but most airdrops are worth little.

### 3. Risks of New Listings/Airdrops

- **Huge opportunity cost**: funds locked in subscription/staking miss the market.
- **Sybil risk**: batch accounts flagged as bots (Sybil attack), disqualified outright.
- **Scam-riddled**: fake airdrop sites phishing, fake support stealing keys, fake IDOs absconding with funds — **real airdrops never require payment; any airdrop that asks for money is a scam**.
- **Break-and-zero**: new listings breaking on debut, or going to zero within an extremely short time.

> ⚠️ Risk Warning: new listings and airdrops are "high payout, low **<mark>win rate</mark>**" lottery-style plays. Keep the capital committed under 5% of total assets. Any "airdrop" that requires you to send funds, approve your wallet, or enter a seed phrase is 100% a scam.

---

## 7. Strategy Combinations and Summary

### Strategy Comparison Table

| Strategy | Return profile | Time commitment | Skill barrier | Risk level | Suitable market |
|---|---|---|---|---|---|
| DCA | Steady long term, averages cost | Minimal | None | Low | Long-term uptrend |
| Grid trading | Steady in ranges, misses bull runs | Medium (automatable) | Medium | Medium | Sideways range |
| Value investing | High long-term return, deep drawdowns | Low | Medium (fundamentals) | Medium | Late bear market |
| Swing trading | Mid-term spread, volatile | High | High | High | Trending market |
| Cross-exchange arbitrage | Low but steady | Low (needs ops) | Medium | Low | Any market |
| Cash-and-carry arbitrage | Low but steady | Medium | High | Low-Medium | Funding rate anomalies |
| New listings/airdrops | Lottery-style, occasional jackpots | Medium | Low | Medium-High | High bull-market sentiment |

### A Recommended Mix (Ordinary Salaried Investor)

```text
Core 60%: DCA into broad indices / major coins
Satellite 25%: value-invested single stocks or quality projects
Tactical 10%: grid or swing, to scratch the trading itch
Lottery 5%: new listings and airdrops — losing it all hurts nothing
```

> The point of a mix is not "earning more" but "never being wiped out of the game in any market". Survive first, then talk about making money.

::: tip 🛡 The point of a mix: survive first, then make money
**The point of a mix is not "earning more" but "never being wiped out of the game in any market".** Survive first, then make money — the core sleeve absorbs the chop, the satellite sleeve adds elasticity, the tactical sleeve scratches the itch, the lottery sleeve keeps the dream: each in its place.
:::

::: warning ⚠️ Risk Warning
Every strategy's returns come from risk exposure. When you find yourself thinking "this strategy is amazing, how is it always winning", you usually just have not lived through its losing cycle yet. Bind yourself with a "strategy checklist": ① Is the strategy logic written down? ② Is the maximum drawdown bearable? ③ Is per-trade risk ≤ 2% of total capital? ④ Is there a mechanical stop-loss rule? Only start trading live after all four answers are "yes".
:::


---

## Further Reading

- [01-Spot Trading Basics](spot-basics.md): order types and fee structures — required before putting any strategy into practice.
- [07-Trading System/02-Risk Management](../trading-system/risk-management.md): position management, stop-loss, and drawdown control.
- [03-Futures/02-**<mark>Margin</mark>**, Leverage and Liquidation](../futures/margin-leverage-liquidation.md): mandatory before cash-and-carry arbitrage — understand margin first.
- [06-Technical Analysis/README](../technical-analysis/): the technical foundation for swing trading.
