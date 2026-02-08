<script setup lang="ts">
import type { Chain } from '@/types';
import { computed, ref } from 'vue';
import {
  ArrowRightIcon,
  ErrorCircleIcon,
  LoginIcon,
  LogoutIcon,
} from 'tdesign-icons-vue-next';

const props = defineProps<{
  chains?: Chain[];
}>();

const visible = ref(false);

const sortedChains = computed(() => {
  if (!props.chains) return [];
  return [...props.chains].sort((a, b) => {
    const typeOrder: Record<string, number> = { in: 0, chain: 1, out: 2 };
    const typeDiff = (typeOrder[a.chain_type] ?? 1) - (typeOrder[b.chain_type] ?? 1);
    if (typeDiff !== 0) return typeDiff;
    return a.index - b.index;
  });
});

function open() {
  visible.value = true;
}

function close() {
  visible.value = false;
}

function getIcon(type: string) {
  const icons: Record<string, unknown> = {
    in: LoginIcon,
    chain: ArrowRightIcon,
    out: LogoutIcon,
  };
  return icons[type] || ErrorCircleIcon;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = { in: '入口', chain: '中继', out: '出口' };
  return labels[type] || '未知';
}

function getTypeSeverity(type: string): 'primary' | 'success' | 'warning' {
  const severities: Record<string, 'primary' | 'success' | 'warning'> = {
    in: 'success',
    chain: 'primary',
    out: 'warning',
  };
  return severities[type] || 'primary';
}

function getIconBackground(type: string): string {
  const colors: Record<string, string> = {
    in: 'var(--td-success-color)',
    out: 'var(--td-warning-color)',
    chain: 'var(--td-brand-color)',
  };
  return colors[type] || 'var(--td-brand-color)';
}

defineExpose({ open });
</script>

<template>
  <t-dialog v-model:visible="visible" header="链路详情" width="600px">

    <t-empty v-if="!chains || chains.length === 0" description="暂无链路配置">
      <template #icon>
        <ErrorCircleIcon />
      </template>
    </t-empty>

    <t-space v-else direction="vertical" :size="12" class="chain-list">
      <div v-for="(chain, index) in sortedChains" :key="chain.id || index" class="chain-item">
        <div class="chain-icon-column">
          <div
            class="chain-icon"
            :style="{ background: getIconBackground(chain.chain_type) }"
          >
            <component :is="getIcon(chain.chain_type)" class="chain-icon-svg" />
          </div>
          <div
            v-if="index < sortedChains.length - 1"
            class="chain-connector"
          />
        </div>

        <t-card class="chain-card">
          <template #header>
            <t-space align="center" :size="8">
              <t-tag :theme="getTypeSeverity(chain.chain_type)">
                {{ getTypeLabel(chain.chain_type) }}
              </t-tag>
              <span v-if="chain.chain_type === 'chain'" class="chain-index">
                第{{ chain.index }}跳
              </span>
            </t-space>
          </template>
          <t-space direction="vertical" :size="8">
            <t-space align="center" justify="space-between" class="info-row">
              <span class="info-label">节点</span>
              <span class="info-value">{{ chain.node?.name || '未知节点' }}</span>
            </t-space>
            <div class="node-address">
              {{ chain.node?.address || '-' }}
            </div>
            <t-space align="center" justify="space-between" class="info-row">
              <span class="info-label">端口</span>
              <span class="info-value">{{ chain.port || '-' }}</span>
            </t-space>
            <t-space align="center" justify="space-between" class="info-row">
              <span class="info-label">协议</span>
              <span class="info-value">{{ chain.transport }}</span>
            </t-space>
            <t-space v-if="chain.strategy" align="center" :size="8">
              <span class="info-label">策略</span>
              <t-tag theme="primary">{{ chain.strategy }}</t-tag>
            </t-space>
          </t-space>
        </t-card>
      </div>
    </t-space>

    <template #footer>
      <t-space align="center" justify="flex-end">
        <t-button @click="close">关闭</t-button>
      </t-space>
    </template>
  </t-dialog>
</template>

<style scoped>
.chain-list {
  width: 100%;
}

.chain-item {
  display: flex;
  gap: 12px;
}

.chain-icon-column {
  width: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chain-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.chain-icon-svg {
  font-size: 20px;
}

.chain-connector {
  flex: 1;
  width: 2px;
  margin: 8px 0;
  background: var(--td-border-level-1-color);
}

.chain-card {
  flex: 1;
}

.chain-index {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.info-row {
  width: 100%;
}

.info-label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.info-value {
  font-weight: 600;
}

.node-address {
  font-size: 13px;
  color: var(--td-text-color-placeholder);
  font-family: monospace;
}
</style>
