---
title: "02 · Market Makers & Liquidity"
description: "A deep dive into market-maker mechanics and the liquidity system — understand your true trading costs and where slippage comes from."
---

# 02 · Market Makers & Liquidity

> You've heard it said: "There's always a **<mark>counterparty</mark>** on the other side of the screen." That confidence comes from market makers and the whole liquidity system. A market without liquidity is a swimming pool with no water — jumping in is easy; climbing out is another matter.
>
> This article covers two things thoroughly: **who provides your liquidity (market makers), and how liquidity quality determines your true cost of execution (**<mark>slippage</mark>**)**.

> **⚠️ Risk Warning**
>
> Descriptions of market-making mechanics, liquidity metrics, and historical events here are teaching generalizations. Past crashes do not guarantee similar future events, and liquidity can deteriorate sharply at any time as conditions change. All figures are illustrative, not real-time levels for any instrument. Markets carry risk; invest with caution; nothing here constitutes investment advice.

---

## What Is a Market Maker

A **<mark>market maker</mark>** is a professional trader who **continuously provides two-sided quotes** (simultaneously posting a bid and an ask), usually licensed by exchanges with incentives such as fee rebates.

```text
The market maker posts both sides:
  bid (buy price)   ask (sell price)
   ──────────────┬──────────────
    buys what you sell    sells what you buy

You sell at market → filled at bid → market maker buys
You buy at market  → filled at ask → market maker sells
The spread is the market maker's gross margin
```

### Quoting Obligations

- Market makers commit to **maintaining both buy and sell quotes** through most of the session (minimum quoting time, minimum order size, and non-cancellation ratios are set by exchange rules).
- In return, exchanges grant makers **reduced fees or even rebates** — every dollar a market maker earns is essentially a liquidity subsidy from the platform plus the bid-ask **<mark>spread</mark>**.

### Earning the Bid-Ask Spread

- Spread = ask − bid. For example, if BTC is quoted at 60,000.1 / 60,000.2, the spread is $0.10.
- The goal is "buy low, sell high, turn fast": tiny per-trade margins (0.01%–0.05%) multiplied by volume.
- Higher volume and lower volatility make earnings steadier — so **market makers naturally love quiet markets**.

### Inventory Management

- Market makers accumulate inventory (buying more than selling = long inventory; the reverse = short inventory).
- Bigger inventory means bigger risk: if price falls after buying, the inventory loses immediately.
- So market makers are always **<mark>hedging</mark>**: taking offsetting positions in futures/options and dynamically adjusting quotes to bring inventory back to neutral.

---

## How Market Makers Profit — and Lose

### Revenue Model

| Income Source | Description |
|---|---|
| Bid-ask spread | Earned on each two-sided fill |
| Fee rebates | Exchange incentives for posting orders (maker rebates) |
| Micro-profit on order flow | Reading microstructure to anticipate short-term direction and adjust quotes |
| Market-making rebate programs | Platforms pay back fees by quoting time/volume (common in crypto) |

### How They Lose

| Loss Source | Mechanism | Example |
|---|---|---|
| Inventory risk | Wrong-way inventory moves against them | Adverse news hits right after buying; inventory is trapped |
| Being "squeezed" | Big money deliberately lifts offers; maker forced to **<mark>stop out</mark>** | Pool operator keeps buying; maker's short inventory gets **<mark>liquidated</mark>** |
| Information asymmetry | Counterparty knows news the maker doesn't and reprices first | Makers still quoting old prices just before earnings/regulatory news |
| Sudden volatility | Shock events gap prices instantly beyond quote ranges | Black-swan events; fills far outside quoted levels |
| Withdrawal runs | Liquidity evaporates; inventory can't be unwound | In crashes, makers want to sell but find no buyers |

::: tip 💡 Key Insight: Market Makers Are Risk Merchants, Not Philanthropists
**<mark>Key insight: market makers are not charitable "market stabilizers" — they are risk merchants.</mark>** When risk-reward turns lopsided, they withdraw without hesitation — exactly why bids vanish during big drops.
:::

---

## Market Makers' Effect on Price: Volatility Absorber vs Amplifier

### Normal Markets: Volatility Absorber

- With orders resting on both sides, market makers naturally "catch" retail's chase-and-dump flow:
  - Someone panic sells → filled at the bid, price stabilizes;
  - Someone FOMO buys → filled at the ask, pressure eases.
- Effect: **short-term volatility is smoothed**, keeping prices closer to "fair value." That is liquidity's value — you can enter or exit at any moment near the market price.

### Extreme Markets: Volatility Amplifier

- When price trends hard one way, maker inventory goes rapidly long/short and risk exposure spirals → widening spreads loses fills, tightening spreads loses money. Ultimately they choose:
  1. Massively widen spreads (bids far below, asks far above);
  2. Cut quoted size;
  3. **Pull bids entirely, leaving only asks (or pull everything)**.
- Result: bids vanish → sellers fill ever lower → price accelerates down → triggering more **stop-losses** → **<mark>a self-reinforcing decline</mark>**.

::: danger 💀 In Extreme Markets Makers Pull Their Bids, Triggering Self-Reinforcing Declines
**In extreme markets, market makers pull their bid side outright, leaving only asks (or withdrawing everything).** Bids vanish in seconds → sellers fill ever lower → price accelerates down → more stops trigger → the fall feeds itself. Makers are not philanthropists but risk merchants — when risk-reward breaks, they leave at once.
:::

### Why Bids Vanish During Crashes

```text
Panic selling → maker short-inventory piles up fast → inventory risk maxes out
   ↓
Makers cancel bids / only quote bids far below market
   ↓
Market sells hit an ever-thinner book, slicing straight through levels
   ↓
Price waterfall → leveraged stop-outs fire → more selling (negative feedback)
```

- Crypto's "**<mark>wick hunts</mark>**" (flash crashes far below fair value followed by recovery) mostly originate here: bids drained within moments, price slicing below everyone's psychological level.
- Both March 12, 2020 ("312") and the May 2022 Luna collapse showed textbook "vanishing bids" — see "Liquidity Black Holes" below.

---

## What Liquidity Is: Depth / Width / Resilience

| Element | Meaning | Plain Language |
|---|---|---|
| Depth | Cumulative order volume around current price | "How thick is the book" — how large an order it absorbs without moving price |
| Width | Size of the bid-ask spread | "How wide is the gap" — tighter spreads mean cheaper entry/exit |
| Resilience | How quickly price recovers after a large-order shock | "After you pierce the water surface, does it close back up?" |

```text
                 Width (small spread = good)
         ┌────────────────────────┐
  Ask wall  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← Depth (thick book = good)
         └────────────────────────┘
         ↑ If price snaps back quickly after a large buy → resilient
```

**A liquid instrument** is deep (absorbs big capital), narrow (tight spread), and resilient (recovers quickly after being pierced).

---

## Liquidity and Slippage: What $10,000 Buys You

Slippage = actual fill price − expected fill price. **<mark>The worse the liquidity, the bigger the slippage.</mark>**

### Worked Example: A $10,000 Market Order

Assume BTC trades at $60,000 with ideal book depth:

| Instrument | Book Condition | $10k Market Buy | Slippage |
|---|---|---|---|
| BTC (major) | $0.1 spread, 10–50 BTC per level | Fill ≈ 60,000.2 | ≈ 0.0003% (~$2) |
| Major altcoin | 0.5% spread, tens of thousands USD per level | Fill 0.1%–0.3% higher | $10–30 |
| Obscure small cap | 2%–5% spread, sparse book | Fill 1%–5% higher, sometimes slicing multiple levels | $100–500+ |
| Low-liquidity futures | Thin book, few counterparties | Fill 0.5%–2% higher | $50–200+ |

**<mark>Conclusion: the same $10,000 might slip under $1 in BTC but eat hundreds of dollars in small caps — a round trip costing 1%–10%.</mark>** Trivial for small accounts, fatal for large capital and frequent traders.

### Slippage vs Commissions

- Most beginners watch commissions and ignore slippage. In practice: **for high-frequency or large trades, slippage often dwarfs fees**.
- **<mark>Market orders</mark>** have uncontrolled slippage; **<mark>limit orders</mark>** have none (but may not fill) — that's the essence of the market-vs-limit choice.

---

## The Liquidity Trap: Hard to Get Out

A "liquidity trap" describes instruments you can apparently trade but where real capital cannot easily exit:

| Scenario | Symptom |
|---|---|
| Small caps / junk tokens | Easy to buy, impossible to sell; any decent sell order craters the book |
| Small-cap stocks | A few million daily turnover; buying 1% pins the limit-up, no buyers when you flee |
| Low-volume futures | Far-month contracts near delivery have paper-thin books |
| Halts / limit locks | One-way limit-up: can't buy; one-way limit-down: can't sell |
| Wick hunts in extremes | Stops execute at extreme prices inside a liquidity vacuum |

**Classic disaster**: an altcoin does $3M daily volume; you buy $50k (1.7% of daily volume). When you try to sell, total visible bids are only $20k — your order slams price from 1.0 to 0.9, turning "paper profit" into "real loss."

### How to Avoid Liquidity Traps

- Only trade instruments meeting **average daily turnover / turnover-ratio** thresholds (major crypto; A-share names trading above ¥100 million/day).
- Slice large orders, use limits, scale in and out; if you need cash urgently, trade during the most liquid hours.
- Avoid mini-tokens "up 100% today" — their liquidity is often fake book depth posted by the operator themselves.

---

## "Liquidity Black Holes": When Bids Vanish Instantly

A **<mark>liquidity black hole</mark>** is what happens in extreme markets when **bid and ask sides both disappear within moments**; price loses support and gaps down like a waterfall.

### March 12, 2020 (Crypto's "312")

- Backdrop: global COVID panic, repeated US circuit breakers, crypto collapsing alongside.
- Process: BTC fell from ~$8,000 to below $4,000 in a day; **spot and futures books were drained of bids almost completely**, futures saw cascading liquidations, and platforms including Binance suffered brief outages.
- Aftermath: several exchanges were accused of "pulling the plug" or deliberately amplifying **<mark>leverage</mark>** liquidations during the crash — recurring regulatory and community controversy (see [08-Pitfalls](../pitfalls/), platform risks).

### May 2022 Luna Collapse

- Backdrop: Terra's UST (algorithmic stablecoin) lost its peg; LUNA supply hyperinflated.
- Process: UST depegs → panic selling → LUNA fell from $80 to **<mark>zero</mark>**; DeFi lending **liquidations exploded in chains, and LUNA/UST books on centralized exchanges went to zero bids instantly**.
- Lesson: in a stablecoin depeg or algorithmic "death spiral," liquidity simply does not exist — by the time you want to "buy the dip," the bids are long gone.

### March 2020 US "Circuit-Breaker Week"

- Circuit breakers fired day after day; bids vanished simultaneously across ETFs, stocks, bonds, and gold — even "safe havens" fell, because everyone was selling assets for cash.

---

## Implications for Your Trading

### Choose Instruments and Hours Wisely

| Dimension | Advice |
|---|---|
| Instrument | Prefer majors (BTC/ETH, CSI 300 constituents, active contracts); avoid mini-tokens and penny stocks |
| Timing | Avoid extremes and overnight gaps; in 24-hour crypto, Asia-Europe handoffs and major data releases are volatile |
| Direction | Liquidity is best trading with the trend; bottom-fishing against it often buys into "no bids" phases |

### Market Orders vs Limit Orders

| Order Type | Pros | Cons | Best For |
|---|---|---|---|
| Market order | Guaranteed fill, fast | Uncontrolled slippage; wick-hunted in thin books | Liquid majors, small **positions** |
| Limit order | No slippage, controlled cost | May not fill; may miss big moves | Large positions, illiquid instruments, ranges |

**Practical combo**: split large positions across 3–5 limit orders; use market orders for stops (better to pay slippage than miss the exit); in violent markets place limits where they'll "obviously fill," not glued to the touch.

### Three "Check Liquidity First" Questions

1. Is this instrument's average daily turnover enough for my planned position to enter and exit smoothly?
2. How many book levels will my order slice through? (Open the depth view and check sizes from best bid/ask through level five.)
3. If the market reverses suddenly, will my stop fill at a reasonable price?

---

## Summary

```text
Liquidity = your hidden trading cost
  ├─ Depth: can the book absorb your order?
  ├─ Width: what does the spread cost you?
  └─ Resilience: does price recover after being pierced?

Market maker = liquidity provider, and also a risk merchant
  ├─ Normal times: absorbs volatility so you come and go freely
  └─ Extremes: pulls orders to survive → bids vanish → liquidity black hole
```

**Remember one sentence: never go heavy where there is no liquidity.** Before liquidity determines how much you can make, it determines whether you can get out.

::: danger 💀 Never Go Heavy Where There Is No Liquidity
**Never take heavy positions where there is no liquidity.** Before liquidity decides how much you can earn, it decides whether you can get out. Market makers are not philanthropic "market stabilizers" but risk merchants — once risk-reward turns lopsided they withdraw instantly, which is exactly why bids vanish during crashes.
:::

---

::: warning ⚠️ Risk Warning
All prices, book depths, and slippage figures here are illustrative teaching data; real levels vary enormously across exchanges and sessions. Historical crashes ("312," Luna, circuit-breaker week) need not repeat, but "liquidity can vanish in an instant" is a standing risk in every market. Leveraged positions in illiquid instruments can be blown through stops or liquidated within minutes by extreme prints. Markets carry risk; invest with caution; nothing here constitutes investment advice.
:::
