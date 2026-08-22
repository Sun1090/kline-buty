---
title: "05 · Strategy Coding in Practice"
description: "Five complete strategy examples from simple to advanced: dual moving average, Bollinger Bands, RSI, grid trading, and a statistical arbitrage prototype."
---

# 05 · Strategy Coding in Practice

> Five complete strategy examples, simple to advanced: dual MA trend, Bollinger Band mean reversion, RSI overbought/oversold, crypto grid trading, and a statistical <mark>arbitrage</mark> prototype. Each one explains core logic, gives a code skeleton, and marks applicable markets and risks — closing with parameter boundaries, portfolio thinking, and a personal roadmap.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets are risky; invest with caution.

---

## Strategy Overview

| # | Strategy | Type | Applicable Markets | Difficulty | Core Return Source |
|---|---|---|---|---|---|
| ① | Dual MA trend | Trend following | Futures, crypto, major stocks | ★ | Ride medium/long trends, cut losses early |
| ② | Bollinger mean reversion | Range reversal | Stocks, ETFs, crypto spot | ★★ | Prices revert after deviating |
| ③ | RSI overbought/oversold | Range reversal | Instruments with stable ranges | ★★ | Extreme sentiment reverts |
| ④ | **<mark>Grid trading</mark>** | Ranging markets | Crypto spot (best for automation) | ★★ | Repeatedly harvest range oscillation |
| ⑤ | Stat arb prototype | Pairs/market-neutral | Correlated pairs (same-sector stocks, major coin pairs) | ★★★ | **Spreads** converge after diverging |

---

## 1. Dual Moving Average Trend (Classic Entry)

**Core logic**: go long when the fast (short) MA crosses above the slow (long) MA; exit/short on the cross down. Eats trends, endures chop.

**Python snippet** (full backtest in 03-Your First Backtest; teaching example only, live-trading risk is yours):

```python
import pandas as pd

def dual_ma_signal(df, fast=5, slow=20):
    df = df.copy()
    df["ma_fast"] = df["close"].rolling(fast).mean()
    df["ma_slow"] = df["close"].rolling(slow).mean()
    df["signal"] = (df["ma_fast"] > df["ma_slow"]).astype(int)
    df["position"] = df["signal"].shift(1)   # effective next day; prevents look-ahead bias
    return df
```

- **Applicable markets**: markets with clear trending cycles (commodity futures, major crypto, broad indices).
- **Risks**: whipsawed repeatedly in ranging markets (false breakouts); long <mark>drawdown</mark> periods feel awful; natural **win rate** is only 30-40% — it wins via the profit/loss ratio, and you'll fail if you can't hold.

---

## 2. Bollinger Band Mean Reversion (Range)

**Core logic**: price breaking the lower band signals oversold → buy; breaking the upper band signals overbought → sell/short; reverting to the middle band is the **take-profit** target.

**Python snippet**:

```python
def boll_revert_signal(df, n=20, k=2.0):
    df = df.copy()
    df["mid"] = df["close"].rolling(n).mean()
    std = df["close"].rolling(n).std()
    df["upper"], df["lower"] = df["mid"] + k * std, df["mid"] - k * std
    df["signal"] = 0
    df.loc[df["close"] < df["lower"], "signal"] = 1    # buy at lower band
    df.loc[df["close"] > df["upper"], "signal"] = -1   # sell at upper band
    return df
```

- **Applicable markets**: instruments that oscillate in ranges (stable-volatility stocks, sideways crypto spot).
- **Risks**: **catching falling knives in one-way moves** — when price keeps sliding below the lower band, mean reversion just buys deeper into losses. You must pair it with a hard **stop-loss** (e.g., exit if price deviates another X% beyond the mid band) and confirm the instrument is actually ranging (check whether historical <mark>volatility</mark> is contracting first).

---

## 3. RSI Overbought/Oversold (Range Variant)

**Core logic**: RSI (Relative Strength Index) measures up/down momentum; >70 is overbought, <30 oversold — trade against the extreme.

**Python snippet**:

```python
def rsi(close, n=14):
    diff = close.diff()
    up = diff.clip(lower=0).rolling(n).mean()
    down = (-diff.clip(upper=0)).rolling(n).mean()
    rs = up / down
    return 100 - 100 / (1 + rs)

def rsi_signal(df, over=70, under=30):
    df = df.copy()
    df["rsi"] = rsi(df["close"])
    df["signal"] = 0
    df.loc[df["rsi"] < under, "signal"] = 1      # buy oversold
    df.loc[df["rsi"] > over, "signal"] = -1      # sell overbought
    return df
```

- **Applicable markets**: similar to Bollinger; prefers instruments with stable ranges. On high-volatility crypto, widen thresholds (e.g., 25/75) and watch for "RSI fade".
- **Risks**: in strong trends RSI pins in overbought territory (bulls) or oversold territory (bears) for extended periods, and fading it gets run over by the trend. Fundamentally the same species as strategy ② — don't run two isomorphic range strategies heavily at once.

---

## 4. Grid Trading (Crypto Spot Automation)

**Core logic**: preset multiple order levels inside a price band — buy at each level as price falls, sell as it rises, harvesting oscillation repeatedly. Naturally suited to programs: **orders rest all day, no direction prediction needed**.

**Order-loop sketch** (teaching example only; live-trading risk is yours):

```python
import time
from binance.spot import Spot

GRID_LO, GRID_HI = 55000, 75000   # grid range (reset per market; fictional example values)
GRID_STEP = 500                   # grid spacing
BASE_QTY = "0.01"                 # quantity per level (validate min qty & step size first)

def build_grid():
    """Generate all grid prices within the range"""
    prices = []
    p = GRID_LO
    while p <= GRID_HI:
        prices.append(round(p, 2))
        p += GRID_STEP
    return prices

def run_grid(client, symbol="BTCUSDT"):
    grid = build_grid()
    while True:
        # 1. Fetch existing open orders, compare with theoretical grid, fill missing levels
        open_orders = client.get_open_orders(symbol=symbol)
        price_set = {float(o["price"]) for o in open_orders}
        # 2. Grid levels without resting orders → place limit buys
        for price in grid:
            if price in price_set:
                continue
            client.new_order(symbol=symbol, side="BUY", type="LIMIT",
                             timeInForce="GTC", price=str(price),
                             quantity=BASE_QTY)
        # 3. Fills arrive via WebSocket/polling; trigger "sell this level" and re-post
        time.sleep(5)   # polling interval within rate limits

if __name__ == "__main__":
    client = Spot(api_key=os.environ["BINANCE_API_KEY"],
                  api_secret=os.environ["BINANCE_API_SECRET"])
    run_grid(client)
```

- **Applicable markets**: crypto spot (7×24 + no price limits + free API) is grid heaven; don't force spot-style grids onto futures or contracts carrying **<mark>funding rates</mark>**.
- **Risks**: ① in a one-way crash every level fills into losses and capital usage grows without bound → hard grid bounds and a capital cap are mandatory; ② in a one-way rally you sell out one level at a time and get left behind → set a top-line flatten rule; ③ a grid is a "range extractor" — **once the range breaks, the strategy fails**, so keep monitoring whether price stays inside.

---

## 5. Statistical Arbitrage Prototype (Pairs Trading)

**Core logic**: find two instruments that move together long-term (same-sector stocks, BTC vs a major alt); short the rich leg / long the cheap leg when the spread deviates from its historical mean, close when the spread converges — earning **relative** movement (market-neutral).

::: info 📖 Cointegration Concept
The core of pairs isn't "prices correlated" but "**<mark>cointegrated</mark>**" — whether the spread series oscillates around a stable mean. Use `statsmodels` for the cointegration test (teaching example only):
:::

```python
import numpy as np
from statsmodels.tsa.stattools import coint

# a, b are two aligned price series
def zscore(s):
    return (s - s.mean()) / s.std()

def pair_spread(a, b):
    s = a - b                                  # simple spread (regression residual also works)
    z = zscore(s)
    return z

# Cointegration test: p-value < 0.05 suggests cointegration → pairable
_, pvalue, _ = coint(a, b)
print("cointegration p-value:", pvalue)

# Trading rule: z > 1.5 short the spread (sell a, buy b); z < -1.5 reverse; |z| < 0.5 close
```

- **Applicable markets**: same-sector/theme stock pairs, tightly correlated crypto pairs (BTC/ETH), ETFs vs constituents.
- **Risks**: ① the spread relationship **can fail** (no longer converges after fundamentals change) — monitor zscore statistics dynamically and stop when it breaks; ② shorting China A-shares requires margin lending access — individuals should start with crypto spot pairs or long-leg-only simulations; ③ capacity and pair count are limited — don't over-lever.

---

## 6. Parameters and Failure Boundaries per Strategy

| Strategy | Typical Starting Params | Unsuitable Regimes | Failure Signature |
|---|---|---|---|
| Dual MA | fast=5~20, slow=20~60 | Long sideways drifts | String of small losses; drawdown hugging the stop line indefinitely |
| Bollinger | n=20, k=2.0 | One-way trends | Stops triggering constantly; losses concentrated in trend segments |
| RSI | n=14, 30/70 | Strong trends (fade) | RSI pinned above 70 / below 30 for long stretches |
| Grid | Range at recent highs/lows | Trends that break the range | Price escapes the range; trapped-capital ratio exceeds limit |
| Pairs | z thresholds 1.5/0.5 | Correlation breakdowns | Spread never reverts; cointegration p-value rises markedly |

::: warning ⚠️ Universal Boundary Discipline

- Validate any strategy's parameters **<mark>out-of-sample</mark>** (see 03-Your First Backtest §7); high parameter sensitivity = unreliable;
- Pre-write "stop conditions" for each strategy: disable at X% drawdown, review immediately on failure signatures — never white-knuckle it;
- A strategy spec sheet (applicable regimes, failure signatures, stop conditions) matters as much as the research code.
:::

---

## 7. Portfolio Thinking

Every single-strategy equity curve suffers from "makes nothing in bulls, loses in bears". The core of combining strategies is **<mark>low correlation</mark>**:

| Combination Method | Effect | Example |
|---|---|---|
| Multi-market | Trend/range cycles staggered across markets | Crypto trend + commodity trend |
| Multi-type | Trend and mean reversion naturally complement (one earns in trends, one in ranges) | Dual MA + Bollinger |
| Multi-instrument | Single-instrument event risk diluted | Run one strategy across 3-5 major coins |

- Validation: plot daily return series of all strategies together and inspect the **correlation matrix**; pairs correlating above 0.7 add no diversification;
- Target: combined **max drawdown below the worst single strategy** — but note: portfolios don't stack expected returns; they reduce volatility, they don't amplify returns.

---

::: tip 💡 What Actually Pays Is Detect-Maintain-Iterate
**Writing strategy code takes days; keeping it alive takes continuous investment. What actually pays is the detect-maintain-iterate process you build around your strategies — that's the core competency of lasting personal quant.** One pretty backtest curve is a starting point for research, not an asset.
:::

## 8. The Reality of "20% Code, 80% Maintenance"

Writing strategy code takes days; keeping it alive takes continuous investment:

| Maintenance Item | Frequency | Content |
|---|---|---|
| Data corrections | Ad hoc | Source changes, refetching bad history; version your data |
| API changes | With each exchange update | Binance/OKX changing fields or rate limits; scripts must keep up |
| Market regime shifts | Ongoing | The environment a strategy needs changes; failure detection must always run |
| Platform terms | Anytime | Crypto platform ToS and regional restriction changes |
| Parameter reviews | Monthly | Rolling-window reassessment of whether parameters still sit in their effective region |

::: tip 💡 Mindset Correction
A single backtest's "pretty curve" is a research starting point, not an asset. What actually pays is the **<mark>detect-maintain-iterate process</mark>** you build around strategies — the core competency of personal quant done long-term.
:::

---

## 9. Personal Quant Roadmap

```text
Week 1       Get a backtest running: toolchain + data + first dual MA backtest (articles 01-03 here)
   ↓
Month 1      Build consistency: 2-3 strategies pass out-of-sample validation with experiment logs
   ↓
Month 3      Paper trading: full pipeline simulated (or signal push + logging), at least 100 recorded signals
   ↓
Small live capital: money whose total loss wouldn't affect your life, run 3+ months
   ↓
Iterate continuously: monthly review → failure detection → new strategy research → gradual sizing
```

Each stage has explicit promotion criteria: paper stage requires "complete signal records, bug-free execution" before small capital; small-capital stage requires "controlled drawdowns, no major operational incidents" before adding funds. **<mark>Those who skip stages always pay tuition at the next one</mark>**.

---

::: warning ⚠️ Risk Warning
All five strategies here are teaching examples: parameters are starting points, not answers; past returns do not represent future performance; any strategy can fail and lose money. Grid and pairs risks amplify quickly in extreme markets (one-way range breaks, non-converging spreads); automating execution adds rate limits, disconnects, and API changes as real loss sources. Always complete out-of-sample validation, set stop conditions, and verify long-term on paper and small capital before scaling. Historical data, backtest results do not guarantee future performance. This article is for learning and research only and does not constitute investment advice; execution details involving live trading and compliance follow latest regulations and platform docs.
:::
