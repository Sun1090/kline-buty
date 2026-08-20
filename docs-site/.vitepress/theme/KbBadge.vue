<script setup>
/** 知识库徽章：<KbBadge t="必读" c="c-red" /> */
defineProps({
  t: { type: String, required: true },
  c: { type: String, default: 'c-blue' },
})
</script>

<template>
  <span class="kb-badge" :class="c">{{ t }}</span>
</template>