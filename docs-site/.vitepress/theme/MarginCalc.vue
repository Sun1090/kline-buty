<script setup>
import { ref, computed } from 'vue'

const capital = ref(10000)
const leverage = ref(20)
const entry = ref(60000)
const side = ref('long')
const mmr = ref(0.5) // 维持保证金率 %

const result = computed(() => {
  const c = Number(capital.value) || 0
  const lev = Math.max(1, Number(leverage.value) || 1)
  const e = Number(entry.value) || 0
  const m = Number(mmr.value) / 100
  const notional = c * lev
  const margin = c
  const mm = notional * m
  // 简化线性模型（未含阶梯维持保证金与手续费）
  const liq = side.value === 'long'
    ? e * (1 - 1 / lev + m)
    : e * (1 + 1 / lev - m)
  const liqMove = e > 0 ? ((liq - e) / e) * 100 : 0
  return { notional, mm, liq, liqMove }
})
</script>

<template>
  <div class="kb-calc">
    <div class="kb-calc-row">
      <label>保证金（USDT）</label>
      <input v-model.number="capital" type="number" min="0" />
    </div>
    <div class="kb-calc-row">
      <label>杠杆倍数 <span class="kb-calc-tag">{{ leverage }}x</span></label>
      <input v-model.number="leverage" type="range" min="1" max="125" step="1" />
    </div>
    <div class="kb-calc-row">
      <label>开仓价</label>
      <input v-model.number="entry" type="number" min="0" />
    </div>
    <div class="kb-calc-row">
      <label>方向</label>
      <div class="kb-side">
        <button :class="{ on: side === 'long' }" @click="side = 'long'">做多</button>
        <button :class="{ on: side === 'short' }" @click="side = 'short'">做空</button>
      </div>
    </div>
    <div class="kb-calc-row">
      <label>维持保证金率 <span class="kb-calc-tag">{{ mmr }}%</span></label>
      <input v-model.number="mmr" type="range" min="0.1" max="2" step="0.1" />
    </div>
    <div class="kb-calc-result">
      <div class="kb-calc-line">
        <span>名义仓位</span>
        <strong>{{ result.notional.toLocaleString() }}</strong>
      </div>
      <div class="kb-calc-line">
        <span>维持保证金（最低要求）</span>
        <strong>{{ result.mm.toLocaleString(undefined, { maximumFractionDigits: 1 }) }}</strong>
      </div>
      <div class="kb-calc-line">
        <span>预估强平价</span>
        <strong class="neg">{{ result.liq.toLocaleString(undefined, { maximumFractionDigits: 2 }) }}</strong>
      </div>
      <div class="kb-calc-line">
        <span>距强平的{{ side === 'long' ? '下跌' : '上涨' }}空间</span>
        <strong class="neg">{{ result.liqMove.toFixed(2) }}%</strong>
      </div>
    </div>
    <p class="kb-calc-note">⚠ 简化线性模型：未含阶梯维持保证金、手续费与资金费；交易所真实强平价会比估算更近，别贴着强平价开仓。</p>
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
.kb-side { display: flex; gap: 8px; }
.kb-side button {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
}
.kb-side button.on.long, .kb-side button.on:first-child { border-color: #ef5350; color: #ef5350; font-weight: 700; }
.kb-side button.on { border-color: #26a69a; color: #26a69a; font-weight: 700; }
.kb-side button.on:first-child { border-color: #ef5350; color: #ef5350; }
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
.kb-calc-line strong { font-size: 16px; }
.kb-calc-line strong.pos { color: #26a69a; }
.kb-calc-line strong.neg { color: #ef5350; }
.kb-calc-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
</style>
