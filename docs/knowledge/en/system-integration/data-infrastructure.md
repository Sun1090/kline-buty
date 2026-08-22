---
title: "Data and Infrastructure"
description: "A full view of trading system data architecture, covering storage selection, message middleware, monitoring and alerting, and deployment architecture."
---

# Data and Infrastructure

> A trading system is a data-driven system: market data must be ingested with low latency, order data must never be lost, funds data must be accurate to the cent, and historical data must support backtesting and research. This article covers the trading system's data architecture from an engineer's perspective: storage selection, message middleware, task scheduling, monitoring and alerting, deployment architecture, and security/compliance.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution.

---

## 1. The Trading System's Data Landscape

| Data category | Content | Characteristics | Storage solution |
|---|---|---|---|
| Market data | Tick-by-tick trades, order book snapshots, candlesticks, indices | Massive volume, write-heavy, append-only | Time-series database / Parquet sharded files |
| Order data | Order placement/cancel/fill reports, order status | Structured, strongly consistent, audit requirements | Relational database (MySQL/PostgreSQL) |
| Funds data | Account balances, positions, **<mark>margin</mark>**, transaction ledger | Highest consistency requirements, multi-currency | Relational database + ledger-style transaction tables |
| Financial & fundamentals data | Earnings reports, valuations, dividends, announcements | Low frequency, unstructured + structured | Relational database + object storage (announcement PDFs) |
| Alternative data | Sentiment, news, on-chain data, fund flows | High noise, many formats | Search engines / graph databases / object storage |

### 1.1 Market Data (the biggest storage burden)

- Futures tick-by-tick: roughly a million records per instrument per day; whole-market multi-year archives reach terabytes.
- Candlesticks can be pre-aggregated and stored per interval (1m/5m/15m/1h/1d), drastically reducing query load.
- **Separate reads and writes**: real-time writes go to a hot store (memory/SSD); history is cold-stored (Parquet + object storage), and backtests read cold data directly.

### 1.2 Order and Funds Data (strong consistency is key)

- Order table design essentials: state machine field (submitted → accepted → partially filled → filled → canceled), mapping to exchange order IDs, raw message snapshots (for reconciliation).
- Funds/position updates must be **ledger-based**: only "balance change journal + summarized balance" structures are allowed; never overwrite balance fields directly — otherwise reconciliation is impossible.

::: warning ⚠️ Never overwrite balance fields directly
**Funds/position updates must be ledger-based: only "balance change journal + summarized balance" is allowed; never overwrite balance fields directly — otherwise reconciliation becomes impossible.** An account balance isn't maintained by one UPDATE statement; it's accumulated entry by entry from the journal — that's the only reliable way to achieve "strong consistency" in funds data.
:::

---

## 2. Time-Series Database Selection

| Option | Write performance | Query capability | Compression | Best fit |
|---|---|---|---|---|
| ClickHouse | Very high (columnar batch writes, millions of rows/sec per node) | Very strong (SQL aggregation over massive history) | High (columnar + encoding, up to 10:1) | Historical market data archive, large-scale factor computation, backtest warehouse |
| TimescaleDB | High (PostgreSQL extension, inherits the PG ecosystem) | Strong (standard SQL + continuous aggregates) | Medium-high | Small-to-mid market data, same stack as business DB |
| InfluxDB | High | Medium (Flux queries, standalone ecosystem) | Medium | Lightweight storage of monitoring metrics (CPU/memory/latency) |
| Parquet files + object storage | Batch writes (not real-time) | Medium (needs a query engine like DuckDB/Spark) | High | Historical archive, offline research, backtest datasets |

Selection conclusions:

- **Real-time hot data** (today's ticks, order books): Redis/in-memory or a high-performance TSDB over short windows.
- **Historical archive** (backtests, factor research): ClickHouse or Parquet + DuckDB are the mainstream answers.
- **Monitoring metrics**: Prometheus is itself a time-series store; no need to stack InfluxDB on top.
- Don't force MySQL to absorb raw tick writes; it becomes the bottleneck fast.

---

## 3. Real-Time Cache and Messaging

### 3.1 Redis: Real-Time State Cache

| Use | Notes |
|---|---|
| Market data cache | Latest price/order book stored in Redis; written by the market data gateway, read by strategies/frontend — offloads the database |
| Distributed locks | Order deduplication, preventing duplicate orders |
| Rate-limit counters | Sliding-window counts against exchange API limits (N per second) |
| Session/state cache | Position snapshots, strategy run states |

### 3.2 Kafka: The Event Bus

In a trading system Kafka plays the role of a **decoupling bus**: market data ingestion, order execution, risk controls, settlement, and reporting don't call each other directly — they publish/subscribe to events.

```text
Exchange WebSocket ──> market data gateway ──> Kafka[tick] ──> strategy engine / risk controls / frontend quotes
Trading gateway ─────────> Kafka[order-req] ──> exchange API ──> Kafka[order-rpt] ──> strategy / risk controls / settlement
```

**Why decouple via Kafka?**

- **Producers and consumers are separated**: if the market data gateway dies, consumers (strategies) are unaffected; adding a new consumer (e.g., risk controls, research archiving) requires no producer changes.
- **Peak shaving**: when market data bursts (volume spikes in extreme markets), messages buffer in Kafka while consumers process at their own pace.
- **Replay**: after a strategy restarts it can replay market data from a given offset in a topic — natural support for state recovery and post-mortems.
- **Multi-replica**: no data loss (with acks=all), satisfying the "zero loss" requirement for order events.

### 3.3 Message Design Essentials

- Order events must be **idempotent**: replaying the same event multiple times must not create duplicate orders (dedupe by clientOrderId).
- Topic naming conventions: `market.<symbol>.tick`, `order.<account>.report` — easier management and permission isolation.
- End-to-end acknowledgement: downstream consumers write a "processed" marker, or restarts reprocess everything.

---

## 4. Task Scheduling and Batch Processing

### 4.1 Scheduling Options

| Option | Fit | Notes |
|---|---|---|
| Cron (single machine) | Simple timed jobs | Single point of failure; tasks die with the machine |
| Celery beat / APScheduler | Python ecosystem | Timed jobs + queue distribution, good for medium complexity |
| Airflow / DolphinScheduler | Complex DAG dependencies | When tasks have ordering dependencies (settle before reporting) |
| In-house scheduler + Kubernetes CronJob | Maximum control | Containerized; failed tasks auto-retry |

### 4.2 Typical Post-Close Task Chain (futures/equities)

```text
Close ──> end-of-day market data archive ──> reconciliation (exchange positions/funds vs local)
     ──> settlement (fees/margin/P&L) ──> report generation (daily statements/performance)
     ──> data backup ──> factor updates/backtest daily batch
```

> Every task must be: idempotent (re-runnable), time-bounded, alerted, and logged. If reconciliation fails, a human steps in **the same day** — never silently ignore.

---

## 5. Monitoring and Alerting

### 5.1 The Three-Piece Stack

| Component | Role |
|---|---|
| Prometheus + Grafana | Metrics collection and visualization: processes, latency, success rates, queue backlog |
| Logging (ELK / Loki) | Centralized logs: trace order chains, error stacks |
| Distributed tracing (Jaeger / SkyWalking) | Full-path timing of one order, gateway → exchange → back |

### 5.2 Core Metric Checklist

| Metric | Definition/calculation | Healthy line (example) |
|---|---|---|
| Market data latency | Exchange timestamp → local gateway receipt | < 100ms (regular WebSocket), < 5ms (matching-grade) |
| Feed outage | N consecutive seconds without new data | 0 occurrences/day |
| Order success rate | Successful orders / total submitted | > 99% |
| Order timeout rate | Submitted but no report within timeout / total | < 0.1% |
| API error rate | Exchange API errors / requests | < 1% |
| Rate-limit hit rate | Retries triggered by rate limiting | Lower is better; > 1% means check frequencies |
| Funds deviation | Exchange balance vs local balance | Must always be 0 |
| Cancel failure rate | Cancels not confirmed within timeout / cancels | < 1% |
| Queue backlog | Kafka topic consumer lag | Real-time topics < a few hundred messages |

### 5.3 Alert Severity Levels

| Level | Channel | Examples |
|---|---|---|
| P0 (immediate) | Phone + SMS | Funds mismatch, strategy running amok, network loss |
| P1 (within 5 minutes) | IM group @ | Feed outage, order success rate drop, rate limiting |
| P2 (same day) | IM + ticket | Elevated latency, delayed reporting |
| P3 (weekly meeting) | Weekly report | Capacity warnings, optimization suggestions |

---

## 6. Deployment Architecture

### 6.1 Standard Setup: Docker + Kubernetes

| Layer | Component | Notes |
|---|---|---|
| Containerization | Docker | Uniform environments, no more "works on my machine" |
| Orchestration | Kubernetes | Rolling updates, self-healing, elastic scaling |
| Network | Service Mesh / Ingress | Inter-service communication and traffic governance |
| Config | ConfigMap / env vars | Exchange keys, fee rates externalized |
| State | PVC / external storage | Core trading system state must not depend on container-local disks |

> Deployment discipline for trading processes: **state must be reconstructable**. Positions and order status live in external storage or can be rebuilt via Kafka replay; containers may be killed and restarted at any time.

::: tip 💡 State must be reconstructable — containers may be killed and restarted at any moment
**State must be reconstructable.** Positions and order status live in external storage or can be rebuilt via Kafka replay; containers may be killed and restarted at any time — if one container restart requires manual position recovery, your system isn't ready for production.
:::

::: tip 💡 Deployment principle: solve correctness first, then talk about latency
**Solve correctness first, then talk latency.** For most quant strategies (mid-to-low frequency), the difference between 100ms and 1ms doesn't matter; first guarantee the system drops no orders, places no duplicates, and reconciles cleanly. Infrastructure priorities should be: data not lost, orders not duplicated, funds reconcilable, failures recoverable — latency and throughput come second.
:::

### 6.2 Advanced Options: Low-Latency Deployment

| Option | Problem solved | Cost |
|---|---|---|
| Colocation (same data center) | Same facility/availability zone as exchange servers, cutting network latency from tens of ms to <1ms | Expensive, high ops demands; only needed by HFT strategies |
| Dedicated line | Stable bandwidth, low jitter, less variance than public internet | Billed per bandwidth |
| Nearby availability zone | Same cloud provider and region as the exchange; enough for ordinary quant | Nearly free; do this first |

> Deployment principle: **solve correctness first, then talk latency**. For most quant strategies (mid-to-low frequency), the difference between 100ms and 1ms doesn't matter; first guarantee no dropped orders, no duplicate orders, clean reconciliation.

### 6.3 Disaster Recovery and Drills

- Dual data centers / multi-cloud should at minimum provide a backup route for the "exchange API path".
- Regular drills: traffic failover when the primary gateway dies, database primary-replica switchover, Kafka partition rebuild.
- Backup policy: daily full backups of order and funds data plus real-time binlog sync, stored off-site.

---

## 7. Network Security

| Topic | Best practice |
|---|---|
| Encrypted key storage | Encrypt keys (AES/GCM) and store them in an external secret manager (Vault/KMS); never log environment variables |
| Key isolation | Separate trading keys from read-only keys; independent keys for production/test; least privilege |
| Signature algorithms | Exchanges typically require HMAC-SHA256/Ed25519: timestamp + request params signed with the key; timestamps guard against replay (valid ~5 minutes) |
| IP allowlists | Configured on the exchange side: only company egress IPs may call withdrawal/trading endpoints |
| Multi-factor authentication | Force MFA (TOTP/SMS) for admin consoles and withdrawals |
| Withdrawal approval | Withdrawals require manual dual review — never allow automated programmatic withdrawals |
| Auditing | Log every administrative action (who, when, what); audit key rotation periodically |
| Network isolation | Keep strategies/risk controls/counters on private networks; expose only necessary entry points like the market data gateway |

> Almost every security incident in trading systems comes down to "human" error: a key printed into logs, a key committed to Git, a test key holding withdrawal permissions. **Least privilege + key rotation + audit trails** are the three non-negotiable lines.

::: danger 💀 Withdrawals go through manual dual review — automated withdrawals are never allowed
**Withdrawals require manual dual review; programmatic automatic withdrawal is never allowed.** Almost every security incident in trading systems is "human" error: a key printed into logs, a key committed to Git, a test key with withdrawal permissions. Least privilege + key rotation + audit trails are the three lines you cannot cross.
:::

---

## 8. Data Compliance

| Topic | Points |
|---|---|
| Personal information protection | Encrypt sensitive data like phone numbers/ID numbers at rest, mask on display; comply with local regulations such as China's PIPL |
| Trade record retention | Retain orders, fills, and fund flows per regulatory requirements (China's Securities Law etc. generally requires ~20 years; overseas markets differ — verify locally) |
| Cross-border data transfer | Data export requires filing/assessment (per Chinese cross-border compliance rules); store domestic and foreign data in separate domains |
| Data minimization | Collect only business-necessary data; regularly purge expired sensitive data |
| Trails and audit | Tiered data access permissions, access logging on sensitive data, cooperation with regulatory inspections |

> Compliance matters must be reviewed with legal and compliance professionals; this article provides only an engineering checklist and is not legal advice.

---

## 9. Data Quality and Governance

- **Market data quality checks**: abnormal prices (jumps beyond thresholds), out-of-order timestamps, duplicate pushes — validate in real time + alert; tag bad data that reaches the store.
- **Data versioning**: recomputed/repaired market data must bump versions; bind backtest results to data versions, avoiding "same code, different results".
- **Metadata management**: instrument contract info (multipliers, tick sizes, trading sessions) maintained centrally, referenced everywhere without redefinition.
- **Reconciliation system**: three automated layers — market data (candlesticks recomputable), orders (exchange reports vs local), funds (daily three-way reconciliation: exchange/clearing house/local).

---

::: warning ⚠️ Risk Warning
A trading system must be highly available, highly consistent, and highly secure: one duplicate order, one undetected feed outage, or one leaked key can cause real-money losses far beyond ordinary software bugs. Infrastructure priorities should be: **data not lost, orders not duplicated, funds reconcilable, failures recoverable** — latency and throughput come second. Every monitoring metric and every drill plan should be validated repeatedly before a real failure arrives. This article is for engineering learning and reference only and does not constitute investment advice.
:::
