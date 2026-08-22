---
title: "05 · Algorithmic Trading and Compliance"
description: "Breaks down the unified algorithmic trading rule framework, covering the reporting regime, high-frequency trading supervision, and a compliance checklist for individual developers."
---

# 05 · Algorithmic Trading and Compliance

> Before 2023, algorithmic trading rules in China were "piecemeal": each exchange had its own abnormal-trade monitoring, each broker its own risk-control interpretations. In 2023–2024, new rules from the Shanghai/Shenzhen/Beijing exchanges plus the CSRC's administrative provisions on program trading in securities markets landed in succession — for the first time, algorithmic trading had a nationally unified framework. This article starts from definitions, unpacks the reporting regime, HFT supervision, and foreign experience, then lands on a compliance checklist for individual quant developers.

::: warning ⚠️ Risk Warning
This article is an objective compilation of public knowledge, for study and research only, and **does not constitute legal advice**. Algorithmic trading regulation is being rapidly refined — **reporting obligations, monitoring metrics, and penalty rules are all subject to the latest regulations**. Before live deployment, confirm current practice with your broker/futures company.
:::


---

## 1. What Is "Algorithmic (Program) Trading"

### 1.1 Definition (common framing, subject to the latest regulations)

| Dimension | Common Criteria |
|---|---|
| Core feature | Trading instructions **automatically generated or executed by computer programs** (not manual order-by-order entry) |
| Order speed | Programmatic order latency far below manual (milliseconds) |
| Batch submission | A single strategy **batch-generating and submitting large volumes of orders** within short windows |
| Common forms | Quant strategies, algorithmic order slicing (TWAP/VWAP), high-frequency market making, conditional orders / automated grids |

**Plain judgment**: as long as your buy/sell instructions are **triggered by code** rather than a human clicking through the keyboard, you most likely fall under **<mark>program trading</mark>** — regardless of how simple your strategy is or how low its frequency.

### 1.2 Why It Gets Special Regulation

| Risk | Explanation |
|---|---|
| Instant impact | Massive order piles causing violent price swings (e.g., programmatic amplification of the 2015 crash) |
| False signals | High-frequency cancellations fabricating fake **<mark>liquidity</mark>**, misleading other investors |
| Technical failures | Extreme orders from software bugs (fat fingers, runaway order loops) |
| Fairness | The arms race in infrastructure, speed, and data access widens the gap between institutions and retail |

---

## 2. China's Regulatory Landing (2023–2025 New Rules)

### 2.1 Timeline (common-sense summary)

| Date | Event |
|---|---|
| September 2023 | Shanghai/Shenzhen/Beijing exchanges issued **draft implementation measures for program trading management**, defining the reporting regime and monitoring requirements |
| 2024 | CSRC issued the Administrative Provisions on Program Trading in Securities Markets (Trial): the **ministerial-rule-level framework** for program trading regulation |
| 2024-2025 | Formal implementation measures took effect at the exchanges: **reporting, monitoring, differentiated fees** fully operational |

### 2.2 Core Points of the Administrative Provisions

| Point | Content |
|---|---|
| Reporting regime | Program traders must **fulfill <mark>information reporting obligations</mark> to the exchange** (after account opening, before trading) |
| Abnormal trade monitoring | Exchanges **monitor in real time** features like high-frequency order/cancel bursts and instant large orders, taking self-regulatory measures |
| Differentiated fees | **<mark>High-frequency trading</mark>** faces **differentiated fees** (higher order/cancellation costs), discouraging excessive trading |
| Prohibited conduct | Explicitly bans using program trading to **<mark>manipulate markets</mark>** (spoofing, ramping and slamming, etc.) |
| Gateway management | Management of brokers' in-house system access and trading gateways, preventing risk-control bypass via direct connections |

::: info 📖 Framing note
Operational details (reporting deadlines, indicator thresholds, fee schedules) are subject to the latest regulations — this section only explains the framework logic.
:::

---

## 3. The Reporting Regime in Practice

### 3.1 Who Must Report

| Subject | Report? |
|---|---|
| Institutional program traders (quant private funds, broker prop desks, etc.) | **Yes**, and must designate a person responsible for reporting |
| Individual program traders (personal quant, automated grids, heavy conditional-order users) | Depends on rules: report once you meet the definition of program trading (subject to the latest regulations) |
| Ordinary investors only "clicking manually" in trading apps | Usually not program trading; no reporting needed |

**Key common sense**: **"I'm a retail trader running some Python automation" still requires reporting** — under the current framework, individual program traders are within scope too (subject to the latest regulations and broker practice).

::: warning 🛑 Retail Python Automation Also Requires Reporting
**"I'm a retail trader running some Python automation" still requires reporting.** The current definition ignores identity and looks only at whether code triggers the orders — individual program traders are equally within the reporting obligation's scope.
:::

### 3.2 What Gets Reported (common checklist)

| Item | Content |
|---|---|
| Basic information | Account, actual controller, sources of funds and securities |
| Strategy type | Strategy name and logic type (trend/**<mark>arbitrage</mark>**/market making/HFT etc.) |
| Server location | Where program trading **servers are located**, hosting arrangements (broker data center / own facility) |
| Technical parameters | Order frequency, cancellation ratio, maximum order volume etc. (per rule requirements) |
| Change reports | Changes to strategy, servers, controllers etc. require **timely updated reports** |

### 3.3 Reporting Process and Cooperation Duties

- Report to the exchange **through your broker/futures company** (brokers are the execution gateway).
- Brokers may conduct **compliance reviews** of program traders and restrict access when necessary.
- Consequences of non-reporting or false reporting: exchanges may impose self-regulatory measures such as **trading restrictions**; serious cases referred to the CSRC (subject to the latest regulations).

---

## 4. High-Frequency Trading Supervision

### 4.1 Recognizing HFT Characteristics (common framing)

| Indicator | Common Recognition Direction (subject to the latest regulations) |
|---|---|
| Order rate | Orders per second above a threshold (starting from several per second; exact thresholds per rules) |
| Cancellation ratio | Abnormally high proportion of rapid post-submission cancellations (many orders never filling) |
| Order-to-fill ratio | Submissions vs fills excessively skewed (place 100, cancel 95) |
| Daily cumulative volume | Single-day total orders reaching exchange monitoring thresholds |

### 4.2 Regulatory Tools

| Tool | Logic |
|---|---|
| Differentiated fees | Higher fees on high-frequency order/cancel flows — using cost to suppress meaningless traffic |
| Abnormal trade monitoring | Real-time detection of instant large orders, frequent cancels, ramping/slamming patterns |
| Restrictions | Position limits, trading restrictions, account suspensions (serious cases) |
| Look-through checks | Tracing back to actual controllers, devices, and strategies (echoes look-through supervision; see [china-regulation.md](china-regulation.md)) |

**What it means for individual quants**: ordinary personal strategies (minute-level, second-level frequencies) usually fall far below "high-frequency" thresholds — **most individual strategies are outside HFT supervision's core range**, but that does not waive the reporting obligation.

---

## 5. Foreign Experience

### 5.1 United States: Reg NMS and Fee Models

| Regime | Content |
|---|---|
| Reg NMS (2005) | National Market System rules: **price protection** (best-price priority), locked/crossed market prohibitions, order visibility requirements |
| Reg ATS | Alternative Trading System oversight: dark pools and other ATS must register with and report to the SEC |
| Maker-taker model | Exchanges **pay rebates to liquidity providers (makers) and charge liquidity takers** — fee structures incentivizing market making and passive HFT quoting |
| FINRA HFT surveillance | Surveillance of HFT firms' order traffic and cancellation behavior |

**Key takeaway**: US markets treat HFT as **part of the market structure to be regulated rather than banned** — regulatory focus targets abusive behavior (spoofing, layering), not speed itself.

### 5.2 EU: MiFID II Requirements for HFT

| Requirement | Content |
|---|---|
| Algo identification | Institutions engaging in algorithmic trading must report to regulators |
| Frequency threshold | Quantitative criteria define HFT (order rates, intraday order volume) |
| Market-making obligations | HFT **<mark>market makers</mark>** sign market-making agreements and must **provide continuous liquidity** |
| Circuit breakers & monitoring | Exchanges must have volatility interruptions and abnormal trade monitoring mechanisms |

### 5.3 United Kingdom

- The FCA applies the MiFID II framework to algo/HFT (core requirements retained post-Brexit).
- Emphasis on **algorithm governance**: institutions need complete internal controls over strategy development, testing, deployment, and rollback.

---

## 6. Impact on Individual Quants

### 6.1 Do Individuals Need to Report?

| Scenario | Judgment (subject to the latest regulations) |
|---|---|
| Conditional/grid orders via exchange/broker apps (cloud execution) | Mostly built-in software features executed by the broker's system; generally no separate reporting |
| Writing your own program to place orders via APIs/quant platforms | **Is program trading**; usually requires reporting |
| Strategies used only for **backtesting**, never connected to live accounts | No live trading involved; no reporting needed |

::: tip 💡 Action advice: if unsure, just ask your broker's compliance department
When uncertain, **directly ask the compliance department of your broker/futures company** — the responsibility for whether to report sits with the trader; brokers must assist but won't decide for you.
:::

### 6.2 Consequences of Violations (common-sense summary)

| Situation | Possible Consequences |
|---|---|
| Required but missing reports | Exchange/broker demands rectification; possible restriction of program trading permissions |
| Abnormal trade patterns detected | Inquiries, interviews, trading restrictions (days to months) |
| HFT order+cancel abuse found | Differentiated fees (rising costs) + restrictive measures |
| Manipulation via program trading | Administrative penalties + <mark>criminal liability</mark> (securities/futures market manipulation crime) — the **red line among red lines** |

---

## 7. Compliance Advice for Quant Development

### 7.1 Keep Audit Trails

| Trail Item | Content |
|---|---|
| Order logs | Complete timestamps (millisecond precision), price, quantity, status for every order/cancel |
| Strategy versions | Code version and deployment records for every strategy change |
| Account statements | Reconciled against broker statements, regularly |
| Parameter configs | Historical settings of risk parameters (max order size, max positions, daily loss limit) |

::: tip 💡 Why trails matter: the strongest evidence of your own compliance
When questioned, complete logs and version history are **the strongest evidence that you operated compliantly**; unrecorded trading behavior equals "unexplainable conduct" in regulators' eyes.
:::

### 7.2 Risk Control Thresholds (pre-trade controls)

| Control | Suggestion |
|---|---|
| Per-order limits | Hard caps on max amount/lots per order |
| Position limits | Max position per product, overall position cap |
| Cancellation ratio | Build a **cancellation-ratio ceiling** into the strategy; auto-stop when exceeded |
| Order frequency | Caps on orders per second/minute to prevent runaway loops |
| Loss circuit breaker | Auto-halt trading when daily losses hit the threshold |
| Network disconnect protection | No auto re-submission after disconnects, preventing duplicate orders |

### 7.3 Avoiding Abnormal Behavior Patterns

| Avoid | Why |
|---|---|
| Massive instant submissions followed by mass cancels | Classic "spoofing" suspicion pattern; can be deemed manipulation |
| High-frequency order/cancel loops | Raises surveillance hit rates and differentiated fee costs |
| Splitting across accounts to evade monitoring | Deliberate multi-account/small-order evasion = look-through priority (see [china-regulation.md](china-regulation.md)) |
| Running strategies without risk controls | One bug can turn your strategy into "abnormal trading" itself |

### 7.4 Individual Quant Compliance Checklist (self-check directly)

1. Before going live with automation, confirm with your broker/futures company **whether reporting is required**; if so, complete it.
2. **Report truthfully**: server location, strategy type, account info — update promptly on changes.
3. Build **pre-trade risk controls** into every strategy: five gates for order size/positions/losses/cancel ratio/frequency.
4. Keep complete **order logs and version trails**, reconciling regularly.
5. Never do anything resembling manipulation: **no spoofing, no wash trades, no splitting to evade surveillance**.
6. Follow **the latest exchange and CSRC rules**: detailed measures here are still updating fast.

---

## 8. Supervision Quick Reference

| Dimension | China (current framework) | US | EU |
|---|---|---|---|
| Reporting duty | Yes (via brokers) | Yes (FINRA/SEC) | Yes (MiFID II) |
| HFT definition | Order-rate / cancel-ratio thresholds | Watched by regulators, no unified frequency ban | Quantitative criteria |
| Fees | **Differentiated HFT fees** | maker-taker market mechanism | No unified differentiated fees |
| Manipulation ban | Explicit enumerated prohibited acts | Reg ATS/Reg NMS + anti-manipulation rules | Market Abuse Regulation |

---

## Further Reading

- Engineering implementation of quant strategies: [live-automation.md](../quant-practice/live-automation.md) in [Chapter 15 · Quant Practice](../quant-practice/)
- Risk control architecture and audit trails: [risk-systems.md](../system-integration/risk-systems.md) in [Chapter 10 · System Integration](../system-integration/)
- Look-through supervision and the penalty framework: [china-regulation.md](china-regulation.md)
- Spotting manipulative behavior (wash trades, spoofing in the wild): [manipulation-detection.md](../market-ecosystem/manipulation-detection.md) in [Chapter 12 · Market Ecosystem](../market-ecosystem/)
