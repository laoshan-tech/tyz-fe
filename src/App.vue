<script setup lang="ts">
import { NConfigProvider, NMessageProvider, darkTheme } from 'naive-ui';
import { ref, provide, computed } from 'vue';

const isDark = ref(false);
const theme = computed(() => isDark.value ? darkTheme : null);

function toggleTheme() {
  isDark.value = !isDark.value;
}

provide('isDark', isDark);
provide('toggleTheme', toggleTheme);
</script>

<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <RouterView />
    </n-message-provider>
  </n-config-provider>
</template>
