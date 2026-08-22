---
title: "04 · Advanced Candlesticks"
description: "Advanced candlesticks — quantifying wick language, confirming and falsifying combination patterns, multi-timeframe confluence, volume endorsement, and differentiated reading across markets"
---

# 04 · Advanced Candlesticks

> Building on [01 · Candlestick Patterns](chart-patterns.md), this article pushes candlesticks from "recognizing shapes" to "reading the language": how to quantify wick ratios, how to confirm and falsify combination patterns, how timeframes resonate, how volume endorses the candles, and how to read them differently across markets.

::: tip 💡 Master Principle
**Remember one master principle first: <mark>a single candle is a "word", a combination pattern is a "sentence", volume is the "tone", and the timeframe is the "context"</mark>.** Only when all four are present is a candlestick reading complete.
:::

---

## 1. Wick Language

### 1.1 What a Wick Is

A candle consists of three parts: upper wick, body, and lower wick. The body is "the battlefield outcome from open to close"; the wicks are "the extreme prices that got knocked away and pulled back during the battle":

```text
      │ ← high
   ┌──┴──┐ ← upper wick (spike smashed back)
   │ body│ ← between open and close
   └──┬──┘
      │ ← lower wick (probe pulled back)
      │
      └ ← low
```

**A <mark>wick</mark> is essentially "a zone price probed but failed to hold".** The longer the upper wick, the more selling pressure up above knocked price down; the longer the lower wick, the more buying support down below held price up. Wicks are always "rejected attempts".

### 1.2 Deep Reading of Long Upper Wicks by Location

| Location | Meaning | Signal strength |
|---|---|---|
| Mid-downtrend | A bounce smashed back; bears still in command; end-of-bounce signal | Weakly bearish |
| End of downtrend (at lows) | First large-scale bull counterattack; even though it didn't hold, selling pressure may be exhausted — confirm reversal with a next-day bullish candle | Leaning bullish (pending confirmation) |
| Mid-uptrend | Normal turnover/shakeout; continues rising after retesting the MAs; often covered by the next day's bullish candle | Neutral |
| End of uptrend (at highs) | Buyer exhaustion and heavy overhead supply; classic topping signal (shooting star) | Strongly bearish |
| Top of a long-term box | A record of repeated failed spikes; reinforces the box-top resistance | Neutral-bearish |

::: tip 💡 Location Decides Meaning
**The rule: the same long upper wick is "the bulls' first word" at the end of a decline and "the bulls' last word" at the end of a rally — <mark>location decides meaning; the shape by itself counts for nothing</mark>.**
:::

### 1.3 Deep Reading of Long Lower Wicks by Location

| Location | Meaning | Signal strength |
|---|---|---|
| Mid-uptrend | Quick absorption during a pullback; shakeout in nature; continues rising after the retest | Neutral |
| End of uptrend (at highs) | Hanging man: violent intraday selling temporarily absorbed, but the selling pressure is real | Strongly bearish (pending next-day confirmation) |
| Mid-downtrend | Oversold bounce-back; decline resumes afterward; the "falling-knife catching" scene | Weakly bullish (most traps) |
| End of downtrend (at lows) | Bear attack failed with strong buying support; classic bottoming signal (hammer) | Strongly bullish |
| Key support level (near prior low/neckline) | A "stress-test record" of the support; if it holds, the support gains credibility | Leaning bullish |

**Beware long lower wicks mid-downtrend:** in a downtrend, every long lower wick looks like a bottom, but most are just "dead-cat bounces" within the decline. The criterion is **whether the next day can close bullish on volume above the prior day's body**.

### 1.4 Quantifying Wick Ratios

To upgrade wick analysis from "feel" to "measurement", classify a candle by the ratios of upper wick (U) / body (B) / lower wick (L):

```text
Ratio rules (body = 1 unit):
upper wick / body < 0.25 → no upper wick (bulls fully control the close)
upper wick / body 1–2×  → long upper wick (spike rejected)
upper wick / body ≥ 2×  → extreme upper wick (strong rejection)
lower wick: mirror reading
```

| Upper : body : lower | Name | Reading |
|---|---|---|
| 0 : 1 : 0 | Marubozu (bullish/bearish) | One side completely dominant; direction set by body color |
| 0 : 1 : ≥2 | Hammer / hanging man (same shape; location names it) | Strong support below; bullish at lows, bearish at highs |
| ≥2 : 1 : 0 | Shooting star (highs) / inverted hammer (lows) | Strong overhead supply; bearish at highs, bullish at lows pending confirmation |
| ≥1 : 1 : ≥1 | Long-legged doji | Violent bull-bear disagreement; direction handed to the next day |
| 0 : 1 : 0 with a huge body | One-price bar / full-body candle | Extreme one-sided move, usually untradeable |

**Practical mnemonics:**
- A wick ratio ≥ 2× the body is worth attention; 1–2× is just "ordinary fluctuation";
- Both wicks long = maximum disagreement; such candles often precede big moves (direction decided by whichever side brings the volume);
- A candle with tiny wicks and a huge body (marubozu) represents one-sided force — it is "trend language", not "reversal language".

---

## 2. Combination Patterns, Advanced

> A single candle can only express "the bull-bear battle within one bar"; combination patterns express "the handover process of power". Every pattern in this section comes with: **formation → confirmation → invalidation** — all three steps, none skippable.

### 2.1 Morning Star / Evening Star

**Formation** (three candles):
- **<mark>Morning star</mark>** (bottom): ① big bearish candle (decline) → ② small body or doji (either color, gaps allowed, representing a bull-bear standoff) → ③ big bullish candle (closing more than halfway into candle ①'s body).
- **<mark>Evening star</mark>** (top): exact mirror — ① big bullish candle → ② small body/doji → ③ big bearish candle penetrating candle ①'s body.

```text
Morning star (bottom):         Evening star (top):
     │                              ┌──┐
   ┌─┴─┐   ┌─┐                    │ ① │  ← big bullish candle
   │ ① │   │ ② │  ← doji/small body  └─┬─┘   ┌─┐
   └─┬─┘   └─┘                    │②│  │  │  ← small body/doji
     │      ┌─┐                     └─┘  │ ③ │  ← big bearish candle
   (decline)│ ③ │  ← big bull candle deep into ①'s body  └─┬─┘
             └─┘    (often with volume expansion)        (rally)
```

**Confirmation**:
- Candle ③ must close more than **halfway into** candle ①'s body (the deeper, the more effective; engulfing candle ① upgrades it to a stronger reversal);
- For a morning star, candle ③ must come on **expanded volume**; for an evening star, expanded volume on candle ③ raises certainty;
- Candle ② being a **doji** (the smaller the body) is more reliable than an ordinary small body — the more complete the standoff, the more sudden the reversal.

**Invalidation**:
- Candle ③ only bounces modestly (less than halfway into candle ①'s body) — the pattern downgrades to a "continuation signal" and the trend most likely resumes;
- After an evening star, price goes sideways for days without falling, then makes a new high — the top pattern was digested sideways;
- It appears at a non-key location (over 70% of morning stars mid-trend are continuations) — mistaking continuation for reversal.

### 2.2 Three White Soldiers / Three Black Crows

**Formation** (three candles):
- **<mark>Three white soldiers</mark>**: three consecutive bullish candles with progressively longer bodies, each closing higher day over day, each closing in the upper part of the prior body (no long wicks).
- **<mark>Three black crows</mark>**: the mirror — three consecutive bearish candles with progressively longer bodies, each closing lower day over day.

```text
Three white soldiers (bottom/early trend):  Three black crows (top/late trend):
    ┌──┐                              ┌──┐
    │① │                             │③ │
  ┌─┴──┴──┐                        ┌─┴──┴──┐
  │   ②   │                        │   ②   │
┌─┴────────┴──┐                  ┌─┴────────┴──┐
│      ③      │                  │      ①      │
└─────────────┘                  └─────────────┘
 closes step higher (bullish bodies lengthen)  closes step lower (bearish bodies lengthen)
```

**Confirmation**:
- The three bodies grow day over day (accelerating momentum), with very short wicks;
- They appear **after a clear decline/rally** (soldiers at the bottom, crows at the top);
- Three white soldiers with gently rising volume, ideally near key support.

**Invalidation**:
- A **long upper wick** on the third candle (soldiers) / long lower wick (crows) means momentum is already overdrawn — often reverses the next day: "soldiers with wicks, turn and shut the door";
- Bodies progressively **shrinking** "soldiers" (they should lengthen) — decaying momentum, can fail at any time;
- Appearing mid-range: soldiers followed by sideways drift and then a fall is just an ordinary bounce inside the box;
- If a quick volume-dry stabilization follows the crows, it was panic inertia rather than a trend reversal — don't chase the short.

### 2.3 Tweezer Bottom / Tweezer Top

**Formation**: Two (or several) consecutive candles with **identical lows** (**<mark>tweezer bottom</mark>**) or **identical highs** (**<mark>tweezer top</mark>**), like the two prongs of tweezers resting on the same level. The two bodies may point in opposite directions; shape and size are unconstrained.

```text
Tweezer top:                    Tweezer bottom:
   ┌────┐ ┌────┐
   │ ①  │ │ ②  │   ← two prongs on the same level
   └─┬──┘ └─┬──┘     (identical highs)
     └──┐ ┌──┘          ┌──┐ ┌──┐
        └─┘             │  │ │  │   ← two prongs on the same level
                        └┬─┘ └─┬┘     (identical lows)
                         └──┐ ┌──┘
                            └─┘
```

**Confirmation**:
- The prong level must be a **key level** (prior high/low, round-number gate, near a moving average) — the point of tweezers is "two attacks on the same price, both failed";
- The strongest signal comes when the second candle is itself a **reversal candle** (the second prong carries a long wick, like a shooting star/hammer);
- Add volume: expanding volume on the second attack that still gets repelled = real selling/buying pressure; shrinking volume may just mean nobody showed up.

**Invalidation**:
- The two prongs are only "roughly equal" (differing by more than 0.5%–1%) — not tweezers, just an ordinary pullback;
- A third attack breaks straight through the prong level (two prongs become three) — pattern failed — **tweezers are only a reversal when it is "exactly twice"**;
- Appearing mid-move at a non-key level — just ordinary parallel candles inside a range, with no directional meaning.

### 2.4 Dark Cloud Cover / Piercing Line

**Formation** (two candles):
- **<mark>Dark cloud cover</mark>** (top): ① big bullish candle → ② a big bearish candle opening higher, closing **deep** below the midpoint of candle ①'s body (but not below its open).
- **<mark>Piercing line</mark>** (bottom): mirror — ① big bearish candle → ② a big bullish candle opening lower, closing deep above the midpoint of candle ①'s body.

```text
Dark cloud cover (top):        Piercing line (bottom):
   ┌───────┐                     ┌─┐
   │  ①bull│                    │ │ ← ② opens low, big bull candle
   │       │  ┌──────┐           │ │
   └───────┘  │  ②bear│ ← opens high, closes low    │ ② │
              │       │   close deep into ①'s body    ┌┴─┴─┐
              │ ← crosses the midline │               │ ①bear│
              └───────────┘               └─────┘
```

**Confirmation**:
- Candle ② must **gap open** (the clearer the gap, the stronger) and close past candle ①'s body **midline** — stopping at the 1/3 mark is a "failed pierce" and halves the signal;
- Dark cloud cover / piercing line must appear after a distinct rally/decline;
- Candle ② comes with volume (dark cloud on volume = real distribution at the top; piercing on volume = real absorption at the bottom).

**Invalidation**:
- The close reaches less than 1/3 into candle ①'s body = "no pierce" — just an ordinary pullback/bounce; the pattern does not stand;
- The day after a dark cloud cover closes bullish at a new high (outside reversal back), the pattern fails — candle ② was just a shakeout;
- Appearing mid-box with the next day still oscillating inside — no directional meaning;
- **Difference from engulfing**: engulfing requires fully wrapping candle ①'s body; dark cloud/piercing only requires crossing the midline — a lower bar to clear, but also a weaker signal.

---

## 3. Multi-Timeframe Candle Confluence

::: tip 💡 Confluence and Conflict
Candlestick patterns can appear on multiple timeframes at once. **<mark>Confluence = the big timeframe sets direction, the small one times it; conflict = defer to the big timeframe and downgrade the small-timeframe signal</mark>.**
:::

### 3.1 Weekly vs. Daily Combination Patterns

| Weekly (big TF) | Daily (small TF) | How to handle |
|---|---|---|
| Uptrend (no topping pattern) | Evening star appears | Just a daily pullback; buy dips at support; no panic |
| Weekly topping pattern (evening star/engulfing) | Morning star appears | The daily bounce is just a pullback off the weekly top; the bounce is a chance to reduce |
| Weekly bottom pattern (hammer/engulfing) | Three white soldiers | Best confluence: big-TF turn + small-TF momentum; a prime participation setup |
| Weekly bottom pattern | Three black crows | The final decline at the daily level; wait for daily stabilization — don't front-run |
| Weekly sideways | Any daily pattern | Pattern downgrades to "oscillation inside a box"; signal credibility halved |

::: tip 💡 Core Rule
**Core rule: <mark>the big-timeframe pattern decides "whether it is worth participating"; the small-timeframe pattern decides "when to participate"</mark>.** A small-timeframe signal can never overturn the big-timeframe structure — it can only pick the entry point within that structure.
:::

### 3.2 Pattern Reconstruction Across Timeframes

The same stretch of price action "grows into" different patterns on different timeframes:

```text
Daily view:                    Weekly view:
╱╲     ╱╲
╱  ╲   ╱  ╲                    ╱╲
╱    ╲╱    ╲                  ╱  ╲
╱             ╲              ╱    ╲
╱               ╲           ╱      ╲
(looks like a head and shoulders top?)   (just a rising wedge / pullback?)
```

- **Patterns are timeframe-dependent**: a "head and shoulders top" on the daily may be just a normal pullback within a big weekly uptrend; a weekly hammer may be an entire downleg when viewed on the daily;
- **Scaling up the timeframe reduces noise and slows signals**: three white soldiers on the 30-minute chart happen almost daily and mean nothing; a hammer on the monthly chart appears once in years and carries enormous weight;
- **Reconstruction method**: when switching timeframes, first verify whether the "pattern boundary" you saw is still the same line on the bigger timeframe. **The same neckline/support sits at different places on different timeframes — a pattern only means something inside the timeframe that defines it.**

**Common errors**:
- Going all-in on a "morning star" seen on the 15-minute chart — small-TF patterns match small-TF moves; at most a quick trade;
- Using a weekly pattern to guide daily trading without waiting for daily confirmation — like aiming a cannon at a distant target and firing with your eyes shut;
- Too many timeframes create "there is always confluence": watch 5 timeframes and one of them will always show the signal you want — **keep only 2–3 (e.g., 15m/daily/weekly), and always write down "what the big-TF structure is" before discussing the small TF.**

---

## 4. Candles and Volume Together

> Candles describe "what happened to price"; volume answers "how real it was". **A candle pattern without volume endorsement can be treated as nonexistent on illiquid instruments and in thin sessions.**

### 4.1 Pattern + Volume Confirmation Rules

| Pattern type | Correct volume | Dangerous volume |
|---|---|---|
| Bottom reversal (hammer/morning star/piercing) | Reversal candle on **expansion** (real absorption) | Contraction (merely "can't fall", not "someone is buying") |
| Top reversal (shooting star/evening star/dark cloud) | Reversal candle on **expansion** (real distribution) | Contraction (supply not exhausted; the fall won't complete) |
| Continuation (three soldiers/three crows) | Gently rising volume | Blow-off volume (momentum spent in one day) |
| Breakout type (tweezer-top break, outside reversal) | Breakout day ≥ 1.5× average volume | Expansion with stalling / spike-and-fade |
| Pause type (hammer during a pullback) | Contracting pullback + expanding bounce | Expanding decline (trend reversal alarm) |

```text
The correct posture for a bottom reversal:
price│    ┌─┐
    │    │ │ ← expanding bullish candle confirms
    │  ┌─┴─┴─┐
    │  │hammer│ ← may appear on contraction first (supply exhausted)
    └──┴─────┴──────→
volume│      █
    │      ███  ← the confirming candle's expansion is "decisive evidence"
    └──────────────→
```

### 4.2 Three Volume Iron Rules

1. **For reversals, watch the confirmation day's volume, not the pattern day's**: the hammer itself may come on contraction, but the next-day confirming candle must expand — a next-day bullish candle on contraction is just a weak bounce.
2. **Expansion only counts at a "key level"**: an expanding bullish candle mid-box is noise; an expanding bullish candle at a prior low/neckline/moving average is a signal — the value of volume = location × magnitude.
3. **Act only when pattern + volume + location all resonate**: shape without volume (weak signal), volume without location (noise), location without shape (ordinary fluctuation) — each is missing a dimension. With all three present, the win rate is worth your money.

---

## 5. Candlesticks Across International Markets

> Candlesticks were born in the Japanese rice market, but when transplanted into different markets, "market structure" warps what wicks and patterns mean. **Changing markets requires changing the frame of reference — the most easily ignored rule of advanced usage.**

### 5.1 US Stocks: The Most "Textbook" Market

- **Strengths**: superb liquidity, continuous trading hours (including pre/post-market), balanced participant structure — candle patterns track the textbook most closely and wicks carry real battle meaning;
- **Traits**: the close (especially the closing auction) carries enormous weight; closing patterns (where the close sits within the body) are more reliable than intraday ones;
- **Watch out**: pre/post-market gaps disrupt candle continuity (open-high-fade patterns are common), and event-driven one-day mega-volume candles (earnings, Fed meetings) have their wick meanings polluted by event noise — do not read them as ordinary technical candles.

### 5.2 Crypto: 24-Hour Continuous Trading

- **Continuous candles**: 24 × 7 with no breaks, no "artificial cut points" between candles — the traditional "open" concept is weakened (no psychological anchor at the day's start), and wick meaning depends more on the intraday session (Asian/European/US sessions differ sharply in trade density);
- **<mark>Wick hunts</mark>**: in thin-liquidity windows (early morning, weekends), wicks are often "wick hunts" (instant spikes pierced and pulled back); such wicks do not represent real bull-bear battles, only **liquidity gaps** — hence the false-signal rate of "long lower wick = bottom" in crypto is far higher than in US stocks;
- **Gaps**: crypto gaps are almost always "hourly-scale", gapping on minute/hour charts and filling quickly; daily gaps are extremely rare; applying A-share gap theory (unfilled for days = valid) to crypto fails completely;
- **7×24 exceptions**: exchange maintenance, chain migrations, and major regulatory events can create "artificial gaps" whose fill behavior is unpredictable.

### 5.3 Forex: No Centralized Exchange

- **Continuous but not around-the-clock**: forex closes Friday and reopens Sunday — a real weekend discontinuity; Monday's opening candles often carry weekend position adjustments, so their patterns are less reliable than mid-week ones;
- **No single matching point**: forex is a decentralized interbank quote market with no unified "volume" caliber; volume-based confirmation (Section 4) is nearly unusable directly — rely mainly on price action itself;
- **Session-driven**: London/New York/Asia sessions have entirely different volatility characters; when one candle spans sessions its wick meaning is not comparable — pattern analysis should proceed by "session slices" rather than "calendar days".

### 5.4 Holiday Gaps (A-Shares / HK Stocks)

- **Long-holiday gaps**: gaps around Chinese New Year / National Day in A-shares do get filled in hindsight, but the timing is unpredictable (possibly months later);
- **Handling principle**: top/bottom patterns that form right before a long holiday deserve a question mark — overnight information accumulated over the holiday is released all at once; once the pattern boundary is breached, **defer to the actual post-gap price action rather than stubbornly clinging to the pre-holiday pattern call**;
- **Christmas / year-end liquidity drought** (US/HK stocks): candles in thin liquidity tend to run long wicks and false signals multiply — cut the frequency of pattern trading accordingly.

---

## 6. Limitations of Candlesticks

### 6.1 Success Rates of the Same Pattern Across Markets

| Pattern | Mature equity markets (US/HK blue chips) | A-shares | Crypto / small caps | Forex |
|---|---|---|---|---|
| Hammer bottom | Fairly high (rational participants, thorough turnover) | Medium (emotional + price-limit interference) | Leaning low (many fake wick-hunt wicks) | Medium (session-dependent) |
| Engulfing reversal | High | High (a classic A-share pattern) | Medium (needs volume) | Medium |
| Evening star top | High | Medium (one-price/limit-up days can't form one) | Medium | Leaning low (extreme trend inertia) |
| Doji regime change | Medium | Leaning low (one-price bars swallow dojis) | Medium | Leaning low |
| Gap theory | Modest | High (price limits + overnight system) | Extremely low (almost no daily gaps) | Low (24h continuous) |

::: tip 💡 Conclusion
**Conclusion: <mark>there is no candle pattern that "fits all markets"</mark>.** Every pattern embeds assumptions about "market structure" (continuous trading, rational turnover, no price limits); when the structure differs, pattern validity must be recalibrated.
:::

### 6.2 Risks of Mechanical Application

1. **Hindsight confirmation bias**: looking back at a chart, every top "happens" to have a shooting star and every bottom "happens" to have a hammer — because you only remember the confirmed ones and forget the failures. In real statistics, single-candle patterns mostly win 50%–60% of the time — barely better than a coin flip.
2. **Subjectivity of pattern recognition**: the same candle is a "long upper wick" to one person and "ordinary fluctuation" to another; there is no objective standard for wick thresholds or body sizes, and different statistical calibers produce wildly different conclusions.
3. **Wrong location is the biggest killer**: applying "a shooting star at the end of a rally" to "a bounce mid-decline" inverts the meaning entirely — **always ask location first, shape second.**
4. **Candles have no time dimension**: after a hammer, the reversal may come in 1 day, 1 week, or 1 month — candles never tell you when it cashes out; you need a **<mark>stop-loss</mark>** to absorb the "right signal, wrong timing" risk.
5. **Even the strongest pattern needs a stop**: even a textbook triple resonance (big-TF pattern + expansion + key level) is only a probabilistic edge, not a certainty. Always manage positions by the rules of the [07 · Trading Systems](../trading-system/) chapter.

---

::: warning ⚠️ Risk Warning
Candlesticks are "a language describing past bull-bear battles", not "a crystal ball predicting the future". The same pattern's success rate varies hugely across markets, timeframes, and locations; wicks and patterns generate many false signals in thin-liquidity windows (crypto early mornings, US pre-market, around long holidays); **no candlestick signal constitutes a buy/sell instruction** — treat patterns as probabilistic edges, always combined with position management and stop-loss discipline, and never abandon risk management or bet the farm with **<mark>leverage</mark>** just because "a classic pattern appeared on the chart". This article is for educational purposes only and does not constitute investment advice.
:::
