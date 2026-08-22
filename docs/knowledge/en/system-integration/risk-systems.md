---
title: "05 · Risk Controls and Capital Management: The Last Line of Defense Must Be Your Own"
description: "Client-side risk control architecture, covering pre-trade checks, circuit breaker design, exception handling, and audit trails."
---

# 05 · Risk Controls and Capital Management: The Last Line of Defense Must Be Your Own

> Across all integration projects, the sentence clients say most is "doesn't the exchange/OMS already have risk controls?" — the biggest misconception. OMS/exchange risk controls are the **floor** (**<mark>forced liquidation</mark>**, limit breaches, abnormal trading monitoring), not the guardrail: they only guarantee "no systemic risk", never "your strategy won't lose money".
>
> This article covers why the client-side risk layer must exist, which modules it consists of, what happens before and after order submission, how exceptions are handled, how the circuit breaker is designed, how the audit trail is kept, and the architecture red lines of the risk system.

---

## 1. Why the Client Must Have Its Own Risk Layer

| Dimension | OMS/exchange risk controls | Client-side risk controls |
|---|---|---|
| Positioning | The floor: prevent **<mark>negative equity</mark>**, prevent market manipulation | The guardrail: keep this account/strategy from losing beyond tolerance |
| Parameters | Fixed or set by the OMS; not strategy-facing | Configurable per strategy, per account |
| Response | Delayed (manual/low-frequency checks); forced liquidation is the last resort | Millisecond-level, pre-trade blocking |
| Coverage | Insufficient funds, abnormal trading behavior | Strategy-level **<mark>stop-loss</mark>**, portfolio exposure, frequency, blocklists… the OMS never covers these |
| Responsibility | Keeps the exchange/clearing safe | Keeps the client's/company's own money safe |

Three reasons you must build your own risk controls:

1. **The OMS doesn't block "losing money"**: your strategy stops out 20 times in a row and the account draws down 30% — the OMS doesn't care; as long as the money lasts and no rule is broken, it has no duty to stop you out.
2. **OMS blocking comes at a cost**: rejection for insufficient funds is already "after the fact"; forced liquidation is the last resort with huge **<mark>slippage</mark>**. Client-side pre-trade checks turn "rejection" into "blocking" and "forced liquidation" into "voluntary stop".
3. **Bugs get amplified**: strategy code bugs, misconfigured parameters, bad market data — the OMS knows none of this; only client-side risk controls can kill a wrong order before it reaches the OMS.

> In one sentence: **OMS risk controls are the fire brigade; client-side risk controls are the fireproof material.** However good the fire brigade, you shouldn't need a fire to remember fire safety.

::: danger 💀 OMS risk controls are the fire brigade, client risk controls are the fireproof material
**OMS risk controls are the fire brigade; client-side risk controls are the fireproof material.** The OMS doesn't block "losing money" — your strategy stops out 20 times in a row and the account draws down 30%, and the OMS doesn't care; as long as the money lasts and no rule is broken, it has no duty to stop you out. Bugs get amplified; only client-side risk controls can kill a wrong order before it reaches the OMS.
:::

---

## 2. Risk Module Checklist

### 2.1 Funds risk controls

- **Balance checks**: available funds, frozen funds, **<mark>margin</mark>** usage — any shortfall blocks immediately.
- **Freezing**: freeze estimated margin at order submission; release on fill/cancel — freeze logic must stay consistent with OMS settlement (how **hedging** and locked positions are treated differs per OMS; per OMS rules).
- **Spendable quota**: account/strategy-level loss budgets (e.g., "this strategy may lose at most 50k today"); once exhausted, stop.

### 2.2 **Position** risk controls

- **Max lots**: three-level caps per order, per strategy, and account-wide.
- **Per-instrument cap**: position cap per contract/product (long and short counted separately).
- **Concentration**: cap on a single product's share of account equity, preventing "one product blows up everything".
- **Total exposure**: account-wide margin usage and notional exposure caps on aggregate positions.

### 2.3 Frequency risk controls

- **Orders per second/minute**: prevents strategy infinite loops or retry storms.
- **Cancel rate / order-to-cancel ratio**: frequent placing-and-canceling gets flagged by exchanges as abnormal trading behavior (domestic futures monitor this and may restrict trading codes); the client must throttle proactively.
- **Duplicate order detection**: automatically block (unintended) repeated orders on the same instrument by the same strategy within a short window.

### 2.4 Stop-loss risk controls

- **Strategy-level forced exit**: strategy loss crosses a threshold → the client proactively closes all of that strategy's positions.
- **Max-loss circuit breaker**: account daily/total loss crosses a threshold → circuit breaker (see section 6).
- **Per-order stop**: attach a stop condition to every order the strategy places; on trigger, the risk module places the stop order on its behalf (not relying on the strategy itself, which may already have crashed).

---

## 3. Pre-Order-Submission Check Flow

The risk gate must sit **serially** in front of every order request; failing any single gate blocks immediately:

```text
Strategy/user order intent
        │
        ▼
① Funds gate: available funds ≥ estimated margin + fees + buffer?
        │ no → block
        ▼
② Position gate: after this order, are per-order/per-instrument/
   per-strategy/account-wide limits exceeded?
        │ no → block
        ▼
③ Frequency gate: rate, cancel rate, duplicate-order checks passed?
        │ no → block
        ▼
④ Block/allowlist + manual approval: is the instrument on the banned list?
   Do large/special orders need approval?
        │ no → block (enter the approval queue)
        ▼
Release → into the trading interface (see 04 for the order flow)
```

**Design essentials**:

- Pre-trade check data (funds, positions, freezes) shares **one source** with the account service: use the account service's real-time state, not each strategy's own copy (copies are necessarily stale).
- Check rules are **configuration-driven**: risk parameters (limits, thresholds, lists) can be changed online with immediate effect, no release needed.
- Blocks carry **reason codes**: every block records "which gate, which parameter, which value exceeded which limit" — the foundation of auditing and tuning.
- The risk check's own failures must be **fail-closed**: risk service unavailable or check timed out → **block by default** (no order without risk checks), never release by default.

::: tip 💡 The risk check's own failure must fail closed
**Risk service unavailable or check timed out → block by default (no order without risk checks), never release by default.** The risk check's own failure must fail closed — this is the red line of risk architecture; otherwise one dead gate equals a dead defense line.
:::

---

## 4. Post-Submission Real-Time Monitoring

### 4.1 Position and funds monitoring

- **Floating P&L**: recompute each position's floating P&L on live market data and compare against strategy expectations; large deviation means the strategy logic or the market data is wrong.
- **Margin usage**: warn as it approaches the available funds ceiling; highest-priority alert near the **liquidation line** (the client must compute its own **liquidation price** — never wait for the OMS to notify).
- **Fund flow monitoring**: anomalies in deposits/withdrawals, fees, settlement P&L (changes when none should occur) → alert.

### 4.2 Monitoring dashboard and large positions

- **Monitoring dashboard**: a real-time panel across all accounts and strategies: position count, open order count, failures, funds, daily P&L, risk block count.
- **Large-position surveillance**: for accounts concentrated in one instrument, watch closely when the market moves abnormally; on threshold breach, automatically cut **<mark>leverage</mark>** or reduce positions proactively.

### 4.3 Strategy behavior monitoring

- A strategy that "fails to act when it should" (signal generated but no order sent / order rejected), orders resting unfilled for long, or delayed report handling are all early signals of strategy anomalies — they surface problems earlier than watching P&L.

---

## 5. Exception Handling

### 5.1 Interface timeout-retry strategy

- Use "query-first, idempotent retry" (see [04](order-lifecycle.md) 5.2): query the order before deciding to resend or mark unknown.
- **Cap retry count and interval**: beyond the cap → mark "unknown state" + freeze operations on that order + manual intervention.

### 5.2 Cleaning up orders that failed mid-flight

- Orders whose submission timed out with unknown state: enter a "pending confirmation queue" and keep confirming via the query interface; if confirmed filled, book into positions; if confirmed unfilled, resubmit or abandon per intent.
- Cancel failed (order already filled): correct the state per the trade report; never force-close it as "cancel succeeded".

### 5.3 Power/network loss recovery flow

```text
Power/network loss / abnormal process exit
        │
        ▼
Process restart → pull the day's full orders, fills, positions
from the OMS/exchange
        │
        ▼
Rebuild local state → compare local state with the OMS →
handle discrepancies (backfill reports / manual)
        │
        ▼
Risk module self-check (rule loading, config validation, gates available)
        │
        ▼
Recovery order: read-only first (market data + queries) → confirm correct
→ then resume order submission
        ▼
No automated trading during recovery; the whole recovery sequence is logged
```

> The iron rule of recovery: **"restore state first, restore trading second"**. Resuming automated trading right after a restart is driving blindfolded (see bug #7 in the 04 bug list).

::: danger 💀 Resuming automated trading right after restart is driving blindfolded
**Restore state first, restore trading second.** After power loss, network loss, or abnormal exit, the local state on restart is stale; resuming automated trading immediately is driving blindfolded — go read-only first (market data + queries) to confirm the state matches the OMS, then resume order submission, with no automated trading during recovery.
:::

---

## 6. Circuit Breaker Design

### 6.1 Three-level circuit breakers

| Level | Scope | Trigger examples | Action | Recovery |
|---|---|---|---|---|
| Strategy | One strategy | Strategy's daily loss over threshold / N consecutive failures | Stop the strategy; proactively close its positions (optional) | Human confirms, then restart |
| Account | One account | Account daily loss/total drawdown over threshold / margin near the liquidation line | Stop all strategies on the account; only close-only orders allowed | Human review + authorized recovery |
| Global | All accounts | System abnormality (market data outage, reconciliation discrepancy, risk system failure) / firm-wide daily loss threshold | Stop all automated trading; all in-flight orders go manual | Two-person confirmation + post-mortem report |

### 6.2 Design essentials for triggers and recovery

- **Triggers must be computable and unambiguous**: computed from "real-time funds + real-time positions + real-time market data", never from numbers reported by strategies.
- **Breaker actions must be blunt**: after tripping, the system retains exactly two operations — query and close; all automated opening and adding are disabled.
- **Recovery must be human**: only people restore a breaker, ideally with "two-person authorization" (one restores, one reviews).
- **The breaker itself needs degraded paths**: the breaker command channel must be independent of the trading channel (if the trading channel is down the breaker can't get through — fall back to manual intervention on the OMS side).

---

## 7. Audit Trail

### 7.1 Full-chain logs

Every order, from creation to termination, must leave a complete chain answering four questions:

```text
Who? → user/strategy/signal source (strategy ID, version)
When? → timestamp (UTC, millisecond) + trading day
What? → request parameter snapshot (instrument, side, qty, price,
        order type, clientOrderId)
Result? → state and raw report text at every step (original
        messages retained)
```

### 7.2 Suggested log structure

```text
{
  "event": "order_insert",            // event type
  "trace_id": "1f9c…",                // full-chain trace ID
  "ts_utc_ms": 1723708800123,         // client time
  "trade_day": "20260817",            // trading day
  "account": "acc-001",
  "strategy": {"id": "s-07", "version": "v2.3.1"},
  "order": {
    "client_order_id": "…",
    "exchange_order_id": "…",
    "symbol": "rb2610", "side": "BUY", "qty": 5,
    "price": 3500.0, "type": "LIMIT"
  },
  "gate": "funds-gate",               // risk path record
  "result": "ALLOW", "reason": null,
  "raw_response": "<raw OMS report text>"
}
```

### 7.3 Retention and access control

- **Suggested retention**: market data and fill details ≥ 3 years (regulatory needs and post-mortems); risk decision records and parameter changes ≥ 3 years and **tamper-proof** (append-only; UPDATE/DELETE forbidden).
- Access control: log storage has its own permissions; risk and audit logs are visible only to risk/compliance; trading developers have no read access by default.

---

## 8. Risk System Architecture Recommendations

### 8.1 Independent process, independent of strategy code

- The risk service is **deployed independently**, decoupled from strategy and trading processes: a strategy crash must not affect risk controls; a risk crash triggers fail-closed blocking.
- Risk code and strategy code live in **separate repositories**; risk changes go through their own review and release process.

### 8.2 Configuration-driven

- All limits, thresholds, lists, and breaker parameters are **configuration-driven** (database/config center), supporting online changes with immediate effect and a change trail.
- Every parameter change records "who, when, old value, new value, reason" — every risk parameter change may be the origin of an incident and must be a subject of post-mortems.

### 8.3 Cold standby and redundancy

- The risk service runs **at least two instances**; primary-backup switchover must not open a "no-risk-controls window".
- The standby also pulls account state and market data continuously, so that after switchover it **has complete state immediately** instead of warming up from zero.
- Regular drills: breaker drills, fail-closed drills, cold-standby switchover drills — drills are a go-live precondition (see the milestones in [01](integration-overview.md)).

### 8.4 Risk ↔ reconciliation linkage

- The risk system's "block records" link with "reconciliation discrepancies" (see section 7 of article 04): while a reconciliation discrepancy is unresolved, risk keeps that account/instrument in **close-only mode**.

---

## Risk Warning

::: warning ⚠️ Risk Warning
The risk layer usually fails not by "having no risk controls" but by "risk controls as decoration": thresholds looser than the strategy's normal losses (equivalent to no blocking), nobody knowing who changed which risk parameter, strategies still placing orders after the breaker tripped, no audit trail so post-mortems are impossible. Treat risk controls as the one module where **"close enough" is never allowed**: parameters tightening over time is the norm, recovery must be human, and the trail must be append-only. In real incidents the most expensive thing is not the money lost but being unable to answer afterwards "which parameter, at what moment, changed by whom, and why wasn't it blocked" — the audit trail exists to answer exactly those questions.
:::
