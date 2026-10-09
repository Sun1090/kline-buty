# 05 · Crypto Perpetuals

> Crypto derivatives are the world's hottest — and most brutal — casino: 24/7 trading, 100x leverage, funding rates, wick-hunt liquidations...
> This chapter explains the mechanics and risks of perpetual swaps, funding rates, and the wider zoo of crypto derivatives (options, leveraged tokens, dual investment, on-chain contracts).
> **Perpetual swaps carry extreme risk — read the margin and liquidation sections of [03-Futures](../futures/) first, then come back here.**

---

> ⚠️ Risk Warning
>
> Perpetual swaps can carry 100x leverage with 24/7 trading and no price limits, where a single wick can blow through your account to zero in seconds; funding rates and liquidation prices keep shifting. Everything in this chapter is for learning and research only and does not constitute investment advice — example prices and tiers are teaching approximations. The higher the leverage, the faster you die; never overextend.

---

## Suggested Learning Path

```text
① 01-Perpetual Swaps (understand the contract mechanics and how the liquidation price is calculated)
   ↓
② 02-Funding Rates (understand why the perpetual price hugs the spot price)
   ↓
③ 03-Crypto Derivatives (meet each advanced product one by one, and dodge each trap one by one)
   ↓
④ 04-Perpetual Trading in Practice & Risk Control (pass the 8-question checklist before opening any position; review blow-ups with the template afterwards)
```

- **Read the futures chapter before this one**: a perpetual swap is essentially "a futures contract that never settles" — the principles of leverage, margin, and liquidation are identical to futures. Without the foundation of 02-Futures, the liquidation-price formulas and position management in this chapter have nowhere to stand.
- Crypto contracts trade 24/7 with no price limits and no circuit breakers, and **leverage can exceed 100x** — volatility moves far faster than in traditional futures.
- Every article carries a "⚠️ Risk Warning" box. **Read the risk box before the body text.**

> If 01-Getting Started is like learning to drive, crypto perpetuals are a supercar on a straight race track:
> stomping the accelerator feels great, but when the brakes fail there is no runoff zone to save you.

---

## Conventions

- All rates, contract sizes, leverage tiers, settlement times, and similar data in this chapter are **general teaching values**; always defer to the latest rules of Binance, OKX, and other exchanges.
- Every section covering leverage and derivatives contains a "⚠️ Risk Warning" box.
- Prices in the examples only illustrate the calculations and are not trading advice of any kind.

---

## Chapter Contents

<DocCards dir="crypto-perpetuals" />
