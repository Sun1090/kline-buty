<script setup>
import { ref, computed } from 'vue'

const spot = ref(60000)
const strike = ref(62000)
const vol = ref(50) // 年化波动率 %
const rate = ref(3) // 无风险利率 %
const days = ref(30) // 距到期天数

/** Abramowitz-Stegun 7.1.26 误差函数近似（|ε| < 1.5e-7） */
function erf(x) {
  const s = Math.sign(x)
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x)
  return s * y
}
const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2))
const normPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)

const bs = computed(() => {
  const S = Math.max(1e-9, Number(spot.value) || 0)
  const K = Math.max(1e-9, Number(strike.value) || 0)
  const sigma = Math.max(1e-4, Number(vol.value) / 100)
  const r = Number(rate.value) / 100
  const T = Math.max(1 / 365 / 24, Number(days.value) / 365) // 至少留 1 小时避免 T=0 奇点

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const disc = Math.exp(-r * T)

  const call = S * normCdf(d1) - K * disc * normCdf(d2)
  const put = K * disc * normCdf(-d2) - S * normCdf(-d1)
  const deltaC = normCdf(d1)
  const deltaP = deltaC - 1
  const gamma = normPdf(d1) / (S * sigma * sqrtT)
  // Theta（年化）/365 → 每自然日；Vega（每 1.0 波动率）/100 → 每 1 个百分点
  const thetaC =
    (-(S * normPdf(d1) * sigma) / (2 * sqrtT) - r * K * disc * normCdf(d2)) / 365
  const thetaP =
    (-(S * normPdf(d1) * sigma) / (2 * sqrtT) + r * K * disc * normCdf(-d2)) / 365
  const vega = (S * normPdf(d1) * sqrtT) / 100

  const intrinsicC = Math.max(0, S - K)
  const intrinsicP = Math.max(0, K - S)
  return {
    call, put, deltaC, deltaP, gamma, thetaC, thetaP, vega,
    intrinsicC, timeC: call - intrinsicC,
    intrinsicP, timeP: put - intrinsicP,
  }
})
const fmt = (v) =>
  v.toLocaleString(undefined, { maximumFractionDigits: v >= 100 ? 1 : 2 })
</script>

<template>
  <div class="kb-calc">
    <div class="kb-calc-row">
      <label>标的现价 S</label>
      <input v-model.number="spot" type="number" min="0" />
    </div>
    <div class="kb-calc-row">
      <label>行权价 K</label>
      <input v-model.number="strike" type="number" min="0" />
    </div>
    <div class="kb-calc-row">
      <label>年化波动率 σ <span class="kb-calc-tag">{{ vol }}%</span></label>
      <input v-model.number="vol" type="range" min="5" max="150" step="1" />
    </div>
    <div class="kb-calc-row">
      <label>无风险利率 r <span class="kb-calc-tag">{{ rate }}%</span></label>
      <input v-model.number="rate" type="range" min="0" max="8" step="0.25" />
    </div>
    <div class="kb-calc-row">
      <label>距到期 <span class="kb-calc-tag">{{ days }} 天</span></label>
      <input v-model.number="days" type="range" min="1" max="365" step="1" />
    </div>

    <div class="kb-calc-result">
      <div class="kb-calc-line">
        <span>Call 理论价</span>
        <strong class="pos">{{ fmt(bs.call) }}</strong>
      </div>
      <div class="kb-calc-line">
        <span>　内在 / 时间价值</span>
        <span>{{ fmt(bs.intrinsicC) }} / {{ fmt(bs.timeC) }}</span>
      </div>
      <div class="kb-calc-line">
        <span>Put 理论价</span>
        <strong class="pos">{{ fmt(bs.put) }}</strong>
      </div>
      <div class="kb-calc-line">
        <span>　内在 / 时间价值</span>
        <span>{{ fmt(bs.intrinsicP) }} / {{ fmt(bs.timeP) }}</span>
      </div>
      <div class="kb-grid">
        <div><span>Delta C/P</span><b>{{ bs.deltaC.toFixed(3) }} / {{ bs.deltaP.toFixed(3) }}</b></div>
        <div><span>Gamma</span><b>{{ bs.gamma.toExponential(2) }}</b></div>
        <div><span>Theta C/P 每日</span><b>{{ bs.thetaC.toFixed(2) }} / {{ bs.thetaP.toFixed(2) }}</b></div>
        <div><span>Vega 每 1% vol</span><b>{{ bs.vega.toFixed(2) }}</b></div>
      </div>
    </div>
    <p class="kb-calc-note">⚠ Black-Scholes 假设：欧式行权、无分红、波动率恒定——加密与个股实盘都会偏离；把它当「波动率翻译器」用，不当报价机用。</p>
  </div>
</template>

<style scoped>
.kb-calc {
  border: 1px solid rgba(128,140,180,0.2);
  border-radius: 12px;
  padding: 18px 20px;
  margin: 18px 0;
  background: var(--vp-c-bg-soft, rgba(128,140,180,0.06));
}
.kb-calc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.kb-calc-row label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  flex: 0 0 auto;
}
.kb-calc-row input[type="number"] {
  width: 120px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
}
.kb-calc-row input[type="range"] {
  flex: 1;
  max-width: 200px;
}
.kb-calc-tag {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(41,98,255,0.12);
  color: #4e9cf5;
  font-weight: 700;
}
.kb-calc-result {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(13,21,38,0.5);
  border: 1px solid var(--vp-c-divider);
}
.kb-calc-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}
.kb-calc-line span:last-child { font-size: 13px; color: var(--vp-c-text-2); }
.kb-calc-line strong { font-size: 16px; }
.kb-calc-line strong.pos { color: #26a69a; }
.kb-grid {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--vp-c-divider);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  font-size: 13px;
}
.kb-grid div { display: flex; justify-content: space-between; }
.kb-grid span { color: var(--vp-c-text-3); }
.kb-grid b { color: var(--vp-c-text-1); }
.kb-calc-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
</style>
