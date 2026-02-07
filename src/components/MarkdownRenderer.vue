<template>
  <div class="markdown-body" v-html="renderedContent" />
</template>

<script setup lang="ts">
import { marked } from 'marked';
import { computed } from 'vue';

const props = defineProps<{
  content: string;
}>();

const renderedContent = computed(() => {
  return marked(props.content, { breaks: true, gfm: true });
});
</script>

<style scoped>
.markdown-body {
  line-height: 1.8;
}

.markdown-body :deep(h1) {
  font-size: 20px;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-body :deep(h2) {
  font-size: 18px;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-body :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-body :deep(h4, h5, h6) {
  font-size: 14px;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-body :deep(p) {
  margin-bottom: 1rem;
}

.markdown-body :deep(code) {
  font-family: 'JetBrains Mono', monospace;
  background: var(--n-color, rgba(148, 163, 184, 0.12));
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  background: var(--n-color, rgba(148, 163, 184, 0.12));
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-body :deep(a) {
  color: var(--n-primary-color, #3b82f6);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(ul, ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--n-primary-color, #3b82f6);
  padding-left: 1rem;
  margin-left: 0;
  color: var(--n-text-color-2);
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.markdown-body :deep(th, td) {
  border: 1px solid var(--n-border-color);
  padding: 0.75rem;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--n-color, rgba(148, 163, 184, 0.12));
}
</style>
