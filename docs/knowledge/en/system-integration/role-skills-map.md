---
title: "08 · Role Skills Map"
description: "A panoramic guide to the eight core roles on a trading system team: responsibilities, hard skills, tech stacks, and career paths."
---

# 08 · Role Skills Map

> What kind of people does a trading system team need? Quant researcher, quant trader, strategy engineer, backend engineer, frontend engineer, SRE, risk engineer, compliance — this article lays out each role's responsibility boundaries, hard skills, tech stack, career path, and common interview questions in one pass, plus the 4–6 person minimum configuration for startup teams.
>
> **Disclaimer**: All content on this site is for learning and research only and does not constitute investment advice. Markets carry risk; invest with caution.

---

## 1. The Eight Core Roles

### 1.1 Quant Researcher

**[Responsibilities]**
- Propose and validate trading hypotheses: find factors, run statistical analysis, construct strategy logic.
- Own factor research and evaluation (IC/IR/stratified backtesting), deliver a "strategy specification" to traders and engineers.
- Track performance of deployed strategies and keep iterating factors.

**[Hard Skills]**
- Math/statistics: probability, regression, time series, cointegration testing, Bayesian methods.
- Python-first (pandas/numpy/scipy); PyTorch is a plus; SQL is mandatory.
- Financial markets literacy: know what volume, depth, **<mark>margin</mark>**, and **<mark>basis</mark>** actually mean.

**[Common Tools/Tech Stack]**
- pandas / numpy / scipy / statsmodels / sklearn / LightGBM / PyTorch.
- Jupyter Notebook (research) + Git (version control) + a backtesting platform (backtrader/vn.py/in-house).

**[Career Path]**
- Factor researcher → multi-factor portfolio researcher → strategy lead/PM → head of quant.

**[Common Interview Questions]**
1. Explain the difference between IC and IR — what does low IR with high IC suggest?
2. Your factor's backtest IC is very high — how do you rule out overfitting?
3. Describe one time you validated a strategy and it failed; how did you attribute causes?
4. A daily-frequency factor has annualized IC of 0.03 — after 0.2% round-trip fees, is it still worth pursuing? (Work it out.)
5. Pros and cons of out-of-sample tests vs rolling-window tests?

---

### 1.2 Quant Trader

**[Responsibilities]**
- Take researchers' strategies to live trading: decide execution style, adjust **<mark>position sizes</mark>**, handle extreme markets.
- Monitor the market and make intraday decisions (pause/reduce/switch strategies) — the "final owner" of each strategy.
- Daily reviews, feeding back live-vs-backtest gaps to researchers.

**[Hard Skills]**
- Market feel and discipline: don't panic-chop during losing streaks, don't over-bet during winning ones.
- Order execution experience: when to use market/limit/iceberg/algorithmic orders.
- Collaboration with researchers: translate research language into live rules, feed real-market problems back.

**[Common Tools/Tech Stack]**
- Trading terminals (futures/equities/crypto counters), Excel/Bloomberg-class terminals, internal dashboards.
- Able to read basic SQL and backtest reports; production coding not required.

**[Career Path]**
- Trader → chief trader/mentor → portfolio manager.

**[Common Interview Questions]**
1. In an extreme market (e.g., an opening crash), what's your position management process?
2. A strategy backtests at Sharpe 2.0 but runs at 0.8 live — how do you troubleshoot?
3. How would you execute a large order: straight market, TWAP, or VWAP?
4. How do you decide a strategy should be paused rather than endured?
5. Describe one trade where you broke your own discipline, and what you learned.

---

### 1.3 Strategy Engineer

**[Responsibilities]**
- Productionize researchers' strategy code: testable, tradable, monitorable, gradually releasable.
- Secondary development of backtest frameworks: matching models, parallel backtests, parameter sweeps.
- Implement core trading logic in C++/Rust for low-latency scenarios.

**[Hard Skills]**
- Python engineering + C++/Rust (low-latency track); solid data structures and algorithms.
- Understand matching principles, market data protocols, order state machines.
- Performance optimization: memory layout, cache friendliness, lock-free queues, profiling tools.

**[Common Tools/Tech Stack]**
- C++20 / Rust / Python; CMake, gdb/llvm, perf, flame graphs.
- Backtest engines (in-house or adapted open source), Kafka, Redis.

**[Career Path]**
- Strategy engineer → strategy platform lead → technical lead/CTO.

**[Common Interview Questions]**
1. What states does an order state machine have? What's the flow for canceling after a partial fill?
2. How do you implement a lock-free SPSC queue (or walk through the approach)?
3. Under high-frequency market data pushes, how do you shave peaks without dropping data?
4. How do you ensure your backtest engine's matching matches live trading?
5. Why use Rust/C++ instead of Python for low-latency modules?

---

### 1.4 Backend Engineer

**[Responsibilities]**
- Trading system server side: accounts, orders, risk controls, settlement, reporting microservices.
- Trading gateway development: exchange REST/WebSocket integration, signing, rate limiting, disconnect/reconnect.
- Guaranteeing high availability of core paths: no lost orders, no duplicate orders, clean reconciliation.

**[Hard Skills]**
- One primary language (Go/Java/Python all fine), strong concurrency programming.
- Microservices, message queues (Kafka/RabbitMQ), databases (MySQL/PostgreSQL/Redis).
- HTTP/WebSocket protocol details, idempotency design, distributed transactions.

**[Common Tools/Tech Stack]**
- Go / Java (Spring Boot) / Python (FastAPI); gRPC, Kafka, Redis, MySQL.
- Docker, Kubernetes, Grafana/Prometheus.

**[Career Path]**
- Backend engineer → core trading systems engineer → architect/technical lead.

**[Common Interview Questions]**
1. How do you make an order placement endpoint idempotent (network retries don't duplicate orders)?
2. On WebSocket reconnect, how do you avoid losing market data or order state?
3. How do you design an order status table supporting concurrent updates without dirty data?
4. How does a Kafka consumer achieve "at-least-once + idempotency"?
5. Balance deduction: journal-plus-summary vs direct balance update? Why?

---

### 1.5 Frontend Engineer

**[Responsibilities]**
- Market data visualization: candlesticks, order book depth, trade tape, P&L dashboards.
- WebSocket real-time rendering: page performance under heavy tick updates.
- Order entry UX: quantity/price inputs, risk warnings, confirmation flows, cancel interactions.

**[Hard Skills]**
- TypeScript + React/Vue; Canvas/SVG drawing.
- WebSocket/SSE real-time communication; virtual scrolling, throttling/debouncing, incremental rendering.
- Understand market data protocols: candlestick aggregation, incremental depth diffs.

**[Common Tools/Tech Stack]**
- React / Vue3, ECharts, lightweight-charts (TradingView's open-source candlestick library), Canvas.
- WebSocket libraries (Socket.IO or native), state management (Zustand/Redux/Pinia).

**[Career Path]**
- Frontend engineer → frontend lead/visualization specialist → full stack/technical lead.

**[Common Interview Questions]**
1. How do lightweight-charts and ECharts implement candlesticks differently, and how do you choose?
2. With hundreds of market data pushes per second, how do you keep the page smooth?
3. How do you apply incremental updates to depth instead of full redraws?
4. How do you prevent duplicate order submissions (frontend layer + backend layer)?
5. When the market data feed drops, how should the frontend warn users and degrade gracefully?

---

### 1.6 Site Reliability Engineer (SRE)

**[Responsibilities]**
- Infrastructure: building and maintaining Kubernetes clusters, databases, message queues, monitoring/alerting.
- Capacity planning: scale-out plans for market data bursts; disaster recovery drills.
- SLA guarantees: availability targets for core paths (ordering/market data) and post-mortems.

**[Hard Skills]**
- Linux administration, Docker/Kubernetes, networking (TCP/IP, firewalls).
- Prometheus/Grafana/alert rules, log platforms (ELK/Loki).
- Shell/Python scripting, automation (Ansible/Terraform).

**[Common Tools/Tech Stack]**
- Kubernetes, Helm, Terraform, Prometheus, Grafana, Loki, ArgoCD.

**[Career Path]**
- Ops → SRE → platform engineer/infrastructure lead.

**[Common Interview Questions]**
1. The market data service is CPU-saturated — what's your troubleshooting sequence?
2. How do you design alert rules that avoid "alert storms"?
3. The primary database died — what's the switchover procedure and its risks?
4. Capacity planning: one venue's instrument volume grows 10×?
5. What elements must a production incident post-mortem include?

---

### 1.7 Risk Engineer

**[Responsibilities]**
- Rules engine: encode risk rules (per-order limits, total exposure, max **<mark>drawdown</mark>**, banned instruments) into executable systems.
- Funds modeling: margin calculation, **<mark>forced liquidation</mark>** simulation, stress testing.
- Three-layer risk implementation: pre-trade (pre-order checks) → during-trade (real-time position monitoring) → post-trade (reconciliation & audit).

**[Hard Skills]**
- Understand futures/options margin and forced liquidation mechanics, trading limit frameworks.
- Rules engines (e.g., Drools) or in-house rule systems; real-time computation capability.
- Math: Value at Risk (VaR), stress testing, correlations.

**[Common Tools/Tech Stack]**
- Python/Go, rules engines, Redis (real-time counters), Kafka (event ingestion).

**[Career Path]**
- Risk engineer → head of risk/CRO.

**[Common Interview Questions]**
1. How do you design pre-trade checks whose latency doesn't slow down trading?
2. What risk does a 1-second delay in forced liquidation pose in extreme markets?
3. How do you build a rules engine that hot-reloads and rolls out gradually?
4. How do you layer per-strategy drawdown limits against account-wide drawdown limits?
5. When the risk system itself misfires (false kills/missed kills), what's your safety net?

---

### 1.8 Compliance

**[Responsibilities]**
- Licensing & regulation: track licensing requirements across markets and regulatory updates.
- Anti-money laundering (AML/KYC): customer identity verification, suspicious transaction reporting.
- Trade record retention, cross-border data compliance, regulatory inspection support.

**[Hard Skills]**
- Familiarity with target-market regulatory frameworks (Chinese securities/futures law, crypto jurisdictions, etc.).
- Process/policy design and audit collaboration experience; legal-compliance crossover background.

**[Common Tools/Tech Stack]**
- Compliance management platforms, KYC/AML systems (e.g., Chainalysis), policy document management.

**[Career Path]**
- Compliance associate → compliance manager → head of compliance.

**[Common Interview Questions]**
1. At which points could regulators question your market's KYC process?
2. What are the required retention periods and scopes for trade records?
3. What conditions must cross-border customer data transfers satisfy?
4. How do you design the internal process for suspicious transaction reporting?

---

## 2. Minimum Team Configuration (4–6 Person Startups)

| Headcount | Role split | Notes |
|---|---|---|
| 4 | 1 quant researcher + 1 strategy engineer + 1 full-stack backend (also ops) + 1 frontend (also maintains risk rules) | Tightest setup: trader role doubled by the researcher |
| 5 | Above + 1 dedicated trader/risk owner | Someone dedicated to monitoring and execution |
| 6 | Above + 1 backend (focusing on trading gateway/order path) + 1 SRE | Core path and infrastructure begin separating |

Key division-of-labor principles:

- **Separate research, development, and execution wherever possible**: researchers don't touch production code directly; traders don't edit risk rules directly.
- **Risk responsibility must have a named owner**: small teams most often drop risk controls; assign someone explicitly and write it into KPIs.
- **Backend orthogonality is worth more**: the trading gateway and reconciliation are the "irreversible when wrong" parts — prioritize staffing them.
- Outsourcing candidates: frontend UI, basic ops, compliance consulting can all be externalized; **core paths (ordering, funds, risk controls) cannot be outsourced**.

::: danger 💀 Order permissions, withdrawal permissions, and risk-rule edit permissions must be separated
**Order permissions, withdrawal permissions, and risk-rule modification permissions must be independent of strategy development** — any concentration of role permissions is fertile ground for security incidents. Separate research, development, and execution wherever possible; risk responsibility needs a named owner written into KPIs; core paths (ordering, funds, risk controls) cannot be outsourced.
:::

---

## 3. Recommended Tech Stack Panorama

| Dimension | Recommendation | Rationale |
|---|---|---|
| Language (research) | Python | Unmatched data ecosystem (pandas/scientific computing/ML) |
| Language (trading path) | Go / C++ / Rust | Go offers high dev velocity and a concurrency model fit for gateways; C++/Rust for low-latency modules |
| Web backend framework | FastAPI (Python) / Gin (Go) / Spring Boot (Java) | Match the team's language; FastAPI and Go both handle high concurrency |
| Frontend | React + TypeScript + lightweight-charts | Mature candlestick library; TS keeps long codebases maintainable |
| Database (business) | MySQL / PostgreSQL | Strong consistency, mature ecosystems; funds/orders belong here |
| Database (time-series) | ClickHouse (history) / Parquet+DuckDB (research) | Massive market data queries and backtest throughput |
| Cache | Redis | Market data caching/locks/rate limiting in one stop |
| Message queue | Kafka | High throughput, replayable, multi-consumer — first choice as the orders/market data bus |
| Monitoring | Prometheus + Grafana + Loki | Industry-standard combo with rich community material |
| Deployment | Docker + Kubernetes + Helm | Cloud-native standard, portable |
| CI/CD | GitHub Actions / GitLab CI + ArgoCD | Automated builds, gradual rollouts |
| Secret management | Vault / cloud KMS | Keys never touch code or logs |

> First principle of tech selection: **use what your team knows best**, not what's hottest online. In trading systems stability trumps everything — familiarity directly determines incident probability.

---

## 4. A Learning Path for Engineers Entering the Field

### Stage 0: Finance Fundamentals (2–4 weeks)
- Read this knowledge base's "Fundamentals" and "Trading Systems" sections; understand candlesticks, margin, order types, bid-ask **<mark>spreads</mark>**.
- Learn your target market's (futures/equities/crypto) trading hours, fee structures, price limits, etc.

### Stage 1: Build Your First "Fake Exchange" (4–8 weeks)
- Build a simulator: replay historical market data, write your own matching and account modules.
- Goal: complete the minimal loop "market data → signal → order → fill report → position P&L".

### Stage 2: Integrate Your First Real Exchange (4–8 weeks)
- Pick an exchange with friendly docs (crypto venues generally document best; domestic futures via CTP examples).
- Complete: WebSocket feed → place/cancel orders → order state machine → disconnect/reconnect → reconciliation script.
- Use only **test environments/simulators throughout** — no real money yet.

::: danger 💀 Test environments only throughout — no real money yet
**When integrating your first real exchange, use test environments/simulators exclusively — no real money.** Real money is the most expensive sandbox — even for a single order, wait until the system has run cleanly for a month, reconciles with zero differences, and passes disconnect-reconnect drills before talking live trading.
:::

### Stage 3: Backtesting and Research (4–8 weeks)
- Reproduce a classic strategy (e.g., dual moving average, Bollinger breakout) with a backtest framework; run factor evaluation.
- Practice: fee/**<mark>slippage</mark>** modeling, out-of-sample tests, rolling windows.

### Stage 4: Complete System (ongoing)
- Add monitoring/alerting, logging, pre-trade risk checks, deployment and backup.
- Produce a "from market data to settlement" system design doc — the strongest portfolio piece in interviews.

### Learning Resources
- Courses: Coursera's "Financial Engineering and Risk Management", university MOOC finance courses.
- Docs: your chosen exchange's API docs, official CTP documentation, vn.py/backtrader docs and source code.
- Open source: vn.py (futures), ccxt (multi-exchange interface library), Freqtrade (crypto quant framework), backtrader, vectorbt — **reading source code beats tutorials tenfold**.
- Communities: quant topics on developer forums, GitHub quantitative Awesome lists, exchange developer groups.

### Pitfall-Avoidance Advice
- Don't start with HFT/low latency: make the system correct first, then talk milliseconds.
- Don't invent your own protocol parsers: copy mature open-source implementations first, understand them, then rewrite.
- Don't skip reconciliation: ship a reconciliation script in version one — the earlier, the cheaper.

---

::: warning ⚠️ Risk Warning
A trading team's core asset is "discipline": separation of duties across research, development, execution, and risk matters more than individual heroics. Small teams can double up roles early, but **order permissions, withdrawal permissions, and risk-rule modification permissions must be independent of strategy development** — concentrated permissions breed security incidents. The learning paths and role descriptions here are reference only; actual career requirements and qualifications (e.g., fund/futures practitioner licenses) defer to regulation; this article does not constitute investment advice.
:::
