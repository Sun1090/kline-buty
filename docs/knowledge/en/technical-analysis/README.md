# 06 · Technical Analysis

> The previous chapters taught you how to "read the market"; this chapter teaches you how to "read the chart". Candlestick patterns, technical indicators, and volume-price relationships are the three pillars of technical analysis — and the default setup of nearly every market terminal. After finishing this chapter, you should be able to judge independently "what is happening" on a chart, and "whether the signals on the chart deserve your trust".
>
> **The most important sentence: technical analysis is not a holy grail — it describes probabilities, it does not guarantee outcomes.** Use every method in this chapter together with the risk management in the [07 · Trading Systems](../trading-system/) chapter.

---

## What's in This Chapter

### 01 · Candlestick Patterns

Starts from the body and wicks of a single candlestick, moves on to classic reversal and continuation patterns such as the head and shoulders, double tops and bottoms, flags, and triangles, and ends with gap theory. Every pattern comes with the five-piece breakdown — "pattern description, where it appears, bullish/bearish implication, confirmation signal, failure scenario" — plus ASCII diagrams. **The core skill is telling "a pattern" from "a confirmed pattern" — until confirmation arrives, everything is just conjecture.**

### 02 · Technical Indicators in Depth

Breaks down MA, EMA, BOLL, MACD, KDJ, RSI, CCI, WR, OBV, VWAP, ATR, SAR, Ichimoku, and other common indicators by the five categories "trend, momentum, volume, volatility, others": concise formulas, default parameters, core usage, and common mistakes, ending with pairing advice for "chart-overlay + sub-panel" indicators. **The core idea: indicators are "derivatives of price" and always lag price itself.**

### 03 · Volume-Price Analysis

Volume is the only raw data that never gets "processed", and the most important basis for judging whether a signal is real. This article covers expanding/shrinking/stacked volume, the meaning of eight volume-price relationships, volume confirmation on breakouts, top and bottom divergence, volume profile (VPVR) and high-volume nodes, turnover rate and activity, and why "smart-money flow" deserves skepticism. **The core skill: learn to use volume to "endorse" or "debunk" price signals.**

### 04 · Advanced Candlesticks

Builds on 01 and upgrades candlesticks from "recognizing shapes" to "reading the language": quantitative rules for wick ratios (upper wick/body/lower wick), the "formation + confirmation + invalidation" three-step treatment of combinations such as the morning star, evening star, three white soldiers, three black crows, tweezers, and dark cloud cover, trade-off principles for multi-timeframe candle confluence, rules for combining patterns with volume expansion, and how candle characteristics differ across US stocks, crypto, forex, and A-shares. **The core idea: location decides meaning, volume decides authenticity, timeframe decides scale.**

### 05 · Elliott · Gann · Chan

Principles of Elliott Waves (5-wave impulse and 3-wave correction, three iron rules, the link to Fibonacci), Gann (angle lines/time cycles/squares, their philosophical background and the difficulty of verification), and Chan Theory (strokes/segments/pivots/divergence, degrees, and the three classes of buy/sell points). The focus is on the shared controversy of all three — "strong at explaining the past, weak at predicting the future, a thousand people a thousand waves" — with a realistic assessment and the correct way to use them. **Core stance: treat them as thinking frameworks for describing market structure, not as prediction tools or holy grails.**

### 06 · Technical Analysis: Critique and Validation

Puts technical analysis through an academic "health check": supporting evidence (momentum effect, anchoring and self-fulfillment of support/resistance, volume-price research), critical evidence (weak-form efficient-market hypothesis, the difficulty of beating a benchmark in backtests, survivorship and publication bias), crowded trades and the double-edged sword of self-fulfillment, plus an **actionable seven-step scientific validation method** (out-of-sample testing, parameter sensitivity, after-cost returns, benchmark comparison). **The core skill: telling "genuinely effective" from "looks effective".**

### 07 · Drawing Tools in Practice

Breaks down all 37 drawing tools by seven classes — "positioning (horizontal/vertical lines, price labels), connection (trend lines, rays, polylines), channels (parallel/horizontal/regression/speed lines), proportion (Fibonacci retracement/extension/fan/time zones), shapes (rectangle/ellipse/circle/triangle/arc), structure (XABCD harmonics, Elliott waves, Gann angles, Gann box), and annotation (measure, text)" — with practical usage for each, plus the three disciplines of drawing: anchor lines on significant structure, every line must have an invalidation condition, and drawing is the visualization of thinking, not a crystal ball. **Core stance: drawing tools do not create a trading edge — the edge comes from the view you form before drawing and the risk control you execute after.**

### 08 · Gann Box and Angles in Practice

Starts from the "ratio" essence of the 1×1 angle line, then the construction and reading of the Gann box (a rectangle from two points plus 10 angle lines inside): breakout-and-retest confirmation, rhythm switching inside the box, time-price balance; plus hit/edit operations, combinations with Fibonacci/channels/volume, five common mistakes, and three disciplines. **Core stance: Gann tools are a language for "describing trend speed and resonance zones", not a prediction grail — write your invalidation conditions before using them.**

### 09 · Order Flow and Market Microstructure

Starts from "candles are the result, order flow is the process": the order book and Level 2 depth, book thickness and spread, aggressive buying/selling and Delta/CVD, large orders and iceberg orders, Footprint and other order-flow tools, and cross-validation against candles and volume-price indicators. **Core stance: order flow provides "verification" while candles/indicators provide "hypotheses" — first locate the key level, then watch the real battle at that level, and always keep risk control as the bottom line.**

---

## Suggested Learning Order

```text
① Candlestick patterns (recognize the "shapes" on the chart)
   ↓
② Technical indicators (recognize the "numbers" on the chart, and cross-validate patterns with indicators)
   ↓
③ Volume-price analysis (give every signal the final confirmation with volume)
   ↓
④ Drawing tools ("draw" the structures from ①②③ and attach trigger and invalidation conditions)
   ↓
⑤ Gann box and angles (on top of drawing, learn the speed and resonance of "time × price")
   ↓
⑥ Order flow and microstructure (use the order book and tape to "verify the process" behind the structures from ④⑤)
```

- ①②③ build on each other: without patterns, indicators have no reference; without volume, both patterns and indicators can be fooled by false signals.
- This chapter connects with the previous one, [03 · Candlestick & Chart Basics](../getting-started/candlestick-basics.md) (candlestick construction and basic chart reading) — reviewing that article first is recommended.
- After finishing, continue with the knowledge base roadmap: [07 · Trading Systems](../trading-system/) (turn the technical signals from this chapter into disciplined execution).

---

## Conventions

- "Prices" in all candlestick diagrams are illustrative only and do not represent any specific instrument or market.
- Indicator formulas and default parameters follow common conventions; different software differs — defer to the documentation of the software you use.
- Technical analysis signals become significantly less reliable in ranging markets; before applying them, first judge the market regime (trend vs. range).
- For leverage-related usage (such as sizing positions by ATR), be sure to read the margin and liquidation sections of the [03 · Futures](../futures/) chapter first.

---

## Article List

<DocCards dir="technical-analysis" />
