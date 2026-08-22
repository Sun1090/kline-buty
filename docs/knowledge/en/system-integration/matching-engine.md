---
title: "Matching Engine Principles: How Orders Become Fills"
description: "Core matching engine principles, covering matching rules, order book data structures, algorithms, and the exchange vs AMM comparison."
---

# Matching Engine Principles: How Orders Become Fills

> The most critical, least-forgivable component of a trading system is neither ordering nor market data — it's matching: how buyers and sellers pair up, in what order they queue, who gets filled first. Ordinary traders only need eight words: "price priority, time priority". Engineers building systems have to expand those eight words into data structures, algorithms, and engineering constraints.
>
> This article starts from the definition of matching, covering matching rules, order book data structures, matching algorithms, advanced topics (market making, limit-up/down queuing, block trades, flash crashes), exchange matching vs blockchain AMMs, and finally design essentials for a matching engine.

---

## 1. What Is Matching

Matching (Matching) is the process of **pairing buy orders with sell orders by rules and determining fill prices and quantities**. In every market, matching boils down to the same question:

> Given the current order book (all unfilled **<mark>limit orders</mark>**) and a newly arriving order, how do you generate a set of fills?

```text
New buy order (buy 100 lots @ 4100) ──▶ matching engine ──▶ fills: best ask 4100 filled 50 lots
                                   │        second ask 4101 filled 50 lots
                                   └──▶ remainder 0 lots (fully filled)
```

| Concept | Definition |
|---|---|
| Order Book | The collection of queues organizing all unfilled limit orders by price |
| Matching Engine | The software/system executing matching rules; an exchange's most core asset |
| Fill/Trade | A buy order successfully paired with a sell order, producing a price and quantity |
| Leaves | The unfilled remainder of an order after a fill, still queued in the book |

> The matching engine's mandate is to turn orders into fills "**legally and reproducibly**" — it doesn't decide whether prices rise or fall, only who gets filled first and at what price. Market making, quoting, and pricing are the business of market participants; the matching engine merely executes the rules.

---

## 2. Matching Rules: Price Priority, Time Priority

### 2.1 Two Iron Rules

The core rules of continuous trading (Continuous Trading), universal worldwide:

| Rule | Content | Plain language |
|---|---|---|
| Price priority | Buy orders: **higher** bids fill first; sell orders: **lower** asks fill first | Whoever offers the better price goes first |
| Time priority | At the same price: **whoever queued first fills first** | Same price, first come first served |

A concrete example (current order book):

| Level | Ask orders |
|---|---|
| Best ask (ask 1) | 4101 × 100 |
| Ask 2 | 4102 × 200 |

- Buy limit order **4101 × 150**: fills 100 against ask 1 (4101), remaining 50 fills against ask 2 (4102) — at fill prices 4101 and 4102 respectively, **fully filled**.
- Buy limit order **4100 × 50**: price below ask 1 (4101), cannot fill immediately → joins the bid queue at level 4100, waiting for the price to come down.
- Buy market order × 100: eats ask 1 directly, 4101 × 100, at price 4101 — **a market order = no price limit, fills immediately against the counterparty's best price**.

### 2.2 Where Limit and **<mark>Market Orders</mark>** Sit in the Matching Queue

| Order type | Enters queue? | Position in the queue |
|---|---|---|
| Limit order (unfilled part) | Enters the book | Filed by price; at equal price, appended to the tail by timestamp (time priority) |
| Market order | **Does not enter the book** | Exists only for the instant of arrival, matched immediately against the counterparty's best price; any remainder that cannot immediately fully fill is handled per exchange rules (partial conversion to limit / direct cancel — defer to each exchange) |

> From this follows an engineering truism: **a market order "jumps the line"; a limit order "waits in line"**. To guarantee a fill with a limit order, cross the counterparty's best price (above ask 1 / below bid 1); at equal price it's purely a race against time.

---

## 3. Order Book Data Structures

### 3.1 Level-2 Depth

The most common structure in exchange feeds: bids 1–5 and asks 1–5 (depth varies by exchange; crypto venues commonly publish 20–100 levels).

| Level | Meaning | Data content |
|---|---|---|
| Bid 1 | Current highest unfilled bid price | Price + total resting quantity at that price |
| Bids 2–5 | Progressively lower bid prices | Same as above |
| Ask 1 | Current lowest unfilled ask price | Price + total resting quantity at that price |
| Asks 2–5 | Progressively higher ask prices | Same as above |

Three key implications of depth:

- **Ask 1 minus bid 1 = the <mark>spread</mark>**, a direct measure of **<mark>liquidity</mark>** quality; bid 1 is the reference price for "selling immediately", ask 1 the reference for "buying immediately".
- Depth is an **aggregated view** (total quantity per price level); you can't see individual orders in the queue — the true tick-by-tick queue is internal data.
- Does depth include hidden portions of iceberg orders? **No** — iceberg orders expose only part; the aggregated view shows only the visible quantity (per exchange rules).

### 3.2 Incremental Updates (add / update / delete events)

Both feed integration and matching engine internals describe book changes via an **event model**:

| Event | Semantics | Example |
|---|---|---|
| add | A new price level appears | First order appears at level 4101 |
| update | Quantity changes at some level | Level 4101 goes from 100 to 80 lots (partial fill / added size) |
| delete | A level empties | Level 4101 quantity hits **<mark>zero</mark>**, the level disappears |

- Clients rebuild/maintain their local book from the event stream; **events must carry sequence numbers** for out-of-order detection and gap filling after disconnects.
- Domestic CTP feeds are mostly "five-level snapshots" (no incremental event sequence, just the latest five levels pushed directly); crypto exchanges' WebSocket `depth` channels are standard incremental event streams (`depthUpdate` events carry price+quantity, quantity 0 meaning delete).

### 3.3 Order Book Rebuild

Incremental event streams have one fatal weakness: "**lose one event and everything misaligns**" — a lost update leaves your local book permanently diverged from reality. Therefore:

- Every depth channel must provide a **rebuild mechanism**: on detecting a sequence gap/reconnect, request a full snapshot (REST depth snapshot), then apply subsequent increments.
- The classic three-step rebuild: fetch full snapshot → record the snapshot's last sequence number → discard stored increments with sequence ≤ that value, apply only newer increments.
- During rebuild, **book-based strategies must pause** — trading on a wrong book is more dangerous than not trading at all.

::: danger 💀 Book-based strategies must pause during rebuild
**During rebuild, book-based strategies must pause — trading on a wrong book is more dangerous than not trading at all.** Lose a single update in an incremental stream and your local book diverges permanently from reality; if a strategy keeps ordering or **hedging** against the misaligned book during that window, every wrong price and wrong quantity turns straight into live losses.
:::

## 4. Matching Algorithms

### 4.1 Simple Matching Loop (Limit Order Arrives)

The most naive core logic (the embryo of any matching engine):

```text
Input: new order (side, price, quantity)
Counterparty queue = if buy, the ask queue; if sell, the bid queue (sorted by price priority, head is best)

while new order has remaining quantity and counterparty queue non-empty and price crosses (bid ≥ ask):
    head order = front of counterparty queue (best price, earliest time)
    fill price = head order's price           # the resting order's limit, not the new order's
    fill qty = min(new order remaining, head order remaining)
    generate fill record; decrement both sides' remainders
    if head order remainder reaches 0: remove from queue (and possibly emit a delete event)

if new order has remaining quantity:
    if limit order: join own-side queue (at equal price, tail of the line — time priority)
    if market order: handle remainder per rules (partial convert-to-limit / cancel)
```

> One crucial detail: **the fill price is always the resting order's limit price**. When a new order sweeps with a better price, it fills at the counterparty's resting price — which is why "a limit order can get you a better price", and the foundation of **<mark>slippage</mark>** analysis.

::: danger 💀 Lose one incremental event and the whole book misaligns forever
**The fatal weakness of incremental streams: lose one event and everything misaligns — a single lost update leaves your local book permanently diverged.** The classic three-step rebuild: fetch full snapshot → record the snapshot's last sequence number → discard stored increments ≤ that sequence, apply only newer ones. Book-based strategies must pause during rebuild — trading on a wrong book is more dangerous than not trading at all.
:::

### 4.2 Continuous Trading Matching (Pseudocode)

Placing 4.1 inside real exchange constraints (continuous trading session example):

```text
while new order received:
    validate (price step, quantity, risk checks) → reject and return REJECTED if failed
    run matching loop (see 4.1)
    emit events: OrderUpdate (status change), Trade (fill), DepthUpdate (book change)
    events broadcast under globally increasing sequence numbers → persisted as an immutable event log
```

Key constraints:

- **Validate before matching**: illegal orders (price out of bounds, invalid quantity) get rejected outright and never enter matching.
- **Event order globally unique**: all subscribers see identical event sequences — this is what guarantees "market data consistency" (see [03-Market Data Systems.md](market-data-systems.md)).

::: tip 💡 Validate first, then match; write the event log before broadcasting
**Validate before matching**: illegal orders (price out of bounds, invalid quantity) are rejected outright without entering matching. **Matching results must be written to the log (WAL) before being broadcast externally** — the event log is "ordered, immutable, replayable": the single source of truth for broadcast, reconciliation, audit, and failure recovery.
:::
- **Determinism**: the same order sequence with the same timestamps must produce exactly the same matching result — the foundation of replay and reconciliation.

### 4.3 Call Auction (Open/Close: Maximum Volume Pricing)

Continuous trading matches order by order; the call auction is "**one batch matched together**", governed by the maximum-volume pricing principle:

```text
1. Collection phase (e.g., A-shares 9:15-9:25): accept orders, no matching
2. Pricing phase:
   sort all bids/asks by price, try each candidate price
   find the price range maximizing executable volume (maximum volume principle)
   when multiple candidates exist, take the one nearest the previous close (secondary rules per exchange)
3. Match: all orders satisfying "bid ≥ open price ≥ ask" execute at the open price; ties broken by time priority
4. Unfilled remainder proceeds to continuous trading (or is canceled, per rules)
```

- **The opening price** emerges from the call auction: simply "the price that fills the most orders" — that's genuinely how real markets determine it.
- Engineering implication: during call auctions **market-type orders are disallowed and order behavior differs from continuous trading** (per each exchange's rules); the closing call auction works the same way (A-shares 14:57–15:00).

---

## 5. Advanced Topics

### 5.1 **Market Makers** and Tick Size

- **Tick Size**: prices must fall on a minimum-step grid (e.g., rebar at CNY 1/ton, BTC crypto at 0.1 or 0.01); the engine validates and organizes queues along the grid.
- **Market makers**: liquidity providers quoting both sides to earn the spread; engines may give maker orders dedicated queues (designated market maker priority) and incentives, but the fundamentals remain price/time priority (special rules per exchange).

### 5.2 Queuing at Limit Up/Down

At price limits, **queuing means something entirely different**:

- **Limit up**: no sellers take the offers; all buys queue awaiting a seller — **queue position = time priority** (first to rest, first to fill). Whether you fill depends on your position in the bid queue, not your price (everyone's price is identical).
- **Limit down**: mirror image.
- For traders: those queuing sell orders at limit up may wait days at the back of the line; for systems: queue position is everything — **when you rest the order matters more than its price**.

### 5.3 Block Trades (Matched Outside the Auction)

- **Block trades**: negotiated off continuous trading — buyer and seller agree price and quantity, report to the exchange, and execute at the agreed price in a dedicated window (e.g., post-close).
- Nature: **off-book pairing** — the exchange performs no price discovery, only clearing-level confirmation and disclosure.
- Engineering implication: block trade reports and market data flags (special trade markers) differ from ordinary fills; feed and reconciliation systems must distinguish them.

### 5.4 Flash Crashes and Matching Latency

- An engine's **latency directly shapes market microstructure**: lower latency narrows front-running windows; matching backlog (processing can't keep up with order flow) is a classic failure mode.
- Typical mechanism of a **Flash Crash**: in extreme markets, cascading triggers of market/**<mark>stop-loss</mark>** orders vaporize liquidity instantly; collapsing depth sends prices plummeting within milliseconds then rebounding — the engine itself faithfully executed the rules, but **the engine's flow control and circuit breakers (e.g., volatility pauses) are the engineering defenses** (per each exchange's rules).

---

## 6. Exchange Matching vs Blockchain AMM

### 6.1 Centralized Matching (Order Book) Recap

| Feature | Order book matching (CEX / futures / equities) |
|---|---|
| Price discovery | Determined by supply/demand in the book |
| Counterparty | Someone's order must pair with yours |
| Fill price | The resting order's limit price |
| Liquidity | Depends on resting participants |

### 6.2 Blockchain AMM (Automated Market Maker)

DeFi protocols like Uniswap replace the order book with a **constant product formula**:

```text
x * y = k

x = quantity of token A in pool, y = quantity of token B in pool, k is constant
Buying Δx of A: pay Δy of B such that (x - Δx) * (y + Δy) = k
```

| Feature | AMM (e.g., Uniswap) |
|---|---|
| Price discovery | Determined by the **quantity ratio** of the two pooled assets (no order book needed) |
| Counterparty | The liquidity pool (assets deposited by LPs on both sides) |
| Fill price | Formula-driven price sliding with trade size: **the more you buy, the more expensive it gets** |
| Liquidity | Pool depth is the liquidity; runs 24×7 |

### 6.3 Slippage and Impermanent Loss

| Concept | Definition | Contrast with order book markets |
|---|---|---|
| Slippage | Deviation between actual and expected execution price | In books: "eating deeper levels"; in AMMs: "formula pricing shifts with trade size" — either way, **bigger trades mean higher slippage** |
| Impermanent Loss | The shortfall of an LP's pooled position versus simply holding both tokens: the further prices drift from deposit ratios, the larger the loss | No direct analogue in order book markets (makers face inventory/spread risk — conceptually similar) |

> One-line comparison: **order book matching is a precise market of human-to-human pairing; an AMM is a deterministic market of human-to-formula pairing**. The former needs liquidity provision; the latter auto-prices through a fixed pool formula — efficiency, transparency, and impermanent loss are the AMM's three big themes.

---

## 7. Matching Engine Design Essentials

If you build your own matching engine (simulated/internal matcher, not a real exchange), the essentials:

### 7.1 In-Memory Order Book

- The book must live **in memory**: price queues via balanced trees/skip lists/priority queues (price-ordered) + FIFO per price level (time priority). Matching is pure memory operation.
- Performance rule of thumb: **microsecond-level latency per match** (real engines measure microseconds to tens of microseconds, implementation/hardware dependent) — any disk I/O or synchronous network calls inside the matching loop are unacceptable.
- Single-threaded order stream processing (lock-free or minimally locked): concurrency correctness comes from serializing the order stream, not from locks.

### 7.2 Event Log (Matching Records Must Not Be Lost)

- **Matching results go to the log (WAL) before external broadcast**: the log is "ordered, immutable, replayable" — the single source of truth for broadcast, reconciliation, audit, and failure recovery.
- Log writes are sequential append-only, decoupled from the matching loop (async batched flush); crash recovery replays the log to rebuild the in-memory book.
- Audit requirements: retention periods follow regulation, records must be tamper-proof.

### 7.3 Performance Metrics

| Metric | Meaning | Rule-of-thumb target |
|---|---|---|
| Per-match latency | Order enters engine to fill event emitted | Microseconds (µs) |
| Matching throughput | Orders processed per second | Tens to hundreds of thousands/sec (implementation dependent) |
| Event-to-broadcast latency | Fill to subscriber visibility | Stacks with network/feed path (see article 03) |
| Availability | Uptime | Target 99.99%+ during trading hours |

### 7.4 Remaining Engineering Points

- Represent price/quantity as integers or fixed-point (never compare floats) — float error becomes unreconcilable books in matching.
- Validate first, risk checks up front; illegal orders must be rejected before entering queues.
- Simulated matchers (in-house mocks) must support **fault injection** (rejections, out-of-order, disconnects) for regression testing — the foundation of the "self-built simulated counter" in [01-Integration Overview.md](integration-overview.md).

---

## Risk Warning

::: warning ⚠️ Risk Warning
The matching engine is the component least tolerant of "close enough": wrong order sorting breaks time priority, floating-point arithmetic makes reconciliation forever miss by a cent, losing the event log destroys replay and audit, and coupling matching logic to broadcast amplifies millisecond failures into system-wide paralysis. Matching rules, flow-control figures, and performance targets here reflect common industry practice — defer to each exchange's rules and official documentation. If you're integrating rather than building one, focus on order book rebuilds, event sequences, and reconciliation — self-building a matching engine is a major engineering undertaking; never put an unproven one directly into production money flows.
:::
