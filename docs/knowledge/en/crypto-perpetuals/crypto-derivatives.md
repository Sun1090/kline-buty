---
title: "Crypto Derivatives"
description: "The crypto derivatives zoo — how crypto options, leveraged tokens, dual investment, tokenized synthetic assets, on-chain contracts, and other products work, how to play them, and where the risks are"
---

# Crypto Derivatives

> Beyond perpetual swaps, the crypto market runs an entire "derivatives zoo": options, **<mark>leveraged</mark>** tokens, dual investment, tokenized synthetic assets, on-chain contracts...
> Some of these products hedge risk; others are harvesting tools that "look beautiful". This article dissects them one by one: **what they are, how they are played, and where the risks lie.**

> ⚠️ **Risk Warning: none of the products in this article are "deposits".**
> Crypto derivatives share common traits: complex payoff structures, uneven liquidity, and ever-changing platform rules — many products carry far more real risk than the advertised yield on the page.
> All terms follow the latest product documentation of Binance, OKX, and other platforms; this article covers general principles only.

---

## Crypto Options

### What They Are

An option = paying money to buy "the right to choose". Crypto options on mainstream exchanges (Binance, OKX, Deribit) are almost all **European-style**: exercisable only on the expiry day, unlike American-style options which can be exercised anytime.

| Type | Buyer (right holder) | Seller (obligation holder) |
|---|---|---|
| **Call** | At expiry, the right to buy BTC at the agreed price | If assigned, must sell BTC at the agreed price |
| **Put** | At expiry, the right to sell BTC at the agreed price | If assigned, must buy BTC at the agreed price |

- **Strike price**: the pre-agreed buy/sell price;
- **Premium**: the fee the buyer pays the seller;
- Expiry: usually many tenors — 5 minutes, 15 minutes, 1 hour, 1 day, 1 week (per the exchange).

### How They Are Played

| Play | Action | Logic |
|---|---|---|
| Buy a Call to speculate on a rise | Buy a Call struck slightly above spot | Small premium bets on a big rally; wrong means losing only the premium |
| Buy a Put to speculate on a fall / hedge | Hold spot and buy a Put | The Put gains when price falls, hedging the spot loss (**insurance**) |
| Sell a Call to collect premium | Hold spot, sell a Call (covered) | The spot may be called away, but you collect the premium upfront |
| Sell a Put to collect premium | Keep funds ready, sell a Put | If price falls you are forced to buy the dip, but you collect the premium upfront |

### Risk Points

- **Buyers**: maximum loss = the premium (bounded) — the most beginner-friendly feature of options;
- **Sellers**: maximum loss is **theoretically unlimited** (selling Calls into a moonshot), and they must post **<mark>margin</mark>** and can be **<mark>liquidated</mark>**;
- **Time decay**: option value "shrinks" every day — get the direction right but not fast enough or far enough, and you still lose;
- **Poor liquidity**: small-coin options have wide spreads and severe **<mark>slippage</mark>**;
- **Complex exercise rules**: European options settle automatically at expiry; near-expiry "lottery tickets" get violently volatile.

> ⚠️ **Risk Warning: options are the product that "looks simple and hurts the most".**
> "Maximum loss is the premium" is true, but statistically **most options expire worthless**, so buyers start with a low win rate.
> Sellers win often, but one extreme market can erase ten years of gains. Without systematically studying option pricing (**implied volatility**, the Greeks), limit yourself to "small notional Call/Put buying".

---

## Leveraged Tokens

### What They Are

Leveraged tokens trade on the spot market and target a fixed multiple (e.g. 3x, -3x) of the underlying's daily (or multi-hour) move:

- Binance: BTCUP / BTCDOWN (3x), ETHUP / ETHDOWN, etc.;
- OKX: the 3L / 3S series (e.g. BTC3L, BTC3S);
- Professional teams rebalance them dynamically via "spot + perpetual swap"; buying the token indirectly holds a leveraged position — no margin, no liquidation.

### How They Are Played

- Buy and sell directly in the spot market like any regular token;
- Suited for: **short-to-medium-term holds in a clear one-sided trend** (e.g. buying 3L in a confirmed uptrend);
- They provide a shorting tool: BTCDOWN / 3S let retail traders "go short" without opening contracts.

### Risk Point: Volatility Decay

This is the biggest trap of leveraged tokens: **they suit short-term trades, not long-term holds.** The **compounding** math guarantees they "bleed you slowly" in choppy markets:

```text
Suppose the underlying (e.g. BTC) rises +10% on day 1 and falls −10% on day 2 (back to start):
Underlying price: 100 → 110 → 99 (still −1% after two days)

3x leveraged token NAV (daily rebalancing): 1.00 → 1.30 → 1.30 × (1 − 30%) = 0.91
Result: the underlying barely moved, yet the 3x token lost 9%!
```

| Market type | Leveraged token behavior |
|---|---|
| One-sided up/down | Performs as expected (close to 3x) |
| Choppy sideways | **Continuous decay**; the longer it chops, the more you lose |
| Up then down / down then up | Double erosion; NAV significantly underperforms |

### Risk Checklist

| Risk | Description |
|---|---|
| Volatility decay | Long-term holds in choppy markets are near-certain losses; **not for DCA/buy-and-hold** |
| Rebalancing timing | Daily rebalancing may trade at unfavorable intraday prices, amplifying tracking error |
| Fee drag | Rebalancing fees and funding are all deducted from the token NAV |
| Premium/discount | The token's market price can drift persistently from NAV; mind the premium when trading |
| Stealthier than margin | No liquidation line breeds complacency, yet real losses can still reach 90%+ |

> ⚠️ **Risk Warning: leveraged token documentation never says "long-term holding decays".**
> Since 2021, countless "bought BTCDOWN/3S in a bull market and got stuck for half a year" stories share one root cause: **leveraged tokens are intraday tools, not holding tools.**
> Hold for more than a few days and re-ask yourself: does your one-sided assumption still hold?

---

## Dual Investment

### What It Is

Dual Investment (Dual Currency Investment) is a structured product on Binance and other exchanges: **you deposit one currency, and returns are settled in "coin" or "USDT" depending on where the price sits at expiry.**

It is essentially "a **limit order + selling an option for premium**" bundled together, with the complex option terms shrink-wrapped into three numbers on the screen: target price, term, annualized yield.

### How It Is Played (using Binance Dual Investment as the example)

| Step | Action |
|---|---|
| ① Pick a product | Choose the coin (e.g. BTC), term (e.g. 7 days), and target price (e.g. 65,000) |
| ② Check the APY | The page shows the annualized yield (closer target to spot = higher APY) |
| ③ Subscribe | Subscribe with USDT or BTC |
| ④ Expiry settlement | See the table below |

**Subscribing with USDT, target price 65,000:**

| Price at expiry | Settlement outcome | Your situation |
|---|---|---|
| Expiry price ≥ 65,000 | Principal + yield (USDT) received | You earned USDT interest but **missed the rally** |
| Expiry price < 65,000 | BTC bought at 65,000 (principal converted to coin + yield) | Like a limit buy on the way down; further falls mean floating losses |

**Subscribing with BTC (bullish product) works symmetrically in reverse**: if price breaks above the target, your BTC is sold at the target price for USDT.

### Risk Points

| Risk | Description |
|---|---|
| Missing the rally | In a big rally you only earn the fixed yield; the principal is "pinned" at the target price and cannot ride the rise |
| Buying into a fall | If converted to coin at expiry and price keeps falling, losses far exceed that little APY |
| Yield ≠ APY | The on-screen APY assumes "held for 365 days"; the absolute yield over the actual term is tiny (e.g. 7 days at 20% APY ≈ only 0.38%) |
| Price volatility | Funds are locked for the product term; no way to **<mark>stop-loss</mark>** |
| Comprehension threshold | Settlement rules differ per product; misreading the terms is the main cause of losses |

> ⚠️ **Risk Warning: dual investment suits people "who wanted to place a limit order anyway", not people "who want to earn interest".**
> Its yield is the price of **selling volatility**: you take a fixed return, and the risk is "either miss the rally or catch the falling knife".
> Understand it as "a limit order with interest", not as "wealth management".

---

## Tokenized Synthetic Assets

### What They Are

Real-world or off-chain assets "tokenized" onto a chain/exchange, letting users indirectly hold with crypto what they otherwise could not reach:

| Type | Examples | Notes |
|---|---|---|
| Stablecoins | USDT, USDC, DAI | USD-pegged synthetic assets (DAI is a decentralized stablecoin minted with on-chain collateral) |
| Staking derivatives | stETH, cbETH | Receipts for staked-ETH yield; tradable and re-stakable |
| Tokenized commodities | PAXG (gold), PAXOS silver | Each token backed by physical/custodied bullion |
| Tokenized stocks | Binance stock tokens (delisted) | Once traded US stocks like Tesla as tokens until regulators shut it down |
| Synthetic stocks/indices | Synthetix sTSLA etc. | On-chain synthetic price exposure without real shares |

### How They Are Played

- Buy and sell these tokens directly on exchanges or on-chain DEXs;
- Uses: stablecoins for pricing and deposits/withdrawals, stETH for staking yield, PAXG to hedge fiat depreciation, synthetic assets to hedge US equity exposure, etc.

### Risk Points

| Risk | Description |
|---|---|
| Depeg | Stablecoin/synthetic price breaks its target peg (e.g. UST went to **<mark>zero</mark>** in 2022; USDC briefly depegged to 0.87) |
| Custody and reserves | Centrally issued tokens depend on issuer reserves and audits; a run means collapse |
| Regulation | Tokenized stocks and the like can be halted or force-redeemed by regulators at any time |
| Smart contract risk | On-chain synthetic collateral can be liquidated due to code bugs or oracle failures |
| Liquidity | Most synthetic assets have thin depth and wide slippage |

> ⚠️ **Risk Warning: stablecoins ≠ risk-free.**
> "1 USDT = 1 USD" is the issuer's promise, not a mathematical theorem.
> Keep only the small share of funds you will "need soon" in stablecoins, and prefer large, transparent issuers.

---

## Meme Coins and Vaporware

### What They Are

- **Meme coins**: tokens that run on internet memes, community culture, and KOL hype (DOGE, SHIB, PEPE, etc.) with no real business value;
- **Vaporware (air coins)**: tokens wrapped in a glossy whitepaper but with no product, no code, sometimes not even a dev team;
- What they share: **prices are driven almost entirely by sentiment and money flow** — fundamentals are zero.

### How to Look (or Not Play) at Them

| What to check | Description |
|---|---|
| Token utility | A real protocol/users vs. pure narrative |
| Contract code | Open source? auditable? (honeypot tokens cannot be sold) |
| Liquidity | Locked or not, for how long, how deep the pool is |
| Holder concentration | Top-10 addresses holding too much = a dump can come anytime |
| The team | Anonymous? any real team? |
| Exchange listing | Listed on a major exchange? (even then beware "list and dump") |

### Risk Points

| Risk | Description |
|---|---|
| Going to zero | When sentiment recedes, liquidity evaporates; price can drop 99.9% and never return |
| Pump and dump | The team/whales pump the price and unload on retail |
| Rug Pull | The team drains the liquidity pool and vanishes; overnight zero |
| Honeypot | Code hard-wired to "buy only, never sell" |
| Contract risk | Meme coins have almost no hedging tools; shorting via perpetuals also gets blown up in squeezes |

> ⚠️ **Risk Warning: meme coins are a "negative-sum game".**
> They create no value; they only transfer it — from latecomers to early entrants and the team.
> If you must play, use only money you can "afford to lose entirely", and assume by default that you are the one holding the bag.

---

## On-Chain Derivatives

### What They Are

Decentralized derivatives: contracts opened directly on blockchain smart contracts without going through a centralized exchange (CEX). Representative projects:

| Project | Chain | Traits |
|---|---|---|
| GMX | Arbitrum / Avalanche | Pool-based market making, low slippage, perps + spot; once the most popular on-chain perpetual |
| dYdX | Own chain (Cosmos) / Ethereum | Order-book model; veteran decentralized contract exchange |
| Hyperliquid | Own chain | Order-book perps; extremely fast growth in recent years |
| Jupiter Perps | Solana | Perps built into the Solana ecosystem aggregator |

### How They Are Played

1. Bridge/deposit assets to a wallet on the corresponding chain;
2. Connect your wallet in the DApp and deposit margin (multi-collateral supported);
3. Open long/short perpetuals — the logic matches CEX perps (leverage, liquidation, funding all exist);
4. On some platforms funding flows to stakers (e.g. GMX's GLV/liquidity pools), creating an "LPs harvest the rate" model.

### vs CEX

| Dimension | Centralized exchange (Binance/OKX) | On-chain derivatives (GMX etc.) |
|---|---|---|
| Custody | Exchange holds the funds | Smart contract custody; users keep their own wallets |
| Transparency | Funding and **<mark>liquidation</mark>** data are opaque | All rules verifiable on-chain |
| Depth/slippage | Good depth | Pool-based; large slippage on small coins |
| Speed | Fast | Bound by on-chain confirmation speed |
| Liquidation math | Platform discretion | Open rules in the smart contract |

### Risk Points

| Risk | Description |
|---|---|
| Smart contract exploits | Once the code is attacked, funds are gone (GMX, dYdX, etc. all have patch histories) |
| Oracle manipulation | If the price source (oracle) is manipulated, cascading liquidations follow |
| Cross-chain/bridge risk | Assets attacked while bridging (bridge hacks are frequent) |
| Impermanent loss | Providing liquidity to pools as an LP exposes you to losses when prices move |
| Platform disappearance | Small protocols can halt operations or exit-scam at any time |
| High barrier | Lose the private key = assets gone forever, with no customer service to call |

> ⚠️ **Risk Warning: on-chain ≠ safer.**
> "Decentralization" solves "the platform running away" but introduces four new risks: smart contracts, oracles, cross-chain bridges, and private-key management.
> Since 2020, DeFi hacks alone have caused losses counted in billions of dollars. **On-chain derivatives suit people with technical backgrounds who can audit contract risk themselves** — beginners stay away.

---

## Summary

| Product | One sentence | Core risk |
|---|---|---|
| Crypto options | Buying "the right to choose"; buyer loss is bounded | Seller risk unlimited; time decay |
| Leveraged tokens | Spot-listed 3x leverage without liquidation | Volatility decay; not for long-term holds |
| Dual investment | A limit order with interest (selling an option) | Missing the rally / buying into a fall |
| Tokenized synthetic assets | Real-world assets wrapped as tokens | Depeg, custody, regulation |
| Meme coins / vaporware | Pure sentiment-driven tokens | Zero, rug pulls, honeypots |
| On-chain derivatives | Perpetual swaps on smart contracts | Contract bugs, oracles, private-key risk |

::: warning ⚠️ Risk Warning
The common underlying logic of crypto derivatives: **some people earn the money of volatility, and some people pay it.**
Before buying any product, answer three questions:
1. Where does my return come from? (Sentiment? Volatility? Or the counterparty's losses?)
2. How much do I lose in the worst case? Can I afford it?
3. Have I genuinely read the product terms end to end?

Fail to answer any one of them, and the default assumption should be that this product exists to harvest you.
:::
