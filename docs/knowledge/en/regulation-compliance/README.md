# 16 · Regulation & Compliance

> Rules are the operating system of the market — only by understanding who regulates what, and what gets punished, can you avoid dying without ever knowing why.
>
> Chapter 08 (Pitfalls) covers **personal risk avoidance**: how not to get scammed, and how money moves in and out legally. This chapter takes a different angle, explaining the rules systematically from the perspective of the **regulatory system**: how regulators divide their work, how licenses are issued, how violations are punished, and where the red lines lie for crypto and algorithmic trading.

---

> ⚠️ Risk Warning
>
> Everything in this chapter is for **general education only**, compiled from public knowledge and public sources. It is **not legal advice, investment advice, or tax advice**. Regulations, enforcement practices, and licensing policies change frequently; any specific conclusion here is **subject to the latest regulations, official documents, and the opinions of regulators or professionals**.

---

## Chapter Overview

### 01 · China's Financial Regulatory System

A panoramic view of Chinese regulation, from the State Council Financial Stability Committee to the "one bank, one administration, one commission": the PBOC handles monetary policy and macroprudential oversight, the NFRA supervises banks and insurers, and the CSRC oversees securities and futures. This article breaks down what the CSRC regulates (issuance, trading, information disclosure, manipulation, insider trading), how look-through supervision works, how the asset management rules broke implicit guarantees, and how investor suitability is tiered — closing with typical insider trading and market manipulation penalty cases that illustrate "what gets punished, and how severely".

### 02 · US and Global Regulation

The US two-tier system of federal and self-regulatory oversight: securities go to the SEC, futures to the CFTC, and over-the-counter retail brokerage to FINRA. This article walks through the Securities Act of 1933, the Securities Exchange Act of 1934, the Dodd-Frank Act, and Reg BI's conflict-of-interest rules, then covers Hong Kong's SFC licensing regime, Singapore's MAS, and EU MiFID II — ending with "why exchanges love offshore islands" to explain regulatory arbitrage.

### 03 · Crypto Regulation

Crypto assets are the fastest-changing area of global regulation: China moved from the 2017 "9·4" ban to a full exit by 2021, US regulators have fought over whether tokens are securities or commodities, Hong Kong launched its VASP licensing regime, Japan built its licensing system under the Payment Services Act, and the EU introduced MiCA. This article also covers stablecoin legislation and divergent national tax stances, plus a compliance survival guide for ordinary users — **this area changes extremely fast; always defer to the latest rules**.

### 04 · Licensing and Market Access

Financial licenses are the moat of financial companies — and the yardstick ordinary traders use to tell "who is legit". This article maps China's banking/securities/fund/futures/insurance/payment/micro-lending license landscape, brokers' business qualifications, thresholds for public vs private funds, a detailed table of Hong Kong Type 1–13 licenses, and common-sense notes on US FINRA exams — landing on practical steps: how to verify on official websites whether an institution actually holds a license.

### 05 · Algorithmic Trading and Compliance

From 2023 to 2025, China's algorithmic trading regulation moved from "self-regulatory guidance" to "formal rules". This article explains the key points of the new regime: who must report, what must be reported, what counts as high-frequency (order speed, cancellation ratio), abnormal trade monitoring, and differentiated fees — combined with lessons from US Reg NMS / maker-taker and EU HFT regulation, it delivers an actionable compliance checklist for individual quant developers.

### 06 · Platform Disclaimers and Investor Suitability

The line at the bottom of every market data app — "for reference only, not investment advice" — is not decoration. This article unpacks the compliance boundary between information and advice, the legal role and limits of disclaimers, the risk-tier matching logic behind suitability obligations, and platforms' favorite self-protective clauses — closing with a practical checklist on "how to read the fine print" for ordinary users.

### 07 · Market Data and Tooling Compliance

An article aimed at developers: where does market data come from, can you show it to others, and how should you disclaim when you do? This article covers data rights and API authorization, permission boundaries for displaying real-time quotes, the line between tools and investment advice (from a MiFID II/MiCA perspective), and a compliance checklist open-source charting projects can follow directly.

### 08 · AML and Trading Compliance

Starting from the three stages of money laundering (placement / layering / integration) and KYC: AML obligations of financial institutions and VASPs (CDD/EDD/ongoing monitoring/STRs), FATF Travel Rule and on-chain monitoring, the compliance actions ordinary traders encounter (real-name verification, withdrawal limits, freezes), a checklist of suspicious transaction patterns, tax filing essentials, and penalty cases. **Core stance: real identity, clear funds, never lend your account, keep records — compliance is the ordinary trader's talisman.**

---

## Suggested Reading Order

```text
① China's regulatory system (know your home market first: who regulates what, and what gets punished)
   ↓
② US and global regulation (then the international layer: rules you face trading abroad)
   ↓
③ Crypto regulation (the special battlefield: unsettled rules, fastest change)
   ↓
④ Licensing and market access (a practical tool: how to identify legitimate institutions)
   ↓
⑤ Algorithmic trading and compliance (quant-oriented: development red lines under new rules)
   ↓
⑥ Platform disclaimers and investor suitability (user-oriented: responsibility boundaries hide in the fine print)
   ↓
⑦ Market data and tooling compliance (developer-oriented: data licensing and disclaimer checklists)
   ↓
⑧ AML and trading compliance (user-oriented: KYC/AML obligations, suspicious patterns, and tax filing)
```

- Reading order: **read 01 before 02** to build the China–US regulatory skeleton; articles 03–05 are deep dives on top of those two frameworks.
- For quick self-protection, prioritize the penalty cases in 01 and the licensed-institution identification checklist in 04.
- Quants should read 05 as required: algorithmic trading rules directly affect how you deploy live systems.

---

## Content Conventions

- This chapter is **general education**: it compiles public knowledge and public sources only, does not quote statutory text verbatim, and does not constitute legal advice.
- Any specific figures involving regulations, licenses, or tax rates are **subject to the latest official documents**.
- Regulation is dynamic: statements of "current practice" here may be outdated within months — verify on regulator websites before making important decisions.

---

## Articles

<DocCards dir="regulation-compliance" />
