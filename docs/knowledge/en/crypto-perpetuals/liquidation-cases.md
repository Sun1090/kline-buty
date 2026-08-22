---
title: "Perpetual Blow-Up Case Studies"
description: "Three typical contract blow-up case studies — a 20x long hunted by a wick, a counter-trend bag-holder without a stop, and a long-term position crushed by funding rates — each with a full timeline and lessons"
---

# Perpetual Blow-Up Case Studies

> No amount of theory beats watching one real blow-up unfold. This article reconstructs three fictional but highly typical cases, from "confident entry" to "account at zero", with complete timelines. Each case flags **the key moments where a stop-loss could have saved the day**.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution. The cases below are fictional teaching examples; the numbers only illustrate the calculations.

---

## Case 1: 20x Long Chasing a Rally, Taken Out by a Wick

### Background

Xiao Li watches BTC surge from 95,000 to 100,000 and concludes "breakout confirmed, next stop 110,000". He goes long with 20x leverage.

### Timeline

```text
14:00  BTC at 100,000
       Xiao Li opens a 100,000 USDT long with 5,000 USDT margin (20x)
       Liquidation price ≈ 95,250 (−4.75% away)
       No stop set: "I'm confident, I don't need one"

14:15  BTC rises to 101,200 (+1.2%)
       Floating profit = 12,000 USDT (+240% of margin)
       Xiao Li: "See, I told you it'd rise" → adds 50% to the position

15:30  BTC pulls back to 99,500
       Floating profit shrinks to +7,500 → Xiao Li shrugs it off

16:00  A large sell order smashes through support
       BTC drops from 99,500 to 94,800 in 3 minutes (−4.7%)

16:01  Liquidation triggers
       Post-add total position 150,000 USDT / margin 7,500
       Liquidation price ≈ 96,000 (even closer after adding)
       All margin gone: −7,500 USDT
```

### Key-Moment Analysis

| Time | What happened | What could have been done |
|---|---|---|
| 14:00 | No stop set at entry | Set the stop at 97,000 (−3%); maximum loss 3,000 |
| 14:15 | Added size at +240% floating profit | Should have taken partial profit instead of adding |
| 15:30 | No alarm at the pullback | Profit shrinking from 12,000 to 7,500 was already a clear signal |

::: danger ⚠️ Lessons
1. **Chasing a rally means a naturally high entry price** — your liquidation price sits close to market
2. **Floating profit is not your money** — until you close, it is just a number on screen
3. **Adding size pulls the liquidation price closer** — the bigger the position, the less room for error
4. **No stop-loss = handing your fate to the market**
:::

---

## Case 2: Counter-Trend Bag-Holding Without a Stop

### Background

Lao Wang believes BTC "has fallen enough" and opens a 10x long at 80,000.

### Timeline

```text
Day 1   BTC 80,000 → Lao Wang goes long, margin 8,000, position 80,000
        Liquidation price ≈ 72,400

Day 3   BTC drops to 76,000 (−5%)
        Floating loss = 4,000 (−50% of margin)
        Lao Wang: "Just a shakeout, hold on"

Day 5   BTC drops to 73,000 (−8.75%)
        Floating loss = 7,000 (−87.5%)
        Lao Wang: "It's about to bounce" (anxious now, but refuses to concede)

Day 6   BTC drops to 72,300
        Closing in on the 72,400 liquidation price
        Lao Wang considers adding margin → but has no spare funds

Day 6 afternoon  BTC touches 72,350
        Liquidation triggers → margin gone: −8,000 USDT

Day 9   BTC bounces to 78,000
        Had Lao Wang not been liquidated, he would be down only 2,000 (−25%)
        But he is already out of the game
```

### Key-Moment Analysis

| Time | What happened | What could have been done |
|---|---|---|
| Day 1 | No stop set at entry | Stop at 77,600 (−3%); maximum loss 2,400 |
| Day 3 | Still no action at −50% | At least halve the position or add a stop line |
| Day 5 | −87.5%, near liquidation | Closing here still preserves 1,000 (12.5%) |

![Counter-trend bag-holding: the timeline from floating loss to liquidation](_assets/liquidation-timeline.svg)

::: danger ⚠️ Lessons
1. **"Hold on" is not a strategy, it is an emotion** — the market does not care about your cost basis
2. **Counter-trend trades demand tighter stops** — you are fighting the trend
3. **A bounce after your liquidation is not yours** — you were forced out and hold no chips
4. **"It's about to bounce" is the most expensive phrase in trading**
:::

---

## Case 3: Funding Rates Bleeding Out a Long-Term Hold

### Background

Xiao Zhang is bullish on ETH long-term, goes long with 5x leverage, and plans to hold for a month. He ignores the compounding effect of funding rates.

### Timeline

```text
Day 0   ETH at 3,000, Xiao Zhang goes long
        Margin 6,000, position 30,000 (5x)
        Funding rate: 0.05% every 8 hours (longs pay shorts)

Day 0-30  ETH ranges sideways between 2,900 and 3,100
          Xiao Zhang figures "flat means no loss"

Daily funding cost:
  30,000 × 0.05% × 3 times/day = 45 USDT/day
  30 days cumulative = 1,350 USDT

Day 30  ETH closes at 3,050 (+1.67%)
        Price gain = 30,000 × 1.67% = 500 USDT
        Funding paid = −1,350 USDT
        Net P&L = 500 - 1,350 = **−850 USDT**

        ETH went up, yet Xiao Zhang lost 850 USDT (−14.2% of margin)
```

### Cost Breakdown

| Item | Amount | Share of margin |
|---|---|---|
| Price gain | +500 | +8.3% |
| Entry + exit fees (Taker) | −30 | −0.5% |
| Funding (30 days) | **−1,350** | **−22.5%** |
| **Net P&L** | **−850** | **−14.2%** |

::: warning ⚠️ Lessons
1. **You can lose money even when right on direction** — holding costs can eat the entire profit
2. **Being long during positive funding = working for the shorts for free**
3. **Long-term holds belong in spot, not high-rate contracts**
4. **Before opening: does the expected move cover the total holding cost?**
:::

---

## What All Three Cases Share

| Common mistake | Cases | Consequence |
|---|---|---|
| No stop-loss | 1, 2, 3 | Maximum loss uncontrolled |
| Liquidation price not computed at entry | 1, 2 | No idea where they'd be forced out |
| Holding costs ignored | 3 | Lost despite a correct call |
| Emotion-driven decisions | 1, 2 | Chasing rallies, bag-holding, refusing to admit error |
| Oversized positions | 1, 2 | Too little room for error |

---

## Self-Check: Run Through Before Every Order

- [ ] Where is my liquidation price? How far from entry?
- [ ] Did I set a stop-loss? How much buffer between the stop and the liquidation price?
- [ ] What is the total holding cost of this trade? (Fees + funding rate × expected days held)
- [ ] If I'm wrong, what is my maximum loss? Can I accept that amount?
- [ ] Am I executing a trading plan, or chasing the market?

::: warning ⚠️ Risk Warning
The cases above are fictional teaching examples; any resemblance to real events is coincidental. Contract trading can result in the loss of your entire principal and even debt to the exchange. Fully understand the risks before participating.
:::
