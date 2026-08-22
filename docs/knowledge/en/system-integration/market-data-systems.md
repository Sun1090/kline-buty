---
title: "03 · Market Data Systems: The Eyes of Trading Software"
description: "A full walkthrough of market data system architecture, covering data sources, protocols, latency, reconnect recovery, and storage strategy."
---

# 03 · Market Data Systems: The Eyes of Trading Software

> The value of market data lies not in "receiving it" but in "complete, ordered, timely". For an integration project, the market data module's pitfalls concentrate almost entirely on three questions: **where does the data come from, what happens on disconnect, how high is the latency**.
>
> This article covers sources and levels of market data, snapshots vs incrementals, protocols, time and latency, market data gateway architecture, reconnect recovery and storage, and ends with latency measurement methods.

---

## 1. Market Data Source Types

| Source | Tier | Characteristics | Typical use |
|---|---|---|---|
| Raw exchange feed | Highest | Level-2 order-by-order/trade-by-trade, lowest latency, but direct access has a high permission barrier (usually unavailable domestically; crypto exchanges allow direct access) | High-frequency / market making |
| OMS feed | Middle | The main domestic futures path (CTP market data, Hundsun market data, etc.), snapshot-based, latency depends on the OMS and the line | Regular trading systems |
| Third-party data vendors | Lowest | Wind, JoinQuant, TinySoft, TickData, PanLF and others; full coverage, historical databases, processed data such as adjusted prices | Research, backtesting, display |

> Engineering principle: **production market data (used for live decisions) must come from the OMS or a direct exchange feed, never from a third-party vendor** — third-party data latency is measured in seconds and cannot guarantee tick-by-tick completeness. Third-party data is for historical backtesting and display only.

::: warning ⚠️ Production market data must come from the OMS or direct exchange access
**Production market data (used for live decisions) must come from the OMS or a direct exchange feed, never from a third-party vendor** — third-party data latency is measured in seconds and cannot guarantee tick-by-tick completeness. The most dangerous market data incident is not "data arrived late" but "looks normal while the data is wrong" — a reconnect fails silently without an alert, and the strategy trades on stale data.
:::

---

## 2. Market Data Levels: Level-1 and Level-2

| Level | Content | Domestic typical | Crypto typical |
|---|---|---|---|
| Level-1 (snapshot) | Last price, volume, change, several book levels (e.g., 1/5 levels), bid/ask sizes | Futures snapshots (e.g., CTP depth market data), A-share 5-level snapshot (3-second refresh; per exchange rules) | No "L1" concept needed; ordinary depth streams |
| Level-2 (tick-by-tick) | Order-by-order entries, trade-by-trade prints, full order book (10-20 levels or full depth) | SSE/SZSE Level-2 requires authorization; futures tick data requires separate permission | Binance depth (incremental), OKX full-depth snapshots |

- **A Level-1 snapshot is "the packaged result"**: the state of price, volume, and book at one sampling instant; whatever happened in between is invisible.
- **Level-2 is "the record of the process"**: every order entry and every trade is an independent event; the order book can be rebuilt exactly.
- The implications for backtesting are entirely different: backtesting on L1 snapshots can only simulate to second/snapshot precision; only L2 tick data lets you precisely simulate "if I placed an order, would it fill, and at which **<mark>level</mark>**".

---

## 3. Snapshot and Incremental Market Data

### 3.1 Snapshot

- The full market data state pushed periodically by the OMS/exchange, e.g., CTP depth market data (`CThostFtdcDepthMarketData`), or the crypto REST `depth` full snapshot.
- **Characteristics**: self-contained full state; resubscribing after a restart restores everything, but events between two snapshots are invisible.
- Snapshot frequency: domestic futures snapshots are ~500ms, A-share L1 ~3 seconds (per exchange rules), crypto depth snapshot intervals are defined by the exchange.

### 3.2 Incremental (tick-by-tick)

- Every change is its own event: one trade (trade), one order entry or removal (bookTicker / level2 update).
- **Characteristics**: dense event stream, information-rich, but **continuity-dependent** — drop one event and every later state is wrong; snapshots must fill the gap.
- Typical implementations: Binance WebSocket `depth` incremental channel (the `u` field is the update sequence number, usable for gap detection), OKX `books` channel, and domestic tick-by-tick interfaces.

### 3.3 Subscription model and callback handling

```text
Subscribe request (by contract / by symbol list)
        │
        ▼
Market data connection (CTP MdApi / WS channel)
        │
        ▼
Callback dispatch (on_tick / on_snapshot / on_incremental)
        │
        ▼
Business consumption (K-line synthesis / book rebuild / storage / push to frontend)
```

- In callbacks, **do only the lightest work** (enqueue, update memory); move heavy work like K-line synthesis and storage to consumer threads, otherwise market data bursts will crush the callback thread.
- Subscription is request-response style: after subscribing, verify the subscription actually succeeded (some interfaces send a subscription confirmation report); on failure, retry and alert.

---

## 4. Market Data Protocols

### 4.1 Domestic OMS market data APIs

- **CTP market data**: `CThostFtdcMdApi`; after login, `SubscribeMarketData` subscribes to contracts; the callback `OnRtnDepthMarketData` pushes snapshots. GBK encoding, DLL shape; the threading model is the same as the trading side (see [02-exchanges-oms.md](exchanges-oms.md)).
- Other OMSs (Hundsun, Esunny) are similar in shape; fields and behavior per official documentation.

### 4.2 Crypto WebSocket channels

| Exchange | Channel | Content |
|---|---|---|
| Binance | `kline_1m` etc. | K-lines (history pullable) |
| Binance | `depth` / `bookTicker` | Book increments / best bid-ask; `u` is the update sequence number |
| Binance | `aggTrade` | Aggregated trades |
| OKX | `books` / `trades` / `candle1m` | Book / trades / K-lines |
| Bybit | `orderbook.*` / `trade.*` / `kline.*` | Book / trades / K-lines |

- Channel names, parameters, and return fields differ per venue; **the exchange developer documentation prevails**.
- Where WS messages have no strict ordering guarantee, rely on the sequence numbers the exchange provides (e.g., Binance `u`) for ordering and gap detection.

### 4.3 FIX market data

- Overseas markets (CME etc.) commonly use FIX market data variants (e.g., FIX/FAST, MDP), pushed by message type (e.g., the X-series incremental market data), parsed per dictionary.
- Characteristics: binary compression (FAST), template-based decoding — engineering-wise a different worldview from the domestic OMS "struct snapshot".

---

## 5. Time and Latency

### 5.1 Timestamp types

| Timestamp | Meaning | Notes |
|---|---|---|
| Exchange timestamp (event time) | When the event happened inside the exchange | E.g., trade time, snapshot generation time; formats differ per exchange (ms/µs; per official docs) |
| Local receive timestamp (receive time) | When our process received the message | Must be stamped **immediately on arrival**, typically with a high-resolution clock (C++ `clock_gettime` / Java system-time equivalents) |
| Business timestamp (trade date) | Which trading day it belongs to | Converted locally per trading-day rules; see [02-exchanges-oms.md](exchanges-oms.md) 9.3 |

### 5.2 NTP time sync

- All servers must sync via NTP (or the more precise PTP) with deviation held to the millisecond level (the exact target depends on the strategy).
- Consequences of poor sync: local vs exchange timestamp comparisons distort → latency statistics distort → the decision basis for **arbitrage**/high-frequency strategies is voided.

### 5.3 Why market data latency matters

- For high-frequency/arbitrage strategies: latency is cost; a few milliseconds decide whether an order fills at the intended price.
- For low-frequency strategies: latency decides "is the data behind the decision still fresh" — placing a **<mark>market order</mark>** on a price 3 seconds old guarantees **<mark>slippage</mark>**.
- For display systems: latency makes charts drift from the "real market"; user complaints and lost trust follow.

### 5.4 Event timeline

```text
Exchange matching engine       OMS/gateway             Our MD gateway            Client
─────────────────   ──────────────────   ──────────────────   ──────────
Book change / trade
   │ A (intra-exchange latency)
   ▼
MD generation → MD push     B (transport latency)
                          ▼
                      Snapshot/incremental receipt ── C (gateway processing latency) ──▶ business subscribers
                                                             │ D (rendering latency)
                                                             ▼
                                                          Chart/panel refresh
```

- A: time from inside the exchange to market data output; uncontrollable.
- B: network transport; the controllable part (leased lines, nearby deployment).
- C: our processing; must be optimized (direct memory operations, avoid locks and serialization).
- D: frontend rendering; irrelevant to trading decisions but affects experience.
- **Total latency = A + B + C (+ D); only B and C can be optimized, and C is free — optimize it first.**

::: tip 💡 Total latency = A + B + C, optimize C first
**Total latency = A + B + C (+ D); only B and C can be optimized, and C is free — optimize it first.** A is intra-exchange latency and uncontrollable, B is the controllable part of network transport, C is our own processing and must be optimized — direct memory operations, avoid locks and serialization. Grab the free C first.
:::

---

## 6. Market Data Gateway Architecture

The market data gateway is the single entry point between "OMS/exchange" and "internal services", responsible for five things:

| Capability | Description |
|---|---|
| Connection management | One or more connections per source, heartbeat keep-alive, reconnect, connection state reporting |
| Subscription management | Maintain a unified "contract → subscribers" map; when multiple frontends subscribe to the same contract, **subscribe upstream only once** and fan out internally |
| Fan-out (multiplexing) | Broadcast one copy of the feed to multiple consumers: K-line synthesis, risk controls, storage, frontend push |
| Ordering guarantee | Events of the same contract must be dispatched in order (single connection single thread / partition by symbol), otherwise book rebuilds go wrong |
| Primary-backup switching | When the primary gateway dies, switch to the backup automatically and re-pull a full snapshot on switchover (see section 7) |

```text
                ┌──────────────────────────────────────┐
                │       Market data gateway (own process)│
 OMS feed ──▶   │  Connection mgmt → subscription mgmt  │──▶ K-line service
 Crypto WS ──▶  │            → serialization/fan-out     │──▶ Risk control service
 Tick feed ──▶  │                                        │──▶ Storage service
                │  In-memory state (latest snapshot/seq) │──▶ Frontend push
                └──────────────────────────────────────┘
```

Architecture red lines:

- The gateway is an **independent process / independently deployed**: a market data gateway crash must not affect the trading path; a trading path crash must not affect market data.
- The gateway does **no business logic** inside: no indicator synthesis, no market judgment — synthesis belongs to consumers; the gateway only "receives, orders, broadcasts".
- The gateway's downstream consumers must be **degradable**: storage going down must not block frontend push (each downstream consumes and retries on its own).

---

## 7. Reconnect and Gap Filling

### 7.1 Reconnect strategy

- Exponential backoff reconnect (e.g., 1s → 2s → 4s → …, capped at 60s); after reconnecting, health-check first (pull the latest snapshot to verify sequence numbers).
- While market data is missing during a reconnect, **expose the state externally**: show "market data interrupted" on the frontend; never let users keep trading while numbers sit frozen at stale values.

::: warning ⚠️ Missing market data must be exposed — never let users trade on stale data
**While market data is missing during a reconnect, expose the state externally; never let users keep trading while numbers sit frozen at stale values.** After a disconnect, the frontend usually shows the last snapshot's stale price; if a strategy trades on that stale data, it is trading "now" with "the past".
:::

### 7.2 Gap filling: full snapshot + incremental replay

After a break in an incremental feed, local state is untrustworthy; the standard recovery flow:

```text
Disconnect detected / sequence number jump
        │
        ▼
Pull full snapshot (REST depth / OMS full market data)
        │
        ▼
Resume incrementals from the snapshot's sequence number
(re-subscribe on WS, confirm the starting sequence)
        │
        ▼
Validate incrementals against the snapshot
(continuous sequence, plausible book sizes)
        │
        ▼
Resume external push; report "gap filled" to monitoring
```

- Crypto incremental channels generally support resuming by sequence number (Binance depth `u`); after a break you can fetch only the delta.
- Domestic OMS snapshots carry the full state; after a reconnect, simply resubscribe — but **mind the ordering between the first post-reconnect snapshot and the stale local state**; discard pre-reconnect caches.

### 7.3 Reconciliation

- Periodic reconciliation: pull the latest price/volume once via an independent channel (e.g., a REST query) and compare against the local snapshot; alert when the deviation crosses a threshold.
- Relationship between tick trades and snapshot volume: the snapshot's cumulative volume must equal the sum of ticks (rounding tolerance allowed); persistent mismatch means events were dropped.

---

## 8. Market Data Storage

### 8.1 Storage choices

| Storage | Fits | Notes |
|---|---|---|
| Columnar stores (ClickHouse etc.) | Large-scale tick analytics, backtest data retrieval | High compression, fast aggregations; the industry mainstream |
| Time-series DBs (TDengine / InfluxDB) | Metric monitoring, lightweight market data | Time-indexed; good for monitoring workloads |
| File archives (Parquet / custom binary) | Cold storage of full raw data | Raw ticks keep every field, for rebuilds and backfills |

### 8.2 Storage design essentials

- **Tiering**: separate hot data (recent, in-memory/SSD stores) from cold data (history, compressed archives); backtesting usually reads cold data.
- **Key fields**: symbol, exchange timestamp, local receive timestamp, last price/volume, order book, and the "event sequence number" — the sequence number is the key to debugging gaps later.
- **Completeness checks**: count rows and sequence continuity per day/per contract; generate gap lists automatically and support backfilling by gap.
- **Why store historical ticks**: historical tick data is the gold mine of quant research — backtest precision, slippage modeling, market microstructure studies, and signal mining for new strategies all depend on it. **Market data is a real-time, one-shot resource; once missed it is gone — land it on disk.**

---

## 9. Market Data Latency Measurement

- **Local timestamp comparison**: record local receive time − exchange timestamp (NTP sync required first); the simplest end-to-end latency estimate. Mind the precision and semantics of exchange timestamps (ms/µs, generated before or after matching); use the numbers for relative comparison only.
- **Event interval method**: monitor the receive interval of the same event over two paths of the same source (e.g., dual channels) to detect single-path jitter.
- **Sequence number method**: exchange sequence numbers neither jump nor repeat (or advance by rule); continuously monitoring sequence continuity exposes drops and reordering.
- **Load baseline**: before go-live, measure "gateway processing time P99 under market data bursts"; P99 degradation during bursts is a common incident — load-test the gateway before launching.

> Latency measurement must become **continuous monitoring** (an SRE alert item), not a one-off test at launch — network jitter and OMS changes both degrade latency silently.

---

## Risk Warning

::: warning ⚠️ Risk Warning
The most dangerous market data incident is not "data arrived late" but **"looks normal while the data is wrong"**: a reconnect fails without an alert, the frontend displays a stale snapshot, yet the strategy trades on it; an incremental gap goes undetected, the rebuilt book drifts ever further, and a market-making strategy quotes two-sided prices off a corrupted book. Treat "market data freshness" and "sequence continuity" as monitoring indicators on par with funds, and when market data is interrupted you must simultaneously freeze any automated trading that depends on it (or trigger the risk circuit breaker; see [05-risk-systems.md](risk-systems.md)).
:::
