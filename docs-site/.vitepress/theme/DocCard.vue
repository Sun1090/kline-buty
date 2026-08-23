<script setup>
/**
 * 章节篇目卡片网格：把某章目录下的正文文档渲染成「标题+简介」卡片。
 * 用法：<DocCards dir="01-入门基础" />（dir 相对 docs/knowledge）
 * 数据来源：config.mjs transformHead 注入的 #kb-doc-index-data
 */
import { ref, computed, onMounted } from 'vue'
import { useData, withBase } from 'vitepress'

const props = defineProps({ dir: { type: String, required: true } })
const { site } = useData()
const docs = ref([])
const base = computed(() => site.value.base)

function loadIndex() {
  const el = document.getElementById('kb-doc-index-data')
  if (!el) return {}
  try {
    return JSON.parse(el.textContent || '{}')
  } catch {
    return {}
  }
}

onMounted(() => {
  const idx = loadIndex()
  docs.value = idx[props.dir] || []
})
</script>

<template>
  <div class="kb-doc-grid" role="list">
    <a
      v-for="d in docs"
      :key="d.link"
      class="kb-doc-card"
      :href="withBase(d.link)"
      role="listitem"
    >
      <div class="kb-doc-card-title">
        <span v-if="d.no" class="kb-doc-card-no">{{ d.no }}</span>
        {{ d.title }}
      </div>
      <p v-if="d.desc" class="kb-doc-card-desc">{{ d.desc }}</p>
    </a>
  </div>
</template>