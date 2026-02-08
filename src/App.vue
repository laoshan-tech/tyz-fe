<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import zhCN from 'tdesign-vue-next/es/locale/zh_CN';

const isDark = ref(false);
const themeMode = computed(() => (isDark.value ? 'dark' : 'light'));
const globalConfig = computed(() => ({
  ...zhCN,
  classPrefix: 't',
  table: {
    stripe: true,
    size: 'medium',
  },
}));

function toggleTheme() {
  isDark.value = !isDark.value;
}

provide('isDark', isDark);
provide('toggleTheme', toggleTheme);

watch(
  isDark,
  (value) => {
    document.documentElement.setAttribute('theme-mode', value ? 'dark' : 'light');
  },
  { immediate: true },
);
</script>

<template>
  <t-config-provider :global-config="globalConfig">
    <RouterView />
  </t-config-provider>
</template>
