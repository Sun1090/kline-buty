---
title: "05 · Exchange Business Models"
description: "How exchanges, brokers, data vendors, and market makers make money — see the interest structure of financial infrastructure clearly."
---

# 05 · Exchange Business Models

> Exchanges have an unwritten rule they'd rather not state aloud: **<mark>they don't care whether you make money — only whether you trade.</mark>** Every additional trade means another fee. Grasp that, and you can see through the motives behind every "thoughtful" platform design.
>
> This article dissects how exchanges, **<mark>brokers</mark>**, data vendors, and **<mark>market makers</mark>** earn, exposing the interest structure of financial infrastructure — **<mark>read the platform's ledger and the platform can't harvest you</mark>**.

> **⚠️ Risk Warning**
>
> Descriptions of exchange/broker business models here are based on public rules and industry practice; specific fees and policies are subject to the latest regulations and each institution's official announcements. References to "free stock-tipping groups" and similar monetization schemes are risk education only; be wary of any platform demanding deposits into private accounts. Markets carry risk; invest with caution; nothing here constitutes investment advice.

---

## How Exchanges Make Money: Six Revenue Streams

| Revenue Stream | Description | Typical Examples |
|---|---|---|
| Trading commissions | A cut of every fill — the core income | All exchanges |
| Listing fees | Fees for IPOs and token listings | Exchanges / token listings |
| Data services | Quotes, Level-2, historical data subscriptions | SSE/SZSE/crypto exchanges |
| Technology services | Matching engines, clearing, software licensing | CME, SHFE technology subsidiaries |
| Interest on client funds | Interest on client **margin**/custodied assets | Brokers, futures firms, crypto exchanges |
| Value-added services | Listing advisory, investor education, margin financing | Exchange subsidiaries, brokers |

**<mark>Common logic: the more trading activity, the more exchanges earn.</mark>** So every platform "optimization" — faster matching, lower latency, more products, juicier promotions — is at bottom "raising your trade frequency."

---

## Securities vs Futures Exchanges: Regulatory Nature vs Commercial Nature

### Chinese Stock Exchanges: Primarily Regulatory

- Positioning: **public institutions not primarily profit-seeking**; revenue funds market infrastructure and regulation.
- Duties: reviewing listings, setting rules, supervising members (brokers), maintaining orderly trading — a "referee" role.
- Revenue: mainly transaction fees and listed-company charges at very low rates (fees typically a few hundredths of one percent).

### Futures Exchanges: More Commercial

| Item | Stock Exchanges | SHFE/DCE/CZCE/CFFEX |
|---|---|---|
| Nature | Member-based public institutions | Member-based, likewise non-profit |
| Core revenue | Transaction fees + listing fees | Commissions + settlement fees + margin interest |
| Who trades | Retail-heavy | Institutional and industrial clients dominate |
| **<mark>Leverage</mark>** | None (spot) | Yes (margin system) |
| Regulator | CSRC | CSRC + own charters |

::: info 📖 Onshore vs Offshore Exchange Structures
Note: all mainland Chinese exchanges are non-profit member institutions — fundamentally different from purely commercial platforms. But **<mark>the world's top exchanges (CME, HKEX, LSEG, NYSE parent ICE) are all listed companies</mark>** whose shareholders demand profit growth — directly shaping their product innovation and pricing strategies.
:::

---

## Crypto Exchange Business Models

### Revenue Breakdown

| Revenue Stream | Mechanism | Why It Pays |
|---|---|---|
| Spot/perp commissions | 0.01%–0.1% per fill | Leverage multiplies volume; fees snowball |
| Listing fees | Projects pay millions to tens of millions USD | Tokens must "buy tickets" to list on majors |
| Maker rebates (negative fees) | Subsidies to market-maker orders | Buying **liquidity** to attract more traders |
| **<mark>Funding rates</mark>** & **<mark>liquidations</mark>** | Perp funding, forced-**<mark>liquidation</mark>** fees | More volatility = more liquidations = steadier income |
| Client-fund float | Custody, savings, staking products | Lending out user assets for interest |
| Data & APIs | Professional APIs, quote subscriptions | Another revenue line from quant clients |

### Why Exchanges Want You Trading

- **<mark>Revenue scales with volume</mark>**: everything a platform builds — perps, 100x leverage, deposit bonuses, referral rebates — raises your trade frequency.
- **<mark>Leverage is the exchange's best friend</mark>**: 100x leverage = you trade 100x more in a day = the platform collects 100 rounds of fees; liquidation fees flow back to it too.
- Wick-hunt and outage controversies (see [08-Pitfalls](../pitfalls/)) persist precisely because of the **structural conflict of interest between platform and user**: your losses are its gains.

::: danger 💀 The Platform-User Conflict of Interest Is Structural: Your Losses Are Its Gains
**Platform and user sit in natural opposition: your losses are its revenue.** Wick hunts and outage disputes persist by no coincidence — perps, 100x leverage, deposit bonuses, referral rebates: every design raises your trading frequency. Your losses ARE its revenue.
:::

### Implications for You

- Invert "what the platform wants": if it wants frequent trading, you should trade less and hold longer.
- Perp commissions plus **<mark>funding payments</mark>** are a certain negative-expectation drag over time — **<mark>high-frequency traders work for the platform</mark>**.
- Withdrawals, cold wallets, self-custody are the last line of defense against platform misbehavior.

---

## How Brokers Earn

| Revenue Stream | Description | Audience |
|---|---|---|
| Trading commissions | Traditional commissions competed down toward zero (online brokers) | Retail |
| Interest spread (idle cash) | Gap between interest earned on client cash and paid out | All clients |
| Margin financing interest | Lending you money to trade, 6%–8%+ annually | Leveraged retail |
| Index futures/options business | Fees and spreads on high-leverage products | Institutions and active retail |
| Selling data/software | Level-2, premium content, quant interfaces | Paying users |
| Investment banking/AM share | IPO underwriting, distribution of managed products | Institutions/large accounts |

**<mark>The delicate broker–exchange relationship</mark>**: brokers open accounts and route orders (the pipe); exchanges charge brokers transaction fees; brokers charge clients commissions. The more numerous and active retail is, the more everyone in the chain earns — except the frequent trader's own account.

---

## The Market Data Business: Level-1 / Level-2 and Wind/Bloomberg

### Tiers of Market Data

| Tier | Content | Pricing |
|---|---|---|
| Level-1 | Last price, best bid/ask, trade tape | Basically free (retail) |
| Level-2 | Ten-level depth, order-by-order queue | Exchanges charge institutions; brokers resell |
| Deep data | Option Greeks, dark-pool prints, timestamped books | Expensive institutional subscriptions |
| Historical data | Minute bars, ticks, high-frequency data | Volume/yearly subscriptions |

### Wind / Bloomberg Business Models

- **Wind**: China's dominant financial terminal, standard equipment for institutions, from tens of thousands of yuan yearly; selling "data curation + tools + compliant presentation."
- **Bloomberg**: global financial-information giant, terminals $24,000+/year, also running news and trading systems (the terminal itself is the moat).
- The essence: **<mark>packaging free or semi-public data into paid products that "save time."</mark>** Individuals rarely need them — free sources (exchange websites, Eastmoney/Tonghuashun, TradingView) already cover 90% of needs.

### Implications for You

- Expensive data won't make you win: **<mark>most people lack interpretation ability, not data</mark>**.
- Spend your budget building "the ability to read raw data" (see [04-The Information Ecosystem](information-ecosystem.md)) — worth more than any premium terminal.

---

## Maker Rebates and "Traffic Monetization"

- Maker rebates: crypto and options venues subsidize maker orders (rebates, even negative fees) — essentially **<mark>platforms paying for liquidity</mark>**, recouped through higher volume.
- The rebate chain: exchange subsidizes market makers → makers provide depth → trader **<mark>slippage</mark>** shrinks → traders trade more → exchanges earn more.
- The retail angle: some exchanges rebate **maker-order users** — but first ask whether rebate income covers your directional losses from constant quoting.

**The full map of "traffic monetization"**:

```text
Retail capital → commissions → exchanges/brokers
        ↘ slippage → market makers
        ↘ content/community → influencers/media
        ↘ paid courses/tipping → the supply chain
```

**<mark>The entire supply chain feeds on retail's "activity level"; only your account feeds on "correct decisions."</mark>**

---

## The Competitive Landscape

### Positioning of Major Global Venues

| Exchange | Positioning | Notes |
|---|---|---|
| CME | Global futures/derivatives leader | US-listed; equity index/commodity/crypto futures |
| LME | Industrial metals pricing hub | Global benchmark for copper, zinc, nickel |
| NYSE/NASDAQ | US spot equities leaders | Listed companies; hubs for tech/growth stocks |
| SSE/SZSE | A-share spot + STAR/b ChiNext boards | Non-profit public institutions |
| SHFE/DCE/CZCE/CFFEX | Commodity/financial futures | Member-based, non-profit |
| HKEX | Gateway to Chinese assets | HK spot + derivatives |
| Crypto big three | Binance / OKX / Bybit | Spot + perpetuals, 24/7 |

### Competition Among the Crypto Big Three

- What they compete on: **fees, depth, listing speed, security and compliance**.
- Fee compression: spot 0.1% → 0.08% → 0.06%, maker rebates on perps — platforms sacrifice per-trade revenue for total volume.
- Compliance divergence: some pursue licenses (US, EU MiCA, Hong Kong VASP); others stay offshore.
- Outcome: liquidity pools at the top; **<mark>small platforms suffer poor liquidity and elevated blow-up risk</mark>** (see exit-scam history in [08-Pitfalls](../pitfalls/)).

---

## "Free Things": Why Quote Software Is Free

### The Logic of Free Quote Apps

| Reason It's Free | Business Behind It |
|---|---|
| Aggregating traffic | Free apps draw tens of millions of users — an advertising vehicle |
| Selling premium | Paid tiers (Level-2, screeners, AI picks) |
| Broker funnels | Account-opening rebates, trading referrals |
| Data monetization | Behavioral data, position profiles (where compliance allows) |
| Ecosystem play | Feeding traffic to a parent broker/exchange group |

**<mark>Remember: you are the product, not the customer</mark>** — free quote software sells "you," the paid tier sells "your attention," and tipping groups sell "your principal."

::: danger 💀 The Fee Structure IS the Platform's Motive
**The fee structure is the platform's motive.** Whenever you see the platform "encouraging you to do something," translate "how does this benefit the platform?" before deciding. Everything in crypto venues — perps, 100x leverage, deposit bonuses, referral rebates — raises your trading frequency. The whole chain feeds on retail's activity level; only your account feeds on correct decisions.
:::

---

## Implications for You: A Platform-Motive Checklist

| Platform Behavior | Real Motive | Your Response |
|---|---|---|
| Pushing high-frequency trading/perp promos | Commission harvest | Lower frequency; beware leverage |
| Free trial credits/rebates | User acquisition and activation | Experiment with "tuition money" only; never add principal |
| Hard-selling courses/tipping groups | Traffic monetization | Just refuse |
| Listing floods of small tokens | Listing fees + gambling commissions | Trade majors only |
| Upselling Level-2/smart screeners | Subscription revenue | Validate the need with free data first |
| "VIP lanes"/priority fills | Differential pricing | Only worth it for large capital; ignore as retail |

**<mark>One sentence: the fee structure is the platform's motive.</mark>** When the platform "encourages" something, translate how it benefits them first.

---

## Summary

```text
The exchange's ledger:
  Revenue = commissions × volume + listings/data/tech services + interest on client funds
        └─ so the platform always wants you to: trade more, lever up, play perps

Your ledger:
  Revenue = ( win rate × payoff ratio − commissions − slippage − funding ) × position size
        └─ so you should: trade less, use low leverage, control costs

The conflict between these two ledgers is the true relationship between you and the platform.
```

**<mark>Understanding how platforms make money is your last free course in anti-harvesting.</mark>**

---

::: warning ⚠️ Risk Warning
Fee rates, revenue structures, and platform policies described here are teaching summaries of public information; verify specifics against each institution's latest official announcements before trading — subject to the latest regulations. Beware every funnel branded "free picks," "guaranteed profits," or "insider slots" — such "free" ends at your principal (see [08-Pitfalls](../pitfalls/scam-detection.md)). Avoid unlicensed platforms that block withdrawals; prefer regulated, licensed institutions for large capital. Markets carry risk; invest with caution; nothing here constitutes investment advice.
:::
