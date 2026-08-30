<script setup>
/**
 * T26：阅读进度条（顶部 3px）+ 返回顶部按钮。
 * 全局挂在 layout-bottom 槽位；首页（layout: home）不显示返回顶部。
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()
const progress = ref(0)
const visible = ref(false)

function onScroll() {
  const doc = document.documentElement
  const total = doc.scrollHeight - window.innerHeight
  progress.value = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0
  visible.value = window.scrollY > 400
}

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div
    class="kb-progress"
    :style="{ width: progress + '%' }"
    aria-hidden="true"
  />
  <button
    v-if="visible && frontmatter.layout !== 'home'"
    class="kb-back-top"
    aria-label="Back to top"
    @click="toTop"
  >
    ↑
  </button>
</template>

<style scoped>
.kb-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-3));
  z-index: calc(var(--vp-nav-z-index, 30) + 2);
  pointer-events: none;
  transition: width 0.08s linear;
}
.kb-back-top {
  position: fixed;
  right: 24px;
  bottom: 48px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 16px;
  cursor: pointer;
  z-index: 40;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.kb-back-top:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
