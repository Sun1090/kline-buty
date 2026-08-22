---
title: "02 · Data Acquisition in Practice"
description: "Hands-on data fetching across China A-shares, futures, and crypto — cleaning and incremental storage that turns data from 'fetchable' to 'trustworthy'."
---

# 02 · Data Acquisition in Practice

> The foundation of quant research. This article covers hands-on data fetching for three markets — China A-shares, futures, crypto: every snippet runs as-is, and the subsequent cleaning, incremental storage, and quality checks turn data from "can fetch" into "can trust".
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets are risky; invest with caution.

---

## 1. China A-Share Data: AKShare and Tushare

### 1.1 AKShare: Free and Zero Barrier

AKShare aggregates data from multiple public websites — free and works out of the box (example code is for teaching only; live-trading risk is yours):

```python
import akshare as ak

 # Kweichow Moutai daily bars (forward adjusted); symbols/fields per latest akshare docs
df = ak.stock_zh_a_hist(
    symbol="600519",
    period="daily",
    start_date="20200101",
    end_date="20241231",
    adjust="qfq",          # forward adjustment, see Section 4
)

df.to_csv("data/600519_daily_qfq.csv", index=False, encoding="utf-8-sig")
print(df.head())
print(df.tail())
```

Financial data is one call away too (teaching example only):

```python
import akshare as ak

# Income statement / key financial indicators (interface names may change between versions; check docs)
fin = ak.stock_financial_abstract(symbol="600519")
print(fin.head())
```

::: warning ⚠️ AKShare's Pitfalls
It scrapes web pages, so **<mark>any upstream redesign breaks the interface</mark>**, and field names are unstable. Pin the akshare version (put it in requirements.txt), and when an endpoint errors, check the GitHub release notes first.
:::

### 1.2 Tushare Pro: Cleaner, Needs Credits

```python
import tushare as ts

ts.set_token("your_token")            # get after registering at tushare.pro
pro = ts.pro_api()

# Daily bars (unadjusted); ts_code format: code.market
df = pro.daily(ts_code="600519.SH", start_date="20200101", end_date="20241231")
df.to_csv("data/600519_daily_tushare.csv", index=False)
print(df.head())
```

| Comparison | AKShare | Tushare Pro |
|---|---|---|
| Cost | Free | Free (credit system; advanced endpoints need credits) |
| Field consistency | Mediocre, fields change often | Good, documented fields |
| Financial data | Available but scattered | Complete (income statement/balance sheet/indicators) |
| Stability | Depends on scraped pages | Fairly stable |

::: tip 💡 Usage Advice
During acquisition, run both sources and store CSVs; use AKShare during research, and cross-validate suspicious numbers against Tushare.
:::

---

## 2. Futures Data: Dominant Contract Klines

Futures contracts expire, so individual research usually uses the "dominant contract" — the contract with the largest open interest (teaching example only; interfaces per latest akshare docs):

```python
import akshare as ak

# RB0 = rebar dominant continuous (symbol rule: product code + 0 means dominant), period swappable
df = ak.futures_main_sina(symbol="RB0", start_date="20230101", end_date="20241231")
print(df.columns)
df.to_csv("data/rb_main_daily.csv", index=False, encoding="utf-8-sig")

# For a single contract (e.g., rebar RB2501 delivering January 2025)
df_single = ak.futures_zh_daily_sina(symbol="RB2501")
print(df_single.head())
```

::: warning ⚠️ Dominant Contract Caveats
- A dominant continuous series is stitched from different contracts, so **there will be price gaps on rollover days** (contract **<mark>spreads</mark>**). Before backtesting, either apply adjustment or book each rollover as a roll cost;
- "Continuous contracts" come in three flavors: by open interest, by volume, and by index (all contracts weighted) — never mix them;
- For daily history, watch forward/backward adjustment handling: futures gaps represent real <mark>roll</mark> costs and demand more care than stocks. Here we handle it as "record rollover points, book roll costs".
:::

---

## 3. Crypto Data: Binance API

Crypto market data lives on exchange official REST endpoints — unmetered, well-documented, the best starting point for personal quant (teaching example only; live-trading risk is yours):

```python
import time
import requests
import pandas as pd

BASE_URL = "https://api.binance.com/api/v3"   # spot; futures use fapi.binance.com, per official docs

def fetch_klines(symbol, interval, start_ms, end_ms, limit=1000):
    """Fetch a range of klines; mind rate limits: Binance bills by weight, see below"""
    params = {
        "symbol": symbol,
        "interval": interval,          # 1m/1h/1d/1w...
        "startTime": start_ms,
        "endTime": end_ms,
        "limit": limit,                # max 1000 candles per request
    }
    r = requests.get(f"{BASE_URL}/klines", params=params, timeout=15)
    r.raise_for_status()
    # Watch remaining weight; slow down automatically when near the cap
    used = int(r.headers.get("x-mbx-used-weight-1m", 0))
    if used > 2000:                    # default limit 6000/min, keep headroom
        time.sleep(30)
    time.sleep(0.1)                    # base throttle
    return r.json()

def klines_to_df(raw):
    cols = ["open_time", "open", "high", "low", "close", "volume",
            "close_time", "quote_vol", "trades", "taker_buy_base",
            "taker_buy_quote", "ignore"]
    df = pd.DataFrame(raw, columns=cols)
    for c in ["open", "high", "low", "close", "volume"]:
        df[c] = df[c].astype(float)
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    return df[["open_time", "open", "high", "low", "close", "volume"]]

# Page through 1h klines by time, 1000 at a time
start = int(pd.Timestamp("2024-01-01", tz="UTC").timestamp() * 1000)
end = start + 1000 * 3600 * 1000       # 1000 one-hour candles
raw = fetch_klines("BTCUSDT", "1h", start, end)
df = klines_to_df(raw)
df.to_csv("data/btcusdt_1h.csv", index=False)
print(df.head())
```

**Rate limits and weights**: Binance is **<mark>weight-based</mark>** — different endpoints consume different weights, and the `x-mbx-used-weight-1m` header tells you your per-minute usage. When pulling historical data:

- Weight is not "request count" but "cost"; klines request weight grows with limit (per official docs);
- After a 429/418 rate limit, retry with exponential backoff (wait 5s → 30s → 120s); don't hammer;
- `time.sleep` headroom plus header monitoring is the standard practice for personal scripts.

---

## 4. Data Cleaning: Missing Values, Suspended Days, Price Adjustment

### 4.1 Missing Values

| Case | Handling |
|---|---|
| Suspended trading days | No trade data that day for A-shares: daily bars simply have a **missing row**; `ffill` would pollute volume with the prior row's value — usually keep NaN and let the strategy decide |
| Occasional API omissions | `ffill` prices from neighbors first, then check whether volume is 0 to identify suspensions |
| Crypto 24/7 trading | Normally no gaps; a gap usually signals a source problem — delete the segment and refetch |

```python
import pandas as pd

df = pd.read_csv("data/600519_daily_qfq.csv", parse_dates=["日期"])

# Unify column names for later processing (AKShare Chinese columns)
df = df.rename(columns={"日期": "date", "开盘": "open", "收盘": "close",
                        "最高": "high", "最低": "low", "成交量": "volume"})
df["volume"] = df["volume"].astype(float)

# Near-zero volume → suspended or anomalous day: keep prices, flag it
df.loc[df["volume"] < 1, "halted"] = True
df.loc[df["volume"] >= 1, "halted"] = False
print(df[df["halted"] == True].head())   # sanity-check the number of halted days
```

### 4.2 Price Adjustment: Forward / Backward / None

| Type | Method | Trait | Where to Use |
|---|---|---|---|
| Forward adjustment (qfq) | Anchored to **current prices**, adjusts history downward for dividends/splits | Historical prices **keep changing** with each new dividend | Most common for charting, patterns, indicators |
| **<mark>Backward adjustment</mark>** (hfq) | Anchored to **the first listing day**, adjusts later prices upward | History stays **fixed**, unaffected by dividends | Required for long-run <mark>return</mark> computation and backtests |
| No adjustment | Raw traded prices | Ex-rights gaps distort indicators into fake "crashes/spikes" | Usable only for short horizons (no holdings around ex-dividend dates) |

::: tip 💡 Why Backtests Prefer Backward Adjustment
A backtest uses "historical prices", but forward-adjusted history changes depending on your fetch end date — fetch the same day on two dates and you get different prices, so results aren't reproducible. They coincide only when anchored to one fixed cutoff date, but backward adjustment is simply more rigorous.
:::

```python
# Fetch backward-adjusted data for backtesting (fields/params per latest akshare docs)
df_hfq = ak.stock_zh_a_hist(symbol="600519", period="daily",
                            start_date="20200101", end_date="20241231",
                            adjust="hfq")
df_hfq.to_csv("data/600519_daily_hfq.csv", index=False)
```

---

## 5. Incremental Updates and Storage

### 5.1 Daily Incremental Fetch

Personal market-data volumes are small; the strategy is "run a script once a day": fetch new rows starting after your local max date (teaching example only):

```python
import datetime as dt
import pandas as pd
import akshare as ak

def incremental_update(symbol="600519", path="data/600519_daily_qfq.csv"):
    try:
        old = pd.read_csv(path, parse_dates=["日期"])
        last = old["日期"].max()
        start = (last + dt.timedelta(days=1)).strftime("%Y%m%d")
    except FileNotFoundError:
        old, start = None, "20200101"

    new = ak.stock_zh_a_hist(symbol=symbol, period="daily",
                             start_date=start, end_date=dt.date.today().strftime("%Y%m%d"),
                             adjust="qfq")
    if new.empty:
        return
    df = pd.concat([old, new], ignore_index=True).drop_duplicates(subset="日期")
    df.to_csv(path, index=False, encoding="utf-8-sig")

incremental_update()
```

::: warning ⚠️ Incremental Updates Must Deduplicate
APIs occasionally re-send already-fetched dates; `drop_duplicates` by date is the baseline safety net of any incremental update.
:::

### 5.2 Storage Choices: CSV vs SQLite vs a Real Database

| Option | Best For | Pros & Cons |
|---|---|---|
| CSV (one file per instrument/timeframe) | Starting daily-bar research | Simple, human-readable; merging across files is manual |
| SQLite (stdlib sqlite3) | Once instruments multiply | No install, SQL dedup/query support; the personal optimum |
| PostgreSQL/MySQL | Multi-machine collaboration, production grade | Overkill solo; high ops cost |

```python
import sqlite3

con = sqlite3.connect("data/market.db")
# Create table: open_time as primary key, skip duplicates on write (INSERT OR IGNORE)
con.execute("""CREATE TABLE IF NOT EXISTS kline_1h (
    open_time TEXT PRIMARY KEY, open REAL, high REAL,
    low REAL, close REAL, volume REAL)""")
df.to_sql("kline_1h", con, if_exists="append", index=False)  # teaching simplification: use INSERT OR IGNORE in production
con.commit()
```

::: tip 💡 Personal Experience
**<mark>CSV for single instruments + SQLite for many</mark>** is the most comfortable combo. CSV for humans and backups outside git; SQLite for scripts.
:::

---

::: warning 🛑 Fetched Is Not Trusted
**Bad data is the biggest hidden source of distorted backtests: wrong adjustment method, timezone misalignment, API omissions, leaked future data — any one of them pushes results far from reality.** Multi-source cross-validation plus checking figures against market software are mandatory checks before data enters a backtest.
:::

## 6. Data Quality Checks

Never trust data just because it downloaded. Before any backtest it must pass at least three gates:

1. **Numerical sanity**: `high >= low`, `volume >= 0`, no NaN prices (`df.isna().sum()` at a glance).
2. **Cross-check against market software**: sample 3–5 random dates and compare open/close/volume against your phone's charting app; mismatches mean the API source is broken.
3. **Interval sampling**: around ex-dividend/split days, verify prices jump according to the adjustment rules; for crypto, check adjacent klines' open_time continuity (no missing bars).

```python
# Quick health-check script
assert (df["high"] >= df["low"]).all(), "high < low anomaly"
assert (df["close"].dropna() > 0).all(), "non-positive price"
assert df["date"].is_unique, "duplicate dates found"
assert df["date"].is_monotonic_increasing, "dates not ascending"
print("Basic checks passed")
```

---

## 7. Legal and Compliance Reminders

- **Free APIs**: AKShare/Tushare/Binance all enforce rate limits and terms of service. Overly aggressive scraping gets IPs/accounts banned; commercial use requires checking each platform's licensing terms (Tushare free data may not be redistributed commercially — latest terms govern).
- **Data licensing**: Data from paid platforms like JoinQuant/RiceQuant/Wind is licensed for in-platform use only and **must not be downloaded and repurposed** — this is contractual, not merely ethical.
- **Crypto APIs**: Some Binance/OKX features are region-restricted; compliance depends on your jurisdiction. Read official terms before test/production use.

---

## 8. Next Step

With clean data in hand, move on to [03-Your First Backtest](first-backtest.md): turn this data into your first backtest complete with fees and **<mark>slippage</mark>**.

---

::: warning ⚠️ Risk Warning
Bad data is the biggest hidden source of distorted backtests: wrong adjustment method, timezone misalignment, API omissions, or leaked future data can each push results far from reality. Make multi-source cross-validation and cross-checking against market software mandatory before any backtest, and record fetch times and data versions. Example code here is for teaching only — live-trading risk is yours; free API terms and limits are governed by each platform's latest rules.
:::
