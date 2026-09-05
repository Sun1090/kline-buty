<script setup>
import { ref, computed } from 'vue'
import { calcLeverage } from './kbCalc'

const capital = ref(10000)
const leverage = ref(10)
const priceChange = ref(-10) // %

const result = computed(() => calcLeverage(capital.value, leverage.value, priceChange.value))
</script>

<template>
  <div class="kb-calc">
    <div class="kb-calc-row">
      <label>本金（USDT/元）</label>
      <input v-model.number="capital" type="number" min="0" />
    </div>
    <div class="kb-calc-row">
      <label>杠杆倍数 <span class="kb-calc-tag">{{ leverage }}x</span></label>
      <input v-model.number="leverage" type="range" min="1" max="100" step="1" />
    </div>
    <div class="kb-calc-row">
      <label>价格涨跌幅 <span class="kb-calc-tag" :class="priceChange < 0 ? 'neg' : 'pos'">{{ priceChange }}%</span></label>
      <input v-model.number="priceChange" type="range" min="-50" max="50" step="1" />
    </div>
    <div class="kb-calc-result" :class="{ blow: result.liquidated }">
      <div class="kb-calc-line">
        <span>名义仓位</span>
        <strong>{{ result.notional.toLocaleString() }}</strong>
      </div>
      <div class="kb-calc-line">
        <span>盈亏金额</span>
        <strong :class="result.pnl >= 0 ? 'pos' : 'neg'">
          {{ result.pnl >= 0 ? '+' : '' }}{{ result.pnl.toLocaleString(undefined,{maximumFractionDigits:0}) }}
        </strong>
      </div>
      <div class="kb-calc-line">
        <span>本金盈亏</span>
        <strong :class="result.pnlPct >= 0 ? 'pos' : 'neg'">
          {{ result.pnlPct >= 0 ? '+' : '' }}{{ result.pnlPct.toFixed(1) }}%
        </strong>
      </div>
      <div v-if="result.liquidated" class="kb-calc-blow">💀 已爆仓！本金归零（甚至倒欠）</div>
      <div v-else class="kb-calc-line">
        <span>剩余本金</span>
        <strong>{{ result.remaining.toLocaleString(undefined,{maximumFractionDigits:0}) }}</strong>
      </div>
    </div>
    <p class="kb-calc-note">⚠ 杠杆放大的是伤害不是收益——{{ leverage }}x 杠杆下价格反向 {{ (100/leverage).toFixed(1) }}% 即爆仓。</p>
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
.kb-calc-tag.neg { background: rgba(239,83,80,0.12); color: #ef5350; }
.kb-calc-tag.pos { background: rgba(38,166,154,0.12); color: #26a69a; }
.kb-calc-result {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(13,21,38,0.5);
  border: 1px solid var(--vp-c-divider);
}
.kb-calc-result.blow {
  border-color: #ef5350;
  background: rgba(239,83,80,0.08);
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
.kb-calc-blow {
  text-align: center;
  color: #ef5350;
  font-weight: 700;
  font-size: 16px;
  padding: 8px 0;
}
.kb-calc-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
</style>