---
title: "China's Financial Regulatory System"
description: "Maps China's financial regulators to each type of institution, building the skeleton of the regulatory system around the question of who regulates what."
---

# China's Financial Regulatory System

> The most common mistake traders make is treating exchanges, brokers, and banks as "the same kind of thing". In reality, every category of institution in the Chinese market answers to a different regulator, and every trading rule carries a piece of regulatory history. This article starts from "who regulates what" to build the skeleton of China's financial regulatory system.

::: warning ⚠️ Risk Warning
This article is an objective compilation of public knowledge, for study and research only, and **does not constitute legal advice**. Institutional responsibilities, regulatory rules, and penalty cases mentioned here are general summaries from public sources — **all specifics are subject to the latest regulations**. For personal trading compliance matters, consult a professional.
:::


---

## 1. The Regulatory Landscape: From "One Bank, Three Commissions" to "One Bank, One Administration, One Commission"

### 1.1 How the Regulatory Architecture Evolved

| Period | Structure | Notes |
|---|---|---|
| Before 2018 | One bank, three commissions (PBOC + CBRC/CSRC/CIRC) | Segmented supervision: banking, securities, insurance each in their own lane |
| 2017-2018 | Financial Stability and Development Committee (FSDC) established under the State Council | Coordinates cross-agency financial regulation and risk resolution |
| 2018 | CBRC and CIRC merged into the "CBIRC" | Unified supervision of banking and insurance |
| 2023 | National Financial Regulatory Administration (NFRA) established | Built on the CBIRC, unified responsibility for financial consumer/investor protection |
| Current | One bank + one administration + one commission, coordinated by the FSDC | Division of labor among PBOC, NFRA, and CSRC |

**Structure in one sentence**: the FSDC handles top-level coordination; the PBOC manages money and macro policy; the NFRA supervises banks, insurers, and other financial institutions; the CSRC oversees securities and futures markets.

### 1.2 Division of Labor Among the Three Main Regulators

| Institution | Regulates | Does Not Regulate |
|---|---|---|
| People's Bank of China (PBOC) | Monetary policy, macroprudential policy, RMB exchange rate, payment and clearing systems, credit reporting, AML | Generally does not directly regulate specific securities trading conduct |
| National Financial Regulatory Administration (NFRA) | Market access and conduct regulation for banks, insurers, trusts, financial leasing, consumer finance, wealth management subsidiaries | Does not directly regulate secondary-market securities trading |
| China Securities Regulatory Commission (CSRC) | Securities issuance and trading, futures markets, fund industry, listed-company disclosure, securities and futures firms | Does not directly regulate bank deposits and loans |

::: tip 💡 Traders' main thread: what the CSRC regulates
**Stocks, futures, funds, and options all fall under the CSRC** — every A-share rule, every futures company license, and every fund filing sits inside the CSRC system. This is the main thread for the rest of this article.
:::

---

## 2. Securities Market Regulation: What the CSRC Regulates

### 2.1 The Six Areas of CSRC Oversight

| Area | Regulatory Content |
|---|---|
| Issuance | Review of new share offerings (IPOs/refinancing), information disclosure gatekeeping under the registration-based system |
| Trading | Trading system design (price limits, T+1), monitoring of abnormal market activity |
| Information Disclosure | Oversight of listed companies' annual/quarterly reports and material event disclosures |
| Market Participants | Access and conduct regulation of securities firms, fund managers, futures companies, and intermediaries (accountants/lawyers/rating agencies) |
| Conduct | Combating insider trading, market manipulation, misrepresentation, and rat trading |
| Investor Protection | Investor suitability management, complaint handling, investigation and punishment of violations |

### 2.2 The Role of Exchanges

The Shanghai, Shenzhen, and Beijing stock exchanges (plus the NEEQ/BSE) are **first-line regulators** under CSRC oversight:

- Exchanges handle daily trade surveillance, determination of abnormal trading, temporary suspensions, and delisting enforcement.
- Exchange rules (listing rules, trading rules, member management rules) are the market's first layer of "law".
- The CSRC retains ultimate enforcement power: exchanges refer leads; the CSRC opens formal investigations and imposes penalties.

### 2.3 Key Points of the Registration-Based IPO Reform (common-sense recap)

| Element | Approval-Based System (historical) | Registration-Based System (current direction) |
|---|---|---|
| Review logic | Regulators substantively judge whether a company is "good" | Regulators check whether disclosure is "complete"; quality is left to the market |
| Pricing | Administrative pricing with P/E caps | Market-based book-building; first-day price limits removed |
| Delisting | Loose standards, few delistings | Diversified delisting criteria; delisting becomes routine |
| Pace | Slow queues, high shell value | Market-driven issuance pace; shell value shrinks sharply |

**Common-sense reading of registration reform**: it does not mean looser regulation — it shifts the regulatory focus from "vetting company quality on investors' behalf" to "ensuring information is true and complete", which is why penalties for disclosure violations have become heavier instead. Timing and phase details of full implementation are subject to the latest regulations.

---

## 3. Futures Market Regulation

### 3.1 Three-Tier Supervisory Structure

| Tier | Body | Responsibilities |
|---|---|---|
| Administrative regulation | CSRC | Futures legislation, licensing of futures companies, investigating market manipulation |
| Industry self-regulation | China Futures Association | Practitioner qualifications, self-regulatory rules, dispute mediation |
| First-line supervision | Futures exchanges (SHFE/DCE/ZCE/CFFEX/GFEX) | Trading rules, **<mark>margin</mark>** and price limits, abnormal trade monitoring, delivery management |

### 3.2 Futures Company Licensing

- Futures companies must obtain a **futures business license issued by the CSRC** before operating — this is a franchised business.
- Business scope must be approved item by item: commodity futures brokerage, financial futures brokerage, futures investment consulting, asset management, risk management (OTC business), etc.
- Futures companies are subject to **classified regulatory ratings** (AA/BBB etc.), which affect how broadly they may operate — see [licensing-access.md](licensing-access.md).

### 3.3 Compliant Paths for Individual Futures Investors

1. Open a **real-name account** with a licensed futures company; funds move via bank transfer into the company's margin account (monitored by the China Futures Market Monitoring Center).
2. Your trading code can be verified at the **China Futures Market Monitoring Center** — the core channel to confirm "your account actually reached the exchange floor".
3. Products such as stock index futures and treasury bond futures carry **capital thresholds and knowledge tests** as suitability requirements.

---

## 4. The Concept of "Look-Through" Supervision

### 4.1 What Look-Through Means

**<mark>Look-through supervision</mark>** means: **no matter how many layers the funding and ownership structure winds through, regulators must see through to the actual controller, the ultimate funder, and the final beneficiary**.

| Scenario | What gets looked through |
|---|---|
| Asset management products | Nested wealth-management/fund/trust structures: what are the underlying assets, how many layers of **<mark>leverage</mark>**? |
| Shareholder look-through | Ownership structures of listed companies and financial institutions: actual controllers, related parties, nominee holdings |
| Trade look-through | Algorithmic trades traced back to real accounts and strategy owners (see [algo-trading-compliance.md](algo-trading-compliance.md)) |
| Fund flow look-through | In AML contexts, tracing the source and use of funds |

### 4.2 Why Look-Through Is Needed

- **Prevent leverage stacking**: multi-layer nesting can amplify leverage beyond regulatory sight (the lesson of 2015's off-exchange margin lending).
- **Prevent regulatory evasion**: detouring through asset-management channels into restricted sectors, or using nominees to escape disclosure.
- **Prevent arbitrage circulation**: channel businesses let money idle within the financial system, raising real-economy funding costs.

**What it means for traders**: don't assume that "switching to a puppet account" or "adding one layer of structure" evades regulation — look-through supervision was designed precisely to close these routes. Once nominee holding, margin lending, or account borrowing is seen through, liability falls on the actual beneficiary (subject to the latest regulations and judicial determinations).

::: danger 💀 Look-through supervision closes off every puppet account
**No matter how many layers the funding and ownership structure winds through, regulators must see through to the actual controller, the ultimate funder, and the final beneficiary.** Don't assume a new disguise or one more structural layer escapes oversight — once nominee holding, margin financing, or account borrowing is seen through, liability falls on the actual beneficiary.
:::

---

## 5. Asset Management Rules: Breaking Implicit Guarantees

### 5.1 Core Points of the New Asset Management Rules (common-sense summary)

| Point | Content |
|---|---|
| Break implicit guarantees | Asset management products may not promise principal protection or guaranteed returns; they run on net asset value, and losses belong to investors |
| NAV-based management | Products valued at market prices; amortized cost accounting no longer hides volatility |
| No capital pools | **No rolling issuance, pooled operation, or maturity mismatch** |
| Remove channels | Limits on multi-layer nesting and channel businesses, with look-through supervision |
| Qualified investor thresholds | Private asset management products target **<mark>qualified investors</mark>**: personal financial assets of at least RMB 3 million or average annual income of at least RMB 500,000 over the past 3 years; minimum investment typically RMB 1 million per product (subject to the latest regulations) |

### 5.2 Impact on Ordinary People

- The era of "bank wealth management always wins" is over: NAVs fluctuate with markets, and dipping below par is normal.
- Products promising "guaranteed principal and returns" are themselves a red flag — legitimate institutions don't promise; those who do are usually scammers (see [Chapter 08 · Pitfalls](../pitfalls/)).
- Qualified investor thresholds mean **high-yield private asset management products were never designed for ordinary retail investors** — if you can't meet the threshold but insist on investing anyway, you're usually going through non-compliant channels.

---

## 6. Investor Suitability: Retail vs Professional Investors

### 6.1 The Logic of Suitability Management

The essence of the **<mark>investor suitability</mark>** regime is **<mark>risk-tier matching</mark>** — selling suitable products to suitable people, and keeping high-risk products away from investors who cannot bear them.

### 6.2 The Two Investor Categories (general framing, subject to the latest regulations)

| Dimension | Ordinary Investors | Professional Investors (natural persons) |
|---|---|---|
| Definition | All investors other than professional ones | Financial assets of at least RMB 5 million, or average annual income of at least RMB 500,000 over 3 years, plus relevant experience and expertise |
| Protection level | Strong: mandatory risk disclosure, audio-video recording, cooling-off periods | Weaker: may be treated as "experienced", reducing protective procedures |
| Purchasable products | Only products matching their risk tier (C1–C5) | May access higher risk tiers |

### 6.3 Risk Assessment and Dual Recording

- **Risk assessment**: complete a risk tolerance questionnaire before opening accounts and buying (Conservative C1 to Aggressive C5); product risk tiers must match assessment results.
- **Dual recording ("shuanglu")**: when brokers sell high-risk products, the sales process must be **audio- and video-recorded**, leaving a suitability audit trail.
- Risk assessment results follow "your word doesn't count, the system counts": if you want high-risk products but assess as conservative, the system refuses — that's suitability working as intended.

---

## 7. Penalty Cases: Insider Trading and Market Manipulation

::: info 📖 Note on Case Framing
The following is a common-knowledge summary of **typical penalty types and magnitudes** reported publicly. It targets no specific case; amounts and legal liability are subject to formal decisions by judicial authorities and the CSRC.
:::

### 7.1 Insider Trading

| Element | Common-Sense Points |
|---|---|
| What insider trading is | Trading securities based on undisclosed information materially affecting the share price (M&A, earnings, major contracts, etc.) |
| Typical penalties | CSRC confiscates illegal gains and imposes <mark>fines</mark>; fines commonly run to **one to several times the illegal gains**, with public historical cases ranging from millions to hundreds of millions of yuan |
| <mark>Criminal liability</mark> | Serious cases constitute the crime of insider trading: up to five years' imprisonment or detention; especially serious cases five to ten years (subject to the Criminal Law and judicial interpretations) |
| Common ways people get caught in | Following a friend's "inside tip", or employees' relatives trading via nominee holdings — ignorance is not a defense |

### 7.2 Market Manipulation

| Element | Common-Sense Points |
|---|---|
| What manipulation is | Successive trading, wash trading (trading against yourself), spoofing (placing orders meant never to fill, to lure followers), rumor-mongering trades, exploiting informational advantage to steer prices |
| Typical penalties | Confiscation of illegal gains plus fines; public cases range from tens of millions to tens of billions of yuan |
| Criminal liability | Serious cases constitute the crime of manipulating the securities/futures market, punishable by up to ten years (subject to the Criminal Law and judicial interpretations) |
| Relevance to retail | Group-chat "call-out" pump schemes and getting roped in by market makers — retail participants are mostly **victims or tools**, not ringleaders, but active cooperation can still be prosecuted |

### 7.3 Three Common-Sense Judgments for Ordinary Traders

1. **"Inside tips" are bait, not gifts**: people with real inside information won't tell you; whoever tells you either wants you to hold the bag or will implicate you.
2. **Abnormal volatility is not the same as manipulation**: the CSRC needs a complete chain of evidence to find manipulation; retail investors needn't report every rally or panic over their own holdings.
3. **Institutions and intermediaries get fined too**: brokers, fund managers, accountants, and lawyers can all be penalized for failing due diligence — a license is not a get-out-of-jail card.

---

## 8. Regulatory Quick Reference

| Problem You Face | Who to Turn To | Legal Basis |
|---|---|---|
| A-share / futures / fund trading rules | CSRC + relevant exchange | Securities Law, Futures and Derivatives Law, exchange rules |
| Bank wealth management, insurance, loans | NFRA | Asset management rules, Insurance Law, banking regulation |
| FX rates, foreign exchange quotas, payments | PBOC + SAFE | Foreign Exchange Regulations, etc. |
| Reporting illegal securities/futures activity | CSRC "12386" hotline, local CSRC offices | Securities Law, Futures and Derivatives Law |

---

## Further Reading

- Regulation writes the rules, but scams live at their edges: [scam-detection.md](../pitfalls/scam-detection.md) in [Chapter 08 · Pitfalls](../pitfalls/)
- How violations manifest in the market (pump schemes, wash trading, bull/bear traps): [manipulation-detection.md](../market-ecosystem/manipulation-detection.md) in [Chapter 12 · Market Ecosystem](../market-ecosystem/)
- Margin and **<mark>forced liquidation</mark>** rules in futures are themselves regulatory design: [margin-leverage-liquidation.md](../futures/margin-leverage-liquidation.md) in [Chapter 03 · Futures](../futures/)
- The license system in depth: [licensing-access.md](licensing-access.md)
- An international comparison: [us-global-regulation.md](us-global-regulation.md)
