<script setup>
import { ref } from 'vue'
import { withBase } from 'vitepress'

const roles = [
  { id: 'all', icon: '🌐', label: '全部章节', chapters: [] },
  { id: 'newbie', icon: '🐣', label: '零基础新手', chapters: ['01', '02', '14'] },
  { id: 'stock', icon: '📈', label: '股民 / A 股', chapters: ['04', '18', '19', '11'] },
  { id: 'futures', icon: '🔩', label: '期货 / 商品', chapters: ['03', '09', '26'] },
  { id: 'crypto', icon: '🪙', label: '加密玩家', chapters: ['05', '09', '11', '16'] },
  { id: 'quant', icon: '💻', label: '量化 / 程序员', chapters: ['15', '10', '17', '24'] },
  { id: 'option', icon: '🎯', label: '期权学习', chapters: ['09', '27'] },
  { id: 'safe', icon: '🛡️', label: '只求避坑', chapters: ['08', '21', '16'] },
]
const active = ref('all')

const stages = [
  {
    name: '1 · 地基',
    hint: '看懂',
    items: [
      { id: '01', dir: '01-入门基础/', label: '入门基础', desc: '术语 · 行情软件' },
      { id: '02', dir: '02-现货篇/', label: '现货篇', desc: '现货买卖' },
      { id: '04', dir: '04-股票篇/', label: '股票篇', desc: '股市规则' },
    ],
  },
  {
    name: '2 · 进阶',
    hint: '能战',
    items: [
      { id: '03', dir: '03-期货篇/', label: '期货篇', desc: '杠杆 · 保证金' },
      { id: '05', dir: '05-加密合约篇/', label: '加密合约', desc: '永续 · 爆仓' },
      { id: '09', dir: '09-市场与品种专题篇/', label: '市场与品种', desc: '品种视野' },
      { id: '06', dir: '06-技术分析篇/', label: '技术分析', desc: 'K 线 · 指标' },
      { id: '07', dir: '07-交易系统篇/', label: '交易系统', desc: '系统 · 风控' },
    ],
  },
  {
    name: '3 · 实战',
    hint: '实操',
    items: [
      { id: '08', dir: '08-入土篇/', label: '入土篇', desc: '避坑 · 骗局' },
      { id: '11', dir: '11-交易实战篇/', label: '交易实战', desc: '策略实操' },
      { id: '12', dir: '12-市场生态篇/', label: '市场生态', desc: '对手盘' },
      { id: '13', dir: '13-金融历史篇/', label: '金融历史', desc: '泡沫教训' },
      { id: '14', dir: '14-理财配置篇/', label: '理财配置', desc: '资产配置' },
      { id: '15', dir: '15-量化实战篇/', label: '量化实战', desc: '回测 · 自动化' },
      { id: '26', dir: '26-数据解读实战篇/', label: '数据解读', desc: '宏观 · 财报' },
    ],
  },
  {
    name: '4 · 深潜',
    hint: '专精',
    items: [
      { id: '25', dir: '25-全球市场地图篇/', label: '全球市场', desc: '跨境投资' },
      { id: '16', dir: '16-监管与合规篇/', label: '监管合规', desc: '牌照 · 边界' },
      { id: '17', dir: '17-工具与平台篇/', label: '工具平台', desc: '软件 · 券商' },
      { id: '18', dir: '18-财务深读篇/', label: '财务深读', desc: '报表 · 造假' },
      { id: '19', dir: '19-行业研究篇/', label: '行业研究', desc: '产业链 · 护城河' },
      { id: '20', dir: '20-经典书单篇/', label: '经典书单', desc: '五层书单' },
      { id: '21', dir: '21-行为金融篇/', label: '行为金融', desc: '认知偏差' },
      { id: '22', dir: '22-债券与利率深潜篇/', label: '债券利率', desc: '收益率曲线' },
      { id: '23', dir: '23-外汇交易实战篇/', label: '外汇实战', desc: '利差 · 央行' },
      { id: '24', dir: '24-职业发展篇/', label: '职业发展', desc: '职业路径' },
      { id: '27', dir: '27-期权策略进阶篇/', label: '期权策略', desc: '组合 · 波动率' },
    ],
  },
]

const roleHint = { 地基: '新手必读', 进阶: '理解机制', 实战: '把知识变操作', 深潜: '按方向专精' }
function isActive(id) {
  const r = roles.find((r) => r.id === active.value)
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
          <span class="lp-stage-hint">{{ roleHint[s.name.slice(3)] || '' }}</span>
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
      <div class="lp-arrow" aria-hidden="true">→</div>
    </div>

    <p class="lp-note">点击章节卡片直达；选择上方角色，只保留你的路径，其余变暗。</p>
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
.lp-arrow {
  align-self: center;
  font-size: 20px;
  color: var(--vp-c-text-3);
}
.lp-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}
@media (max-width: 640px) {
  .lp-stage { flex: 1 1 100%; }
  .lp-arrow { display: none; }
}
</style>
