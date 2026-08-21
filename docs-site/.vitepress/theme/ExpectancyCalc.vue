<script setup>
import { ref, computed } from 'vue'

const winRate = ref(40) // %
const avgWin = ref(2) // R 倍数
const avgLoss = ref(1) // R 倍数
const risk = ref(1000) // 每次风险额

const result = computed(() => {
  const p = Math.min(100, Math.max(0, Number(winRate.value) / 100))
  const w = Math.max(0, Number(avgWin.value) || 0)
  const l = Math.max(0, Number(avgLoss.value) || 0)
  const r = Math.max(0, Number(risk.value) || 0)
  const rr = l > 0 ? w / l : Infinity
  const expectancy = p * w - (1 - p) * l // 单次期望，R 为单位
  const expectancyMoney = expectancy * r
  const kelly = w > 0 ? Math.max(0, p - (1 - p) * (l / w)) : 0
  const halfKelly = kelly / 2
  const viable = expectancy > 0
  return { rr, expectancy, expectancyMoney, kelly, halfKelly, viable }
})
</script>

<template>
  <div class="kb-calc">
    <div class="kb-calc-row">
      <label>胜率 <span class="kb-calc-tag">{{ winRate }}%</span></label>
      <input v-model.number="winRate" type="range" min="1" max="99" step="1" />
    </div>
    <div class="kb-calc-row">
      <label>平均盈利（R 的倍数）<span class="kb-calc-tag pos">{{ avgWin }}R</span></label>
      <input v-model.number="avgWin" type="range" min="0.1" max="10" step="0.1" />
    </div>
    <div class="kb-calc-row">
      <label>平均亏损（R 的倍数）<span class="kb-calc-tag neg">{{ avgLoss }}R</span></label>
      <input v-model.number="avgLoss" type="range" min="0.1" max="5" step="0.1" />
    </div>
    <div class="kb-calc-row">
      <label>单次风险额（1R = ）</label>
      <input v-model.number="risk" type="number" min="0" />
    </div>
    <div class="kb-calc-result" :class="{ blow: !result.viable }">
      <div class="kb-calc-line">
        <span>盈亏比</span>
        <strong>{{ isFinite(result.rr) ? result.rr.toFixed(2) : '∞' }}</strong>
      </div>
      <div class="kb-calc-line">
        <span>单次期望值</span>
        <strong :class="result.viable ? 'pos' : 'neg'">
          {{ result.expectancy >= 0 ? '+' : '' }}{{ result.expectancy.toFixed(2) }}R
        </strong>
      </div>
      <div class="kb-calc-line">
        <span>期望金额 / 次</span>
        <strong :class="result.viable ? 'pos' : 'neg'">
          {{ result.expectancyMoney >= 0 ? '+' : '' }}{{ result.expectancyMoney.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
        </strong>
      </div>
      <div class="kb-calc-line">
        <span>凯利仓位 f*</span>
        <strong>{{ (result.kelly * 100).toFixed(1) }}%</strong>
      </div>
      <div class="kb-calc-line">
        <span>半凯利（更稳）</span>
        <strong class="pos">{{ (result.halfKelly * 100).toFixed(1) }}%</strong>
      </div>
      <div v-if="!result.viable" class="kb-calc-blow">💀 期望为负：胜率和盈亏比组合是亏钱系统，仓位管理救不了负期望。</div>
    </div>
    <p class="kb-calc-note">⚠ 期望 &gt; 0 才谈得上下单；实盘建议从 1/4 凯利起步——凯利假设你输得起，而人输不起。</p>
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
  font-size: 15px;
  padding: 8px 0;
}
.kb-calc-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
</style>
