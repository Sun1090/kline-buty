<script setup>
import { ref, computed } from 'vue'
import { useData, withBase } from 'vitepress'

const { lang } = useData()
const isZH = computed(() => String(lang.value || '').startsWith('zh'))

const roles = computed(() => {
  const label = (zh, en) => (isZH.value ? zh : en)
  return [
    { id: 'all', icon: '🌐', label: label('全部章节', 'All chapters'), chapters: [] },
    { id: 'newbie', icon: '🐣', label: label('零基础新手', 'Beginner'), chapters: ['getting-started', 'spot', 'wealth-allocation'] },
    { id: 'stock', icon: '📈', label: label('股民 / A 股', 'Stock investor'), chapters: ['stocks', 'financial-statements', 'industry-research', 'trading-practice'] },
    { id: 'futures', icon: '🔩', label: label('期货 / 商品', 'Futures'), chapters: ['futures', 'markets-instruments', 'data-interpretation'] },
    { id: 'crypto', icon: '🪙', label: label('加密玩家', 'Crypto'), chapters: ['crypto-perpetuals', 'markets-instruments', 'trading-practice', 'regulation-compliance'] },
    { id: 'quant', icon: '💻', label: label('量化 / 程序员', 'Quant'), chapters: ['quant-practice', 'system-integration', 'tools-platforms', 'career'] },
    { id: 'option', icon: '🎯', label: label('期权学习', 'Options'), chapters: ['markets-instruments', 'options-strategies'] },
    { id: 'safe', icon: '🛡️', label: label('只求避坑', 'Risk-averse'), chapters: ['pitfalls', 'behavioral-finance', 'regulation-compliance'] },
  ]
})

const active = ref('all')

const stages = computed(() => {
  const zh = [
    { name: '1 · 地基', hint: '新手必读', items: [
      ['getting-started', '入门基础', '术语 · 行情软件'],
      ['spot', '现货篇', '现货买卖'],
      ['stocks', '股票篇', '股市规则'],
    ] },
    { name: '2 · 进阶', hint: '理解机制', items: [
      ['futures', '期货篇', '杠杆 · 保证金'],
      ['crypto-perpetuals', '加密合约', '永续 · 爆仓'],
      ['markets-instruments', '市场与品种', '品种视野'],
      ['technical-analysis', '技术分析', 'K 线 · 指标'],
      ['trading-system', '交易系统', '系统 · 风控'],
    ] },
    { name: '3 · 实战', hint: '把知识变操作', items: [
      ['pitfalls', '入土篇', '避坑 · 骗局'],
      ['trading-practice', '交易实战', '策略实操'],
      ['market-ecosystem', '市场生态', '对手盘'],
      ['financial-history', '金融历史', '泡沫教训'],
      ['wealth-allocation', '理财配置', '资产配置'],
      ['quant-practice', '量化实战', '回测 · 自动化'],
      ['data-interpretation', '数据解读', '宏观 · 财报'],
    ] },
    { name: '4 · 深潜', hint: '按方向专精', items: [
      ['global-markets', '全球市场', '跨境投资'],
      ['regulation-compliance', '监管合规', '牌照 · 边界'],
      ['tools-platforms', '工具平台', '软件 · 券商'],
      ['financial-statements', '财务深读', '报表 · 造假'],
      ['industry-research', '行业研究', '产业链 · 护城河'],
      ['reading-list', '经典书单', '五层书单'],
      ['behavioral-finance', '行为金融', '认知偏差'],
      ['bonds-rates', '债券利率', '收益率曲线'],
      ['forex-trading', '外汇实战', '利差 · 央行'],
      ['career', '职业发展', '职业路径'],
      ['options-strategies', '期权策略', '组合 · 波动率'],
    ] },
  ]
  const en = [
    { name: '1 · Foundation', hint: 'Must-read', items: [
      ['getting-started', 'Getting Started', 'Terms · Terminals'],
      ['spot', 'Spot', 'Spot trading'],
      ['stocks', 'Stocks', 'Market rules'],
    ] },
    { name: '2 · Mechanics', hint: 'How it works', items: [
      ['futures', 'Futures', 'Leverage · Margin'],
      ['crypto-perpetuals', 'Perpetuals', 'Funding · Liquidation'],
      ['markets-instruments', 'Markets', 'Instrument map'],
      ['technical-analysis', 'Tech Analysis', 'Candles · Indicators'],
      ['trading-system', 'System', 'Rules · Risk'],
    ] },
    { name: '3 · Practice', hint: 'Make it actionable', items: [
      ['pitfalls', 'Pitfalls', 'Scams · Losses'],
      ['trading-practice', 'Practice', 'Playbooks'],
      ['market-ecosystem', 'Ecosystem', 'Counterparties'],
      ['financial-history', 'History', 'Bubbles'],
      ['wealth-allocation', 'Allocation', 'Portfolios'],
      ['quant-practice', 'Quant', 'Backtests · Bots'],
      ['data-interpretation', 'Data', 'Macro · Earnings'],
    ] },
    { name: '4 · Deep Dives', hint: 'Specialize', items: [
      ['global-markets', 'Global', 'Cross-border'],
      ['regulation-compliance', 'Regulation', 'Licenses'],
      ['tools-platforms', 'Tools', 'Platforms'],
      ['financial-statements', 'Statements', 'Fraud · FCF'],
      ['industry-research', 'Industry', 'Moats'],
      ['reading-list', 'Books', 'Five layers'],
      ['behavioral-finance', 'Behavior', 'Biases'],
      ['bonds-rates', 'Bonds', 'Yield curve'],
      ['forex-trading', 'Forex', 'Carry · CBs'],
      ['career', 'Career', 'Paths'],
      ['options-strategies', 'Options', 'Structures'],
    ] },
  ]
  const src = isZH.value ? zh : en
  const prefix = isZH.value ? '/zh/' : '/'
  return src.map((s) => ({
    ...s,
    items: s.items.map(([id, label, desc]) => ({ id, label, desc, dir: `${prefix}${id}/` })),
  }))
})

function isActive(id) {
  const r = roles.value.find((x) => x.id === active.value)
  return active.value === 'all' || (r && r.chapters.includes(id))
}
function stageActive(stage) {
  return stage.items.some((i) => isActive(i.id))
}
</script>

<template>
  <div class="lp">
    <div class="lp-roles">
      <button
        v-for="r in roles"
        :key="r.id"
        :class="{ on: active === r.id }"
        @click="active = r.id"
      >
        {{ r.icon }} {{ r.label }}
      </button>
    </div>

    <div class="lp-stages">
      <div v-for="s in stages" :key="s.name" class="lp-stage" :class="{ dim: !stageActive(s) }">
        <div class="lp-stage-head">
          <span class="lp-stage-name">{{ s.name }}</span>
          <span class="lp-stage-hint">{{ s.hint }}</span>
        </div>
        <a
          v-for="i in s.items"
          :key="i.id"
          :href="withBase(i.dir)"
          class="lp-chip"
          :class="{ hit: isActive(i.id) }"
        >
          <span class="lp-chip-label">{{ i.label }}</span>
          <span class="lp-chip-desc">{{ i.desc }}</span>
        </a>
      </div>
    </div>

    <p class="lp-note">
      {{ isZH
        ? '点击章节卡片直达；选择上方角色，只保留你的路径，其余变暗。'
        : 'Click a chapter card to jump; pick a role above to keep only your path.' }}
    </p>
  </div>
</template>

<style scoped>
.lp {
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 18px;
  margin: 20px 0;
  background: var(--vp-c-bg-soft);
}
.lp-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.lp-roles button {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.lp-roles button:hover { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
.lp-roles button.on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
  font-weight: 700;
}
.lp-stages {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: stretch;
}
.lp-stage {
  flex: 1 1 200px;
  min-width: 180px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
  padding: 12px;
  transition: opacity 0.2s;
}
.lp-stage.dim { opacity: 0.35; }
.lp-stage-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.lp-stage-name { font-size: 14px; font-weight: 700; color: var(--vp-c-text-1); }
.lp-stage-hint { font-size: 11.5px; color: var(--vp-c-text-3); }
.lp-chip {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  text-decoration: none;
  transition: all 0.15s;
  opacity: 0.45;
}
.lp-chip.hit { opacity: 1; }
.lp-chip.hit .lp-chip-label { color: var(--vp-c-brand-1); }
.lp-chip:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}
.lp-chip-label { font-size: 13.5px; font-weight: 600; color: var(--vp-c-text-1); }
.lp-chip-desc { font-size: 11.5px; color: var(--vp-c-text-3); margin-top: 2px; }
.lp-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
@media (max-width: 640px) {
  .lp-stage { flex: 1 1 100%; }
}
</style>
