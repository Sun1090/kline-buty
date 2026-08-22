---
title: "Trading Careers Overview"
description: "The previous article covered how to get into quant; this one zooms out: trading-related careers go far beyond quant. Buy-side traders, sell-side market makers, research analysts, risk, middle office, quant developers, systems engineers, algo execution, operations and settlement — each line differs in work content, skill barriers…"
---

# Trading Careers Overview

> The previous article covered how to break into quant; this one zooms out: **<mark>trading-related careers go far beyond quant</mark>**. Buy-side traders, sell-side market makers, research analysts, risk, middle office, quant developers, systems engineers, algo execution, operations and settlement — each line differs in day-to-day work, skill barriers, salary norms, and personality fit.
>
> After reading this article you should be able to answer three questions: **what roles exist on this career map? which seat fits my (personality/skills/education)? and how does the path from retail trader to professional actually work?**


---

## Career Classification Map

| Role | What you do | Core skills | Barrier | Salary basics |
|---|---|---|---|---|
| Buy-side trader (prop/asset management) | Executing strategies, managing **<mark>positions</mark>**, watching markets, collaborating with researchers | Market instinct, discipline, stress tolerance, understanding strategy logic | High: mainly elite degrees + internships, or internal promotion | Base + bonus tied to performance; top institutions pay first-tier |
| Sell-side trader (market making / sales-trading desk) | Quoting two-sided prices, earning the **<mark>spread</mark>**, serving institutional clients, managing inventory and risk | Quote speed, emotional control, client communication | Medium-high: sell-side hiring weighs degrees and resources more | Mostly fixed salary + bonus; stable overall, below top buy-side |
| Research analyst (fundamental/strategy) | Producing investment views and strategies — the "ammunition depot" for traders/PMs | Research frameworks, data skills, written and verbal output | High: credentials + research depth | Base + bonus; not low at top firms; actual market conditions prevail |
| Risk & middle office | Monitoring positions and limits, watching risk metrics, producing daily reports, blocking violations | Rigor, rule sensitivity, Excel/scripts | Medium: a matching major suffices | Stable median pay; the draw is certainty |
| Quant developer | Implementing strategy systems, optimizing performance, integrating data and trading interfaces | Programming (Python/C++/Rust), system design | High: hard-core programming ability | Upper range among tech roles; top-fund salaries concentrate on this line |
| Trading systems engineer | Building matching/market-data/risk infrastructure; ensuring low latency and availability | Networking, distributed systems, Linux, databases | High: pure engineering background can enter | On the higher side within broker/exchange/prop systems |
| Algo execution | Slicing large orders into small ones to reduce impact cost (VWAP/TWAP) | Mathematical optimization, programming, market microstructure | Medium-high: a subset of quant skills | Execution role within quant; upper-middle pay |
| Operations (settlement/compliance) | Clearing, reconciliation, position verification, regulatory reporting | Carefulness, responsibility, process mindset | Low: lenient degree/major requirements | Below median but stable; a springboard for remote internal transfers |
| Client service/account opening/risk review | Client-facing and process work | Communication, patience | Low | Entry-level pay, high **<mark>turnover</mark>** |

::: tip 💡 How to Read This Map
One-sentence summary: **<mark>the closer a role is to "decisions" (trader/research analyst/PM), the greater the bonus upside but also the barrier and pressure; the closer to "systems" (developers/engineers), the more stable the pay and the strongest transferability; the closer to "process" (operations/client service), the easiest to enter and the best springboard for switching tracks.</mark>**
:::

### Day-to-Day Details Per Role (Supplement)

- **Buy-side trader**: read overnight reports in the morning → execute the PM's or your own plan during the session → record every fill and every bit of **<mark>slippage</mark>** → reconcile after close. A day might see only a handful of trades, but each needs a reason and a record.
- **Sell-side market maker**: continuously refresh two-sided quotes, handle client RFQs, balance inventory risk. One of the fastest-paced roles with the highest demands on reaction time and composure.
- **Research analyst**: run data, validate hypotheses, write reports, present views in meetings. Output is "views + evidence"; being challenged is routine.
- **<mark>Risk</mark>**: watch limits, produce daily reports, block non-compliant actions. An "unpopular but indispensable" role — trading desks resent risk, but institutions can't live without it.
- **Middle office (operations/settlement/compliance)**: handles funds, positions, clearing, reporting, and regulator communication. Errors are costly; process and double-checks rule.
- **Algo execution**: slices orders with VWAP/TWAP/optimization algorithms to reduce impact cost; an intersection of "math + programming + microstructure", and a lightweight entry point into quant.
- **Systems engineer**: matching engines, market data, risk systems, databases, network optimization; stability at peak data times is the core competency — nearly unrelated to trading decisions yet critical.

### Collaboration Between Roles (One-Sentence Map)

```text
Research analyst ──produces views──▶ Trader/PM ──executes orders──▶ Algo execution/trading desk
    ▲                       │
    │                       ▼
    └──── data & feedback ◀── settlement/middle office/risk (supervising throughout)
                           ▲
   quant dev/systems engineer ────┘ (providing tools and infrastructure)
```

- The research analyst owns "how to think", the trader owns "how to act", the engineer owns "making it actable", and risk owns "don't act recklessly" — remove any one and the institution stops functioning.

---

## Proprietary Trading (Prop)

### Overseas Prop Firms

- Model: the firm provides capital (usually far exceeding your own), a trading floor, and a risk framework; traders take a profit split — your earnings depend on performance while the firm bears most of the capital risk.
- Representative types: established Western prop firms (Jane Street, Optiver, IMC, etc. — public common knowledge; some operate in China), plus emerging crypto/FX props with funded accounts (e.g., FTMO-style evaluation models) — **<mark>the latter is essentially "paying for a chance to take an exam", fundamentally different from the former</mark>**.
- Characteristics: high elimination rates; miss the evaluation period or minimum profit targets and you're out; culture prizes rigor and collaboration (especially options market making).
- Salary basics: no base or low base + split is common; income variance is extreme — the first year can fall below an ordinary office job or far exceed it; defer to actual firm terms.

### Domestic Prop Status Quo

- Most Chinese funds and broker prop desks **<mark>do not offer a "bring your own capital to join" model</mark>**; they hire research analysts/traders as employees and provide the capital themselves.
- Retail-friendly formats are mainly **<mark>discretionary/asset management (licensed only)</mark>** and small firms running simulated-account selection or "bring-capital" schemes — the latter are a mixed bag; verify fund safety and terms carefully (see Risk Warning below).
- Crypto quant teams also provide capital, but compliance and stability depend on actual status.

### Prop vs Personal Trading vs Institutional Asset Management

| Dimension | Personal trading | Prop trading | Institutional asset management |
|---|---|---|---|
| Capital source | Your own money | Firm's money (+ profit split) | Clients' money (management fee + performance fee) |
| Risk management | You carry it alone | Strong constraints from the firm's risk system | Dual constraints from clients and regulators |
| Income structure | All P&L yours | Low/no base + split | Base + bonus; the most stable structure |
| Psychological pressure | Losing your own money | Losing gets you cut (capital pressure) | Losing triggers redemptions (reputation pressure) |
| Barrier | None | Evaluation-period assessment | Highest: credentials + licenses + compliance |

::: tip 💡 The Order of the Three Capital Models
For retail traders, these are "one set of skills, three ways to <mark>lever it</mark>": your own money tests ability, the firm's money amplifies it, clients' money turns it into stable income — **<mark>most people should move left to right, not skip validation and take money directly</mark>**.
:::

---

## Trader vs Research Analyst vs Engineer: How to Choose

| Dimension | Trader | Research Analyst | Engineer |
|---|---|---|---|
| Core question | "Can I buy/sell right now?" | "Why does this pattern exist?" | "How does this system run fast and reliably?" |
| Daily work | Watching markets, executing, cutting positions, reporting | Running data, writing reports, meetings | Writing code, tuning performance, maintaining systems |
| Personality fit | Stress-tolerant, decisive, emotionally stable, can endure consecutive **<mark>stop-losses</mark>** | Curious, rigorous, comfortable with long unsung stretches | Focused, structured thinking, willing to sweat details |
| Income structure | Strongly performance-linked, high variance | Linked to reputation/output, medium variance | The most stable; linked to personal output |
| Education requirement | Elite degrees/internships mainly; proven track records can override | Highest credential bar | Weighs portfolio and engineering ability over degrees |
| Switching difficulty | Can switch to research (needs research depth) | Switching to trading requires live validation | The most transferable of the three lines |

> Three self-test questions: **Can you lose five times in a row and keep a straight face? Can you wait three months for one answer? Can you tune a "roughly works" system to 99.9% reliability?** Answering yes maps respectively to the trader, research analyst, and engineer temperament. Most people suit the latter two — a trading desk only has room for a few.

::: warning The Trading Desk Is Brutal
**Most people suit the latter two — a trading desk only has room for a few.** That's not modesty; it's the objective constraint of institutional headcount structures and pressure tolerance. Decide whether you're that minority before betting on this line.
:::

---

## From Retail to Professional Trader

### Verified Live Performance = The Best Resume

- For institutions, **<mark>a verifiable live return record is worth more than any certificate</mark>**. Especially for those "without elite credentials but with stable performance", this is the most effective exception-granting pass.
- Verifiable ≠ screenshots: complete account statements, audit/platform-verifiable records, long-term equity curves and deposit/withdrawal histories carry weight; photoshopping one image destroys credibility forever.
- **<mark>Small-capital proof</mark>**: don't wait for "big capital" before transitioning. Use the smallest acceptable capital (within what your life allows) to validate yourself continuously for over a year — make sure your **<mark>returns</mark>**, **<mark>drawdown</mark>**, and max consecutive losses all survive scrutiny before talking about scaling up.

### Path One: Institution First, Independence Later

Retail → junior trader/research assistant at a small firm → institutional prop desk → accumulate track record and capital → go independent. Pros: salary floor and mentorship. Cons: long path.

### Path Two: Self-Validate First, Then Find Capital

Retail → 2 years validating live with small capital → approach institutions/prop firms with results → scale with other people's money. Pros: freedom. Cons: a long zero-income validation period and a real chance of failure.

### Path Three: Semi-Professional Transition

Keep your job → trade small capital consistently after hours → once results stabilize and living expenses are covered → consider going full-time (see [Professional Trader Path](professional-trader-path.md)).

> **Core formula: <mark>institutions don't care how good you claim to be; they care whether your returns can be verified, replicated, and constrained by risk.</mark>** Between retail and professional stands exactly one thing — verifiability.

::: tip The Gap Between Retail and Professional
**Between retail and professional stands exactly one thing — verifiability.** Not technique, not capital, but "can your returns be verified, replicated, and constrained by risk" — that single thing splits the two paths completely.
:::

### Career Progression Ladder

```text
Operations/client service/execution (entry)
   ↓ internal transfers/certificates/projects
Middle office/risk/research assistant (growth)
   ↓ proven performance or expertise
Trader/research analyst/engineer (core roles)
   ↓ stable track record/team leadership
PM / head of strategy / architect (decision layer)
```

- Every line has a corresponding "next chair"; first find out what the level above your current role demands.
- Golden window for switching roles: institutions offer annual internal mobility and early-tenure fluidity — **<mark>the first 1-2 years have the highest success rate for internal transfers</mark>**; afterwards the time cost rises sharply.

---

## Roles Without Credential Barriers: Springboards and Side Doors

If your education is ordinary and you have no internships, these entry routes are viable:

| Role | Why it works as a springboard | Transfer direction |
|---|---|---|
| Trade execution/order clerk | Observe a real trading desk up close; learn institutional language and processes | Trader's assistant → trader |
| Broker/futures client service | Exposure to market data, trading rules, compliance basics | Operations → middle office → risk |
| Settlement/operations | Understand cash flow and the whole business; many internal-transfer openings | Operations → middle office → compliance |
| Data entry/market data editor | Works with data daily; picking up Python leads to quant support | Data role → quantitative research assistant |
| Bank/broker branch network | Finance's widest entrance; plan internal transfers from there | Teller → wealth products → advisory direction |

::: tip 💡 Choose the Institution Over the Role
Strategic point: **<mark>choose the institution, not the role</mark>** — join a large institution in a peripheral role first (low process friction, low bar, professional atmosphere), then curve into the target role via internal transfer; small firms are easy to enter, but their "one-step-to-the-goal" roles usually lack growth systems.
:::

### Common Misconceptions & FAQ

| Misconception/question | Explanation |
|---|---|
| "Traders all get rich" | Survivorship bias + cinematic glamorization; desks are elimination-driven, income variance is extreme; actual market conditions prevail |
| "You must quit your job to focus on trading" | Quite the opposite: the risk constraints and income floor of the institution/part-time transition stage make it when most people improve fastest |
| "Trading doesn't need credentials" | Personal trading has no barrier, but institutional roles generally require them; compensate with verifiable track records |
| "Risk/ops has no future" | The least glamorous but most stable lane of all, and the relay station for middle-office promotion and transfers |
| "Programmatic = HFT = huge profits" | Programmatic trading spans everything from minute-level to months-long holds; HFT is just one extreme |

### Route Advice by Starting Point

| Starting point | Recommended route | One-line advice |
|---|---|---|
| STEM/strong coding | Quant developer → systems engineer/algo execution | Engineering ability is hard currency; get in first, move to research later |
| Finance fresh graduate | Broker research institute/risk → research analyst/trading assistant | Master the fundamentals of research and report-writing first |
| Retail trader with live results | Approach prop/asset managers with your track record | Track records are the most valuable asset; validate first, then scale |
| Ordinary credentials, wants in | Client service/operations/execution → internal transfer | Pick a large institution, take a peripheral role, wait for the transfer window |
| Employed elsewhere, wants finance | Part-time certificates + internal transfer | Don't rage-quit; bridge with part-time validation |

### Certificates & Supplementary Skills: What's Worth the Time

| Certificate/skill | Roles covered | Value assessment (common knowledge) |
|---|---|---|
| Futures/securities practitioner qualifications | Sell-side, branch offices, ops roles | Entry-gate certificates; low bar and mandatory; limited boost for core roles |
| FRM | Risk/middle office | Helps the risk line; moderate value for trading/research |
| CFA | Research, asset management, advisory | Well-regarded on sell-side and asset management; limited effect for quant research |
| Quant programming (Python/SQL/backtest projects) | All technical roles | Far better cost-performance than certificates for quant-related roles |
| Live track record | Trader/prop | The "most expensive" and most effective proof; replaces all certificates |

::: tip 💡 Ranking Certificates vs Portfolio Work
Conclusion: **<mark>certificates are the "ticket"; portfolio work and track records are the "pass"</mark>**. Given equal time, building projects/track records generally yields higher marginal returns than studying for certificates — certificates only matter when you need to "get past a filter".
:::

### Career Health & Long-Termism

- Pressure in the trading industry is structural: market swings, review cycles, survivorship narratives — **<mark>psychological resilience is the industry's most important hidden job requirement</mark>**.
- Work-life boundaries: screen-bound desk roles mean sitting, eye strain, and constant tension; regular checkups, exercise, and vacations aren't indulgence — they're productivity.
- **<mark>Compound-interest</mark>** thinking applies to the career itself: **when changing jobs/roles, prioritize skill accumulation and transferability over short-term pay gaps** — in trading, transferable skills (data handling, risk awareness, systems thinking) are the cycle-proof assets.
- Whichever line you take, keep a long-running personal output of "after-hours trading/research": it's both a hedge (a fallback if the institution cuts you) and the final destination of this entire knowledge base — **<mark>turning knowledge into your own ability matters more than turning it into a job title</mark>**.

---

## Risk Warning

::: warning ⚠️ Risk Warning
The trading industry's "high salary" narrative carries heavy survivorship bias — trading desks run on elimination, most new hires get filtered out during evaluations or the first few years, and income variance is extreme (actual market conditions prevail). **Beware any firm offering "join with your capital", "insider test funds", or "guaranteed profit splits"**: genuine prop means the firm puts up money while you contribute skill; anyone asking you to pay first is mostly selling you an expensive lesson. Without credentials or connections, "peripheral institutional role + internal transfer" is far safer than "gamble your way straight onto a trading desk". All salary and barrier figures here are common-knowledge ranges; defer to actual market conditions and recruiting information.
:::
